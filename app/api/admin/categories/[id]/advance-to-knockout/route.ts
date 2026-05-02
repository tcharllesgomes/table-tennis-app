import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBracketMatches } from '@/lib/bracket'
import { calculateGroupStandings } from '@/lib/utils'
import { Athlete, CategoryAthlete } from '@/lib/supabase/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const catId = params.id

  const { data: cat } = await supabase
    .from('tournament_categories')
    .select('id, tournament_id, groups_count')
    .eq('id', catId)
    .single()
  if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  const { data: groupMatches } = await supabase
    .from('group_matches')
    .select('*')
    .eq('category_id', catId)

  if (!groupMatches || groupMatches.length === 0) {
    return NextResponse.json({ error: 'Fase de grupos não iniciada para esta categoria' }, { status: 400 })
  }

  const pending = groupMatches.filter((m) => m.status === 'pending')
  if (pending.length > 0) {
    return NextResponse.json(
      { error: `Ainda há ${pending.length} partida(s) sem resultado nesta categoria` },
      { status: 400 }
    )
  }

  const { count: existingKO } = await supabase
    .from('knockout_matches')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', catId)
  if (existingKO && existingKO > 0) {
    return NextResponse.json({ error: 'Mata-mata já gerado para esta categoria' }, { status: 400 })
  }

  const { data: catAthletes } = await supabase
    .from('category_athletes')
    .select('*, athlete:athletes(*)')
    .eq('category_id', catId)

  if (!catAthletes || catAthletes.length === 0) {
    return NextResponse.json({ error: 'Nenhum atleta na categoria' }, { status: 500 })
  }

  const groups = new Map<number, (CategoryAthlete & { athlete: Athlete })[]>()
  for (const ca of catAthletes as (CategoryAthlete & { athlete: Athlete })[]) {
    if (ca.group_number == null) continue
    groups.set(ca.group_number, [...(groups.get(ca.group_number) ?? []), ca])
  }

  const groupStandings = new Map<number, string[]>()

  for (const [groupNum, athletes] of groups) {
    const matches = groupMatches.filter((m) => m.group_number === groupNum)
    const adapted = athletes.map((ca) => ({ ...ca, athlete_id: ca.athlete_id, tournament_id: ca.tournament_id }))
    const standings = calculateGroupStandings(adapted as any, matches as any)
    groupStandings.set(groupNum, standings.map((s) => s.athlete.id))

    for (let i = 0; i < standings.length; i++) {
      await supabase
        .from('category_athletes')
        .update({ group_rank: i + 1 })
        .eq('category_id', catId)
        .eq('athlete_id', standings[i].athlete.id)
    }
  }

  const allBracketMatches: any[] = []

  if (cat.groups_count === 1) {
    const top4 = (groupStandings.get(1) ?? []).slice(0, 4)
    if (top4.length >= 2) {
      const bracketMatches = generateBracketMatches(cat.tournament_id, 1, top4)
      allBracketMatches.push(...bracketMatches.map((m) => ({ ...m, category_id: catId })))
    }
  } else {
    const maxGroupSize = Math.max(...Array.from(groupStandings.values()).map((s) => s.length))
    for (let rank = 1; rank <= maxGroupSize; rank++) {
      const bracketAthletes: string[] = []
      const sortedGroups = Array.from(groupStandings.keys()).sort((a, b) => a - b)
      for (const g of sortedGroups) {
        const standings = groupStandings.get(g) ?? []
        if (standings.length >= rank) bracketAthletes.push(standings[rank - 1])
      }
      if (bracketAthletes.length >= 2) {
        const bracketMatches = generateBracketMatches(cat.tournament_id, rank, bracketAthletes)
        allBracketMatches.push(...bracketMatches.map((m) => ({ ...m, category_id: catId })))
      }
    }
  }

  if (allBracketMatches.length === 0) {
    return NextResponse.json({ error: 'Não há atletas suficientes para gerar o mata-mata' }, { status: 400 })
  }

  const { error } = await supabase.from('knockout_matches').insert(allBracketMatches)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
