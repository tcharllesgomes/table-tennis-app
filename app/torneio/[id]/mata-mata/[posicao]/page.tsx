import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'
import { getBracketRankLabel } from '@/lib/utils'
import { KnockoutMatch, Athlete } from '@/lib/supabase/types'
import { ArrowLeft, Swords } from 'lucide-react'

export default async function MataMataPage({
  params,
}: {
  params: { id: string; posicao: string }
}) {
  const supabase = createClient()
  const bracketRank = parseInt(params.posicao)
  if (isNaN(bracketRank)) notFound()

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', params.id).single()
  if (!tournament) notFound()

  const { data: matches } = await supabase
    .from('knockout_matches')
    .select('*, athlete1:athletes!knockout_matches_athlete1_id_fkey(*), athlete2:athletes!knockout_matches_athlete2_id_fkey(*)')
    .eq('tournament_id', params.id)
    .eq('bracket_rank', bracketRank)
    .order('round', { ascending: false })
    .order('match_number')

  // Busca todos os ranks disponíveis para navegação lateral
  const { data: allBrackets } = await supabase
    .from('knockout_matches')
    .select('bracket_rank')
    .eq('tournament_id', params.id)

  const bracketRanks = Array.from(new Set(allBrackets?.map((k) => k.bracket_rank) ?? [])).sort()

  const typedMatches = (matches ?? []) as (KnockoutMatch & {
    athlete1: Athlete | null
    athlete2: Athlete | null
  })[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/torneio/${params.id}`} className="text-slate-500 hover:text-navy-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mata-Mata — {getBracketRankLabel(bracketRank)}
          </h1>
          <p className="text-sm text-slate-500">{tournament.name} — {tournament.edition}ª Edição</p>
        </div>
      </div>

      {/* Navegação entre brackets */}
      {bracketRanks.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {bracketRanks.map((rank) => (
            <Link
              key={rank}
              href={`/torneio/${params.id}/mata-mata/${rank}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rank === bracketRank
                  ? 'bg-navy-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {getBracketRankLabel(rank)}
            </Link>
          ))}
        </div>
      )}

      {typedMatches.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Swords className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Mata-mata ainda não foi gerado para esta chave.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto">
          <KnockoutBracket matches={typedMatches} />
        </div>
      )}
    </div>
  )
}
