import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { tournament_id, name, groups_count, players_per_group } = await request.json()
  if (!tournament_id || !name) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })

  const { data, error } = await supabase
    .from('tournament_categories')
    .insert({ tournament_id, name: name.trim(), groups_count, players_per_group })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
