import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Apenas super admin pode alterar roles' }, { status: 403 })
  }

  const { target_user_id, role } = await request.json()

  if (!target_user_id || !role) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }
  if (!['admin', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
  }

  // Não pode alterar o próprio role
  if (target_user_id === user.id) {
    return NextResponse.json({ error: 'Não é possível alterar o próprio role' }, { status: 400 })
  }

  // Não pode alterar outro super_admin
  const { data: target } = await supabase
    .from('profiles').select('role').eq('id', target_user_id).single()
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Não é possível alterar role de outro super admin' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles').update({ role }).eq('id', target_user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
