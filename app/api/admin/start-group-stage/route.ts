import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateRoundRobin(
  athleteIds: string[],
  groupNumber: number,
  tournamentId: string,
  categoryId?: string
) {
  const matches = []
  let order = 0
  for (let i = 0; i < athleteIds.length; i++) {
    for (let j = i + 1; j < athleteIds.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        category_id: categoryId ?? null,
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
  if (tournament.status !== 'draft') {
    return NextResponse.json({ error: 'Campeonato já iniciado' }, { status: 400 })
  }

  const allMatches: any[] = []

  if (tournament.type === 'categories') {
    // Busca todas as categorias e seus atletas com grupo atribuído
    const { data: categories } = await supabase
      .from('tournament_categories')
      .select('id, groups_count')
      .eq('tournament_id', tournamentId)

    if (!categories || categories.length === 0) {
      return NextResponse.json({ error: 'Nenhuma categoria criada.' }, { status: 400 })
    }

    for (const cat of categories) {
      const { data: catAthletes } = await supabase
        .from('category_athletes')
        .select('athlete_id, group_number')
        .eq('category_id', cat.id)
        .not('group_number', 'is', null)

      if (!catAthletes || catAthletes.length === 0) continue

      const groups = new Map<number, string[]>()
      for (const ca of catAthletes) {
        if (ca.group_number == null) continue
        groups.set(ca.group_number, [...(groups.get(ca.group_number) ?? []), ca.athlete_id])
      }

      for (const [groupNum, athleteIds] of groups) {
        if (athleteIds.length < 2) {
          return NextResponse.json(
            { error: `Categoria tem grupo com menos de 2 atletas.` },
            { status: 400 }
          )
        }
        allMatches.push(...generateRoundRobin(athleteIds, groupNum, tournamentId, cat.id))
      }
    }
  } else {
    // Formato clássico
    const { data: tournamentAthletes } = await supabase
      .from('tournament_athletes')
      .select('athlete_id, group_number')
      .eq('tournament_id', tournamentId)
      .not('group_number', 'is', null)

    if (!tournamentAthletes) return NextResponse.json({ error: 'Erro ao buscar atletas' }, { status: 500 })

    const groups = new Map<number, string[]>()
    for (const ta of tournamentAthletes) {
      if (ta.group_number == null) continue
      groups.set(ta.group_number, [...(groups.get(ta.group_number) ?? []), ta.athlete_id])
    }

    for (const [g, athletes] of groups) {
      if (athletes.length < 2) {
        return NextResponse.json({ error: `Grupo ${g} tem menos de 2 atletas.` }, { status: 400 })
      }
      allMatches.push(...generateRoundRobin(athletes, g, tournamentId))
    }
  }

  if (allMatches.length === 0) {
    return NextResponse.json({ error: 'Nenhum atleta com grupo atribuído.' }, { status: 400 })
  }

  const { error } = await supabase.from('group_matches').insert(allMatches)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('tournaments').update({ status: 'group_stage' }).eq('id', tournamentId)
  return NextResponse.json({ ok: true })
}
