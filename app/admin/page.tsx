import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, Users, Swords, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { getStatusLabel } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [{ data: currentTournament }, { count: athleteCount }, { count: tournamentCount }] =
    await Promise.all([
      supabase.from('tournaments').select('*, group_matches(count), knockout_matches(count)').eq('is_current', true).single(),
      supabase.from('athletes').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
    ])

  const stats = [
    { label: 'Total de Atletas', value: athleteCount ?? 0, icon: Users, href: '/admin/atletas', color: 'bg-blue-500' },
    { label: 'Campeonatos', value: tournamentCount ?? 0, icon: Trophy, href: '/admin/torneios', color: 'bg-navy-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className={`h-10 w-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Campeonato atual */}
      {currentTournament ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Campeonato Atual</h2>
            <Link
              href={`/admin/torneios/${currentTournament.id}`}
              className="text-sm text-navy-600 hover:underline flex items-center gap-1"
            >
              Gerenciar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-lg font-bold text-navy-600 mb-1">{currentTournament.name}</p>
          <p className="text-sm text-slate-500 mb-3">{currentTournament.edition}ª Edição</p>

          <div className="flex items-center gap-2">
            {currentTournament.status === 'finished' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm font-medium">{getStatusLabel(currentTournament.status)}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <Link
              href={`/torneio/${currentTournament.id}/grupos`}
              className="text-center p-3 bg-slate-50 rounded-lg hover:bg-navy-50 transition-colors"
            >
              <Users className="h-5 w-5 text-navy-600 mx-auto mb-1" />
              <span className="text-xs text-slate-600">Grupos</span>
            </Link>
            <Link
              href={`/torneio/${currentTournament.id}`}
              className="text-center p-3 bg-slate-50 rounded-lg hover:bg-navy-50 transition-colors"
            >
              <Swords className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <span className="text-xs text-slate-600">Mata-Mata</span>
            </Link>
            <Link
              href={`/admin/torneios/${currentTournament.id}`}
              className="text-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Trophy className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <span className="text-xs text-orange-700 font-medium">Editar</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-3">Nenhum campeonato ativo</p>
          <Link
            href="/admin/torneios/novo"
            className="inline-flex items-center gap-2 bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            Criar Campeonato
          </Link>
        </div>
      )}
    </div>
  )
}
