import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
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

  const { user_id } = await request.json()
  const adminClient = createAdminClient()

  if (user_id === null) {
    // Desvincular: remove user_id do atleta e reverte role para 'viewer'
    const { data: athlete } = await supabase
      .from('athletes').select('user_id').eq('id', params.id).single()

    const { error } = await supabase
      .from('athletes').update({ user_id: null }).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (athlete?.user_id) {
      await adminClient.auth.admin.updateUserById(athlete.user_id, {
        user_metadata: { role: 'viewer' },
      })
      await supabase.from('profiles').update({ role: 'viewer' }).eq('id', athlete.user_id)
    }
    return NextResponse.json({ ok: true })
  }

  // Verificar se user_id já está vinculado a outro atleta
  const { data: existing } = await supabase
    .from('athletes').select('id').eq('user_id', user_id).maybeSingle()
  if (existing && existing.id !== params.id) {
    return NextResponse.json({ error: 'Este usuário já está vinculado a outro atleta.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('athletes').update({ user_id }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualiza role para 'athlete'
  await supabase.from('profiles').update({ role: 'athlete' }).eq('id', user_id)

  return NextResponse.json({ ok: true })
}
