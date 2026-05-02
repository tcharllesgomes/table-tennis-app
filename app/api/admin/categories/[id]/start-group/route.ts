import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateRoundRobin(
  athleteIds: string[],
  groupNumber: number,
  tournamentId: string,
  categoryId: string
) {
  const matches = []
  let order = 0
  for (let i = 0; i < athleteIds.length; i++) {
    for (let j = i + 1; j < athleteIds.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        category_id: categoryId,
        group_number: groupNumber,
        athlete1_id: athleteIds[i],
        athlete2_id: athleteIds[j],
        athlete1_sets: 0,
        athlete2_sets: 0,
        winner_id: null,
        status: 'pending' as const,
        match_order: ++order,
      })
    }
  }
  return matches
}

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

  const { count: existingMatches } = await supabase
    .from('group_matches')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', catId)
  if (existingMatches && existingMatches > 0) {
    return NextResponse.json({ error: 'Fase de grupos já iniciada para esta categoria' }, { status: 400 })
  }

  const { data: catAthletes } = await supabase
    .from('category_athletes')
    .select('athlete_id, group_number')
    .eq('category_id', catId)
    .not('group_number', 'is', null)

  if (!catAthletes || catAthletes.length === 0) {
    return NextResponse.json({ error: 'Nenhum atleta com grupo atribuído' }, { status: 400 })
  }

  const groups = new Map<number, string[]>()
  for (const ca of catAthletes) {
    if (ca.group_number == null) continue
    groups.set(ca.group_number, [...(groups.get(ca.group_number) ?? []), ca.athlete_id])
  }

  const allMatches: any[] = []
  for (const [groupNum, athleteIds] of groups) {
    if (athleteIds.length < 2) {
      return NextResponse.json({ error: `Grupo ${groupNum} tem menos de 2 atletas` }, { status: 400 })
    }
    allMatches.push(...generateRoundRobin(athleteIds, groupNum, cat.tournament_id, catId))
  }

  const { error } = await supabase.from('group_matches').insert(allMatches)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
