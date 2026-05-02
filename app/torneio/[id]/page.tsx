import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, formatDate, getBracketRankLabel } from '@/lib/utils'
import { Calendar, Users, Swords, Trophy, ChevronRight } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ShareButton } from '@/components/tournament/ShareButton'

export default async function TournamentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!tournament) notFound()

  // Busca brackets disponíveis (posições no mata-mata)
  const { data: knockoutBrackets } = await supabase
    .from('knockout_matches')
    .select('bracket_rank')
    .eq('tournament_id', params.id)

  const bracketRanks = Array.from(new Set(knockoutBrackets?.map((k) => k.bracket_rank) ?? [])).sort()
  const hasKnockout = bracketRanks.length > 0

  // Busca campeão (vencedor da final do bracket 1) — apenas para torneios clássicos
  let champion = null
  if (tournament.type !== 'categories' && (tournament.status === 'knockout_stage' || tournament.status === 'finished')) {
    const { data: finalMatch } = await supabase
      .from('knockout_matches')
      .select('winner_id, athlete1:athletes!knockout_matches_athlete1_id_fkey(*), athlete2:athletes!knockout_matches_athlete2_id_fkey(*)')
      .eq('tournament_id', params.id)
      .eq('bracket_rank', 1)
      .eq('round', 1)
      .single()

    if (finalMatch?.winner_id) {
      champion =
        finalMatch.winner_id === (finalMatch.athlete1 as any)?.id
          ? finalMatch.athlete1
          : finalMatch.athlete2
    }
  }

  const statusVariant: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'secondary'> = {
    draft: 'secondary',
    group_stage: 'accent',
    knockout_stage: 'warning',
    finished: 'success',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-navy-600 rounded-2xl p-6 md:p-8 text-white mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/60 text-sm mb-1">{tournament.edition}ª Edição</p>
            <h1 className="text-2xl md:text-3xl font-bold">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-white/70 mt-2 text-sm">{tournament.description}</p>
            )}
          </div>
          <Badge variant={statusVariant[tournament.status]} className="shrink-0 mt-1">
            {getStatusLabel(tournament.status)}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(tournament.start_date)}
              {tournament.end_date && ` — ${formatDate(tournament.end_date)}`}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {tournament.groups_count} grupos · {tournament.players_per_group} por grupo
            </span>
          </div>
          <ShareButton
            title={tournament.name}
            url={`/torneio/${tournament.id}`}
          />
        </div>
      </div>

      {/* Campeão */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-8 flex items-center gap-4">
          <Trophy className="h-8 w-8 text-yellow-500 shrink-0" />
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {(champion as any).photo_url && <AvatarImage src={(champion as any).photo_url} />}
              <AvatarFallback>{(champion as any).name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Campeão</p>
              <p className="text-lg font-bold text-slate-900">{(champion as any).name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fase de Grupos */}
        <Link
          href={`/torneio/${tournament.id}/grupos`}
          className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-navy-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-navy-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Fase de Grupos</h2>
                <p className="text-sm text-slate-500">Classificação e resultados</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-navy-600 transition-colors" />
          </div>
        </Link>

        {/* Mata-Mata — categorias: link único para página consolidada */}
        {tournament.type === 'categories' && hasKnockout && (
          <Link
            href={`/torneio/${tournament.id}/mata-mata`}
            className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-orange-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Swords className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Mata-Mata</h2>
                  <p className="text-sm text-slate-500">Ver chaves por categoria</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </div>
          </Link>
        )}

        {/* Mata-Mata — clássico: links por bracket rank */}
        {tournament.type !== 'categories' && hasKnockout && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Swords className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Mata-Mata</h2>
                <p className="text-sm text-slate-500">Chaves por colocação</p>
              </div>
            </div>
            <div className="space-y-2">
              {bracketRanks.map((rank) => (
                <Link
                  key={rank}
                  href={`/torneio/${tournament.id}/mata-mata/${rank}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-navy-600 hover:text-white transition-colors group"
                >
                  <span className="text-sm font-medium">{getBracketRankLabel(rank)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {!hasKnockout && (tournament.status === 'draft' || tournament.status === 'group_stage') && (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-5 flex items-center justify-center text-slate-400 text-sm">
            Mata-mata disponível após a fase de grupos
          </div>
        )}
      </div>
    </div>
  )
}
