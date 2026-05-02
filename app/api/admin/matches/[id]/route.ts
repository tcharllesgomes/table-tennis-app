import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNextMatchNumber, getNextMatchSlot } from '@/lib/bracket'

const WO_WIN_SETS = 3
const WO_LOSS_SETS = 0

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { type, walkover_winner_id } = body
  const matchId = params.id
  const isWalkover = !!walkover_winner_id

  const table = type === 'group' ? 'group_matches' : 'knockout_matches'

  const { data: match } = await supabase
    .from(table)
    .select('*')
    .eq('id', matchId)
    .single()
  if (!match) return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', match.tournament_id)
    .single()
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 })

  if (type === 'group') {
    // Para partidas de categoria: bloqueia se já existe mata-mata gerado para aquela categoria
    if (match.category_id) {
      const { count } = await supabase
        .from('knockout_matches')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', match.category_id)
      if (count && count > 0) {
        return NextResponse.json(
          { error: 'Partidas da fase de grupos não podem ser editadas após o início do mata-mata' },
          { status: 403 }
        )
      }
    } else if (tournament.status !== 'group_stage') {
      // Para torneios clássicos: bloqueia quando o torneio já avançou
      return NextResponse.json(
        { error: 'Partidas da fase de grupos não podem ser editadas após o início do mata-mata' },
        { status: 403 }
      )
    }
  }

  let athlete1_sets: number
  let athlete2_sets: number
  let winnerId: string | null
  let status: 'finished' | 'walkover'

  if (isWalkover) {
    if (walkover_winner_id !== match.athlete1_id && walkover_winner_id !== match.athlete2_id) {
      return NextResponse.json({ error: 'Vencedor de W.O. inválido' }, { status: 400 })
    }
    winnerId = walkover_winner_id
    status = 'walkover'
    athlete1_sets = walkover_winner_id === match.athlete1_id ? WO_WIN_SETS : WO_LOSS_SETS
    athlete2_sets = walkover_winner_id === match.athlete2_id ? WO_WIN_SETS : WO_LOSS_SETS
  } else {
    athlete1_sets = body.athlete1_sets
    athlete2_sets = body.athlete2_sets
    if (typeof athlete1_sets !== 'number' || typeof athlete2_sets !== 'number') {
      return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
    }
    if (athlete1_sets === athlete2_sets) {
      return NextResponse.json({ error: 'Empate não permitido' }, { status: 400 })
    }
    winnerId = athlete1_sets > athlete2_sets ? match.athlete1_id : match.athlete2_id
    status = 'finished'
  }

  const { error } = await supabase
    .from(table)
    .update({ athlete1_sets, athlete2_sets, winner_id: winnerId, status })
    .eq('id', matchId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Avança vencedor no mata-mata
  if (type === 'knockout' && match.round > 1) {
    const nextMatchNumber = getNextMatchNumber(match.match_number)
    const slot = getNextMatchSlot(match.match_number)

    const { data: nextMatch } = await supabase
      .from('knockout_matches')
      .select('id')
      .eq('tournament_id', match.tournament_id)
      .eq('bracket_rank', match.bracket_rank)
      .eq('round', match.round - 1)
      .eq('match_number', nextMatchNumber)
      .single()

    if (nextMatch) {
      await supabase
        .from('knockout_matches')
        .update({ [`${slot}_id`]: winnerId })
        .eq('id', nextMatch.id)
    }
  }

  return NextResponse.json({ ok: true })
}
