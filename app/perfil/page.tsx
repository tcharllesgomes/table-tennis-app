import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getGroupLabel, getStatusLabel, getBracketRankLabel } from '@/lib/utils'
import { Trophy, Users, Swords, Clock } from 'lucide-react'

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca o atleta vinculado ao usuário logado
  const { data: athlete } = await supabase
    .from('athletes')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!athlete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🏓</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Conta não vinculada</h1>
        <p className="text-slate-500 text-sm">
          Sua conta ainda não foi vinculada a um registro de atleta.<br />
          Aguarde o administrador fazer a vinculação.
        </p>
      </div>
    )
  }

  // Busca histórico completo
  const { data: taList } = await supabase
    .from('tournament_athletes')
    .select('*, tournament:tournaments(*)')
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false })

  const tournamentIds = (taList ?? []).map((ta: any) => ta.tournament_id)

  // Busca partidas de grupo do atleta
  const { data: groupMatches } = tournamentIds.length > 0
    ? await supabase
        .from('group_matches')
        .select('*')
        .in('tournament_id', tournamentIds)
        .or(`athlete1_id.eq.${athlete.id},athlete2_id.eq.${athlete.id}`)
    : { data: [] }

  // Busca partidas de mata-mata do atleta
  const { data: knockoutMatches } = tournamentIds.length > 0
    ? await supabase
        .from('knockout_matches')
        .select('*')
        .in('tournament_id', tournamentIds)
        .or(`athlete1_id.eq.${athlete.id},athlete2_id.eq.${athlete.id}`)
    : { data: [] }

  // Estatísticas globais
  const allMatches = [...(groupMatches ?? []), ...(knockoutMatches ?? [])]
  const finished = allMatches.filter((m) => m.status !== 'pending')
  const wins = finished.filter((m) => m.winner_id === athlete.id).length
  const losses = finished.filter((m) => m.winner_id && m.winner_id !== athlete.id).length
  const walkovers = finished.filter(
    (m) => m.status === 'walkover' && m.winner_id !== athlete.id
  ).length

  const setsWon = finished.reduce((acc, m) => {
    return acc + (m.athlete1_id === athlete.id ? m.athlete1_sets : m.athlete2_sets)
  }, 0)
  const setsLost = finished.reduce((acc, m) => {
    return acc + (m.athlete1_id === athlete.id ? m.athlete2_sets : m.athlete1_sets)
  }, 0)

  const tournaments = taList ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header atleta */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-16 w-16">
          {athlete.photo_url && <AvatarImage src={athlete.photo_url} alt={athlete.name} />}
          <AvatarFallback className="text-xl">{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{athlete.name}</h1>
          <p className="text-slate-500 text-sm">{tournaments.length} torneio{tournaments.length !== 1 ? 's' : ''} disputado{tournaments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Vitórias', value: wins, color: 'text-green-600' },
          { label: 'Derrotas', value: losses, color: 'text-red-500' },
          { label: 'Sets ganhos', value: setsWon, color: 'text-navy-600' },
          { label: 'Sets perdidos', value: setsLost, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Histórico por torneio */}
      <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4" /> Histórico de Torneios
      </h2>

      {tournaments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum torneio disputado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((ta: any) => {
            const t = ta.tournament
            const tGroupMatches = (groupMatches ?? []).filter((m) => m.tournament_id === t.id)
            const tKnockoutMatches = (knockoutMatches ?? []).filter((m) => m.tournament_id === t.id)

            const tFinished = [...tGroupMatches, ...tKnockoutMatches].filter((m) => m.status !== 'pending')
            const tWins = tFinished.filter((m) => m.winner_id === athlete.id).length
            const tLosses = tFinished.filter((m) => m.winner_id && m.winner_id !== athlete.id).length

            // Fase mais avançada no mata-mata
            const myKO = tKnockoutMatches.filter((m) => m.winner_id === athlete.id || m.status === 'pending')
            const maxRound = myKO.length > 0 ? Math.min(...myKO.map((m) => m.round)) : null
            const totalRounds = tKnockoutMatches.length > 0 ? Math.max(...tKnockoutMatches.map((m) => m.round)) : 0

            const statusVariant: Record<string, any> = {
              draft: 'secondary', group_stage: 'accent', knockout_stage: 'warning', finished: 'success',
            }

            return (
              <div key={ta.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.edition}ª Edição</p>
                  </div>
                  <Badge variant={statusVariant[t.status]}>{getStatusLabel(t.status)}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  {ta.group_number != null && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-3.5 w-3.5" />
                      <span>Grupo {getGroupLabel(ta.group_number)}</span>
                      {ta.group_rank && (
                        <span className="text-slate-400">· {ta.group_rank}º lugar</span>
                      )}
                    </div>
                  )}
                  {tGroupMatches.length > 0 && (
                    <span className="text-slate-600">
                      {tWins}V / {tLosses}D na fase de grupos
                    </span>
                  )}
                  {maxRound !== null && totalRounds > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Swords className="h-3.5 w-3.5" />
                      <span>
                        {ta.group_rank != null
                          ? getBracketRankLabel(ta.group_rank)
                          : ''}{' '}
                        — chegou até {maxRound === 1 ? 'a Final' : maxRound === 2 ? 'a Semifinal' : `rodada ${totalRounds - maxRound + 1}`}
                      </span>
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
