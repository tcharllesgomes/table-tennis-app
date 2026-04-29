import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { athlete_id, group_number } = await request.json()
  const categoryId = params.id

  const { data: category } = await supabase
    .from('tournament_categories').select('tournament_id').eq('id', categoryId).single()
  if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  const tournamentId = category.tournament_id

  // Garante que o atleta está inscrito no torneio (para constraint de torneio ativo)
  const { error: taError } = await supabase
    .from('tournament_athletes')
    .insert({ tournament_id: tournamentId, athlete_id, group_number: null })
    .select()
    // ON CONFLICT não lança erro, já está inscrito
  // Ignora conflito (atleta já inscrito no torneio por outra categoria)
  if (taError && taError.code !== '23505') {
    return NextResponse.json({ error: taError.message }, { status: 500 })
  }

  // Adiciona à categoria
  const { error } = await supabase
    .from('category_athletes')
    .insert({ tournament_id: tournamentId, category_id: categoryId, athlete_id, group_number: group_number ?? null })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Atleta já está nesta categoria' }, { status: 400 })
    // Se falhou e era a primeira categoria, remove o tournament_athletes
    const { data: others } = await supabase
      .from('category_athletes').select('id').eq('tournament_id', tournamentId).eq('athlete_id', athlete_id)
    if (!others || others.length === 0) {
      await supabase.from('tournament_athletes')
        .delete().eq('tournament_id', tournamentId).eq('athlete_id', athlete_id)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { athlete_id, group_number } = await request.json()

  const { error } = await supabase
    .from('category_athletes')
    .update({ group_number })
    .eq('category_id', params.id)
    .eq('athlete_id', athlete_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
