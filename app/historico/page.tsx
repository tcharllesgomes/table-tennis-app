import { createClient } from '@/lib/supabase/server'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { History } from 'lucide-react'

export default async function HistoricoPage() {
  const supabase = createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-6 w-6 text-navy-600" />
        <h1 className="text-2xl font-bold text-slate-900">Histórico de Campeonatos</h1>
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} featured={i === 0} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum campeonato registrado ainda.</p>
        </div>
      )}
    </div>
  )
}
