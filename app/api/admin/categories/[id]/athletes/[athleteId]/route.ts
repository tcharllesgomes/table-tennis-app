import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; athleteId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: ca } = await supabase
    .from('category_athletes')
    .select('tournament_id')
    .eq('category_id', params.id)
    .eq('athlete_id', params.athleteId)
    .single()
  if (!ca) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Bloqueia exclusão se o mata-mata da categoria já foi gerado
  const { count: knockoutCount } = await supabase
    .from('knockout_matches')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', params.id)
  if (knockoutCount && knockoutCount > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir atletas após o mata-mata ter sido gerado.' },
      { status: 400 }
    )
  }

  // Apaga todas as partidas de grupo da categoria envolvendo este atleta
  await supabase
    .from('group_matches')
    .delete()
    .eq('category_id', params.id)
    .or(`athlete1_id.eq.${params.athleteId},athlete2_id.eq.${params.athleteId}`)

  await supabase
    .from('category_athletes')
    .delete()
    .eq('category_id', params.id)
    .eq('athlete_id', params.athleteId)

  // Se não está mais em nenhuma categoria do torneio, remove do tournament_athletes
  const { data: remaining } = await supabase
    .from('category_athletes')
    .select('id')
    .eq('tournament_id', ca.tournament_id)
    .eq('athlete_id', params.athleteId)

  if (!remaining || remaining.length === 0) {
    await supabase
      .from('tournament_athletes')
      .delete()
      .eq('tournament_id', ca.tournament_id)
      .eq('athlete_id', params.athleteId)
  }

  return NextResponse.json({ ok: true })
}
