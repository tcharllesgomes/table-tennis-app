import { createClient } from '@/lib/supabase/server'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { History } from 'lucide-react'

export default async function HistoricoPage() {
  const supabase = createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('edition', { ascending: false })

  const current = tournaments?.find((t) => t.is_current)
  const past = tournaments?.filter((t) => !t.is_current) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-6 w-6 text-navy-600" />
        <h1 className="text-2xl font-bold text-slate-900">Histórico de Campeonatos</h1>
      </div>

      {current && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Atual</h2>
          <TournamentCard tournament={current} featured />
        </section>
      )}

      {past.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Edições Anteriores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      ) : (
        !current && (
          <div className="text-center py-16 text-slate-500">
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum campeonato registrado ainda.</p>
          </div>
        )
      )}
    </div>
  )
}
