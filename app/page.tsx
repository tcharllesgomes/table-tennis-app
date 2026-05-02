import { createClient } from '@/lib/supabase/server'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { Trophy } from 'lucide-react'

export default async function HomePage() {
  const supabase = createClient()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-navy-600 text-white mb-10 p-8 md:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">🏓</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Tênis de Mesa</h1>
              <p className="text-white/70 mt-1">Acompanhe os campeonatos em tempo real</p>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-5 flex items-center justify-end pr-8">
          <span className="text-[200px]">🏓</span>
        </div>
      </div>

      {/* Lista de campeonatos */}
      {tournaments && tournaments.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Campeonatos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} featured={i === 0} />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Nenhum campeonato ainda</h2>
          <p className="text-slate-500 text-sm mt-1">Fique atento às próximas edições!</p>
        </div>
      )}
    </div>
  )
}
