import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdminSupabase() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Não autorizado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return { supabase, error: 'Sem permissão' }
  return { supabase, error: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: 403 })

  const body = await request.json()
  const update: any = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.groups_count !== undefined) update.groups_count = body.groups_count
  if (body.players_per_group !== undefined) update.players_per_group = body.players_per_group

  const { error: err } = await supabase
    .from('tournament_categories').update(update).eq('id', params.id)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: 403 })

  const { error: err } = await supabase
    .from('tournament_categories').delete().eq('id', params.id)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
