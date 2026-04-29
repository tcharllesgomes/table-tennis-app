import { createClient } from '@/lib/supabase/server'
import { TournamentCard } from '@/components/tournament/TournamentCard'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Trophy, Users, Swords, History } from 'lucide-react'

export default async function HomePage() {
  const supabase = createClient()

  const { data: currentTournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_current', true)
    .single()

  const { data: recentTournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_current', false)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-navy-600 text-white mb-10 p-8 md:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">🏓</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Tênis de Mesa</h1>
              <p className="text-white/70 mt-1">Acompanhe o campeonato em tempo real</p>
            </div>
          </div>
          {currentTournament && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/torneio/${currentTournament.id}/grupos`}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Users className="h-4 w-4" /> Fase de Grupos
              </Link>
              <Link
                href={`/torneio/${currentTournament.id}`}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Swords className="h-4 w-4" /> Ver Mata-Mata
              </Link>
            </div>
          )}
        </div>
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-5 flex items-center justify-end pr-8">
          <span className="text-[200px]">🏓</span>
        </div>
      </div>

      {/* Campeonato atual */}
      {currentTournament ? (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Campeonato Atual</h2>
          </div>
          <TournamentCard tournament={currentTournament} featured />
        </section>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 mb-10">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Nenhum campeonato ativo no momento</h2>
          <p className="text-slate-500 text-sm mt-1">Fique atento às próximas edições!</p>
        </div>
      )}

      {/* Edições anteriores */}
      {recentTournaments && recentTournaments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-900">Edições Anteriores</h2>
            </div>
            <Link href="/historico" className="text-sm text-navy-600 hover:underline font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
