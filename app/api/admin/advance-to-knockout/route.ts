import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBracketMatches } from '@/lib/bracket'
import { calculateGroupStandings } from '@/lib/utils'
import { Athlete, TournamentAthlete, CategoryAthlete } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { tournamentId } = await request.json()

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', tournamentId).single()
  if (!tournament) return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
  if (tournament.status !== 'group_stage') {
    return NextResponse.json({ error: 'Campeonato não está na fase de grupos' }, { status: 400 })
  }

  const { data: groupMatches } = await supabase
    .from('group_matches').select('*').eq('tournament_id', tournamentId)

  if (!groupMatches) return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })

  const pending = groupMatches.filter((m) => m.status === 'pending')
  if (pending.length > 0) {
    return NextResponse.json(
      { error: `Ainda há ${pending.length} partida(s) de grupo sem resultado.` },
      { status: 400 }
    )
  }

  const allBracketMatches: any[] = []

  if (tournament.type === 'categories') {
    const { data: categories } = await supabase
      .from('tournament_categories')
      .select('id, players_per_group')
      .eq('tournament_id', tournamentId)

    if (!categories) return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })

    for (const cat of categories) {
      const { data: catAthletes } = await supabase
        .from('category_athletes')
        .select('*, athlete:athletes(*)')
        .eq('category_id', cat.id)

      const catMatches = groupMatches.filter((m) => m.category_id === cat.id)

      if (!catAthletes || catAthletes.length === 0) continue

      // Organiza por grupo
      const groups = new Map<number, (CategoryAthlete & { athlete: Athlete })[]>()
      for (const ca of catAthletes as (CategoryAthlete & { athlete: Athlete })[]) {
        if (ca.group_number == null) continue
        groups.set(ca.group_number, [...(groups.get(ca.group_number) ?? []), ca])
      }

      const groupStandings = new Map<number, string[]>()

      for (const [groupNum, athletes] of groups) {
        const matches = catMatches.filter((m) => m.group_number === groupNum)
        // calculateGroupStandings expects TournamentAthlete shape — adapt CategoryAthlete
        const adapted = athletes.map((ca) => ({
          ...ca,
          athlete_id: ca.athlete_id,
          tournament_id: ca.tournament_id,
        }))
        const standings = calculateGroupStandings(adapted as any, matches as any)
        groupStandings.set(groupNum, standings.map((s) => s.athlete.id))

        for (let i = 0; i < standings.length; i++) {
          await supabase
            .from('category_athletes')
            .update({ group_rank: i + 1 })
            .eq('category_id', cat.id)
            .eq('athlete_id', standings[i].athlete.id)
        }
      }

      const maxGroupSize = Math.max(...Array.from(groupStandings.values()).map((s) => s.length))
      for (let rank = 1; rank <= maxGroupSize; rank++) {
        const bracketAthletes: string[] = []
        const sortedGroups = Array.from(groupStandings.keys()).sort((a, b) => a - b)
        for (const g of sortedGroups) {
          const standings = groupStandings.get(g) ?? []
          if (standings.length >= rank) bracketAthletes.push(standings[rank - 1])
        }
        if (bracketAthletes.length >= 2) {
          const bracketMatches = generateBracketMatches(tournamentId, rank, bracketAthletes)
          allBracketMatches.push(...bracketMatches.map((m) => ({ ...m, category_id: cat.id })))
        }
      }
    }
  } else {
    // Formato clássico (lógica original)
    const { data: rawAthletes } = await supabase
      .from('tournament_athletes')
      .select('*, athlete:athletes(*)')
      .eq('tournament_id', tournamentId)

    if (!rawAthletes) return NextResponse.json({ error: 'Erro ao buscar atletas' }, { status: 500 })

    const groups = new Map<number, (TournamentAthlete & { athlete: Athlete })[]>()
    for (const ta of rawAthletes as (TournamentAthlete & { athlete: Athlete })[]) {
      if (ta.group_number == null) continue
      groups.set(ta.group_number, [...(groups.get(ta.group_number) ?? []), ta])
    }

    const groupStandings = new Map<number, string[]>()

    for (const [groupNum, athletes] of groups) {
      const matches = groupMatches.filter((m) => m.group_number === groupNum)
      const standings = calculateGroupStandings(athletes, matches as any)
      groupStandings.set(groupNum, standings.map((s) => s.athlete.id))

      for (let i = 0; i < standings.length; i++) {
        await supabase
          .from('tournament_athletes')
          .update({ group_rank: i + 1 })
          .eq('tournament_id', tournamentId)
          .eq('athlete_id', standings[i].athlete.id)
      }
    }

    const maxGroupSize = Math.max(...Array.from(groupStandings.values()).map((s) => s.length))
    for (let rank = 1; rank <= maxGroupSize; rank++) {
      const bracketAthletes: string[] = []
      const sortedGroups = Array.from(groupStandings.keys()).sort((a, b) => a - b)
      for (const g of sortedGroups) {
        const standings = groupStandings.get(g) ?? []
        if (standings.length >= rank) bracketAthletes.push(standings[rank - 1])
      }
      if (bracketAthletes.length >= 2) {
        allBracketMatches.push(...generateBracketMatches(tournamentId, rank, bracketAthletes))
      }
    }
  }

  const { error: insertError } = await supabase.from('knockout_matches').insert(allBracketMatches)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  await supabase.from('tournaments').update({ status: 'knockout_stage' }).eq('id', tournamentId)
  return NextResponse.json({ ok: true })
}
