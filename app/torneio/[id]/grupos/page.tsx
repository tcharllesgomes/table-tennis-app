import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GroupStandings } from '@/components/tournament/GroupStandings'
import { MatchCard } from '@/components/tournament/MatchCard'
import { calculateGroupStandings, getGroupLabel } from '@/lib/utils'
import { Athlete, GroupMatch, TournamentAthlete } from '@/lib/supabase/types'
import { ArrowLeft, Users } from 'lucide-react'

export default async function GruposPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', params.id).single()
  if (!tournament) notFound()

  const { data: rawAthletes } = await supabase
    .from('tournament_athletes')
    .select('*, athlete:athletes(*)')
    .eq('tournament_id', params.id)
    .not('group_number', 'is', null)
    .order('group_number')

  const { data: groupMatches } = await supabase
    .from('group_matches')
    .select('*, athlete1:athletes!group_matches_athlete1_id_fkey(*), athlete2:athletes!group_matches_athlete2_id_fkey(*)')
    .eq('tournament_id', params.id)
    .order('group_number')
    .order('match_order')

  // Organiza por grupo
  const groupNumbers = Array.from(new Set(rawAthletes?.map((a) => a.group_number) ?? [])).sort()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/torneio/${params.id}`} className="text-slate-500 hover:text-navy-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fase de Grupos</h1>
          <p className="text-sm text-slate-500">{tournament.name} — {tournament.edition}ª Edição</p>
        </div>
      </div>

      {groupNumbers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Grupos ainda não foram definidos.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupNumbers.map((groupNum) => {
            const groupAthletes = (rawAthletes ?? []).filter(
              (a) => a.group_number === groupNum
            ) as (TournamentAthlete & { athlete: Athlete })[]

            const matches = (groupMatches ?? []).filter(
              (m) => m.group_number === groupNum
            ) as (GroupMatch & { athlete1: Athlete; athlete2: Athlete })[]

            const standings = calculateGroupStandings(groupAthletes, matches)

            return (
              <div key={groupNum} className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                {/* Classificação */}
                <GroupStandings standings={standings} groupLabel={getGroupLabel(groupNum)} />

                {/* Partidas */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Partidas do Grupo {getGroupLabel(groupNum)}
                  </h3>
                  {matches.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">Partidas serão geradas ao iniciar a fase de grupos.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {matches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
