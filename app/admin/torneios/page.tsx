import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, formatDate } from '@/lib/utils'
import { Trophy, Plus, ChevronRight } from 'lucide-react'

const statusVariant: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'secondary'> = {
  draft: 'secondary',
  group_stage: 'accent',
  knockout_stage: 'warning',
  finished: 'success',
}

export default async function AdminTorneiosPage() {
  const supabase = createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Campeonatos</h1>
        <Link
          href="/admin/torneios/novo"
          className="flex items-center gap-2 bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="space-y-3">
          {tournaments.map((t, i) => (
            <Link key={t.id} href={`/admin/torneios/${t.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-navy-400 hover:shadow-sm transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-navy-600' : 'bg-slate-100'
                  }`}>
                    <Trophy className={`h-4 w-4 ${i === 0 ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      {i === 0 && (
                        <Badge variant="accent" className="text-xs">Mais Recente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.edition}ª Edição · {formatDate(t.start_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[t.status]}>{getStatusLabel(t.status)}</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-navy-600 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Nenhum campeonato criado ainda.</p>
          <Link
            href="/admin/torneios/novo"
            className="inline-flex items-center gap-2 bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Criar primeiro campeonato
          </Link>
        </div>
      )}
    </div>
  )
}
