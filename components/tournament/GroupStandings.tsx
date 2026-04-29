import { GroupStanding } from '@/lib/supabase/types'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Medal } from 'lucide-react'

interface GroupStandingsProps {
  standings: GroupStanding[]
  groupLabel: string
}

const rankColors = ['text-yellow-600', 'text-slate-500', 'text-amber-700']
const rankBg = ['bg-yellow-50 border-yellow-200', 'bg-slate-50 border-slate-200', 'bg-amber-50 border-amber-200']

export function GroupStandings({ standings, groupLabel }: GroupStandingsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-navy-600 px-4 py-3 flex items-center gap-2">
        <span className="text-white font-bold text-lg">Grupo {groupLabel}</span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span>Atleta</span>
        <span className="w-8 text-center">V</span>
        <span className="w-8 text-center">D</span>
        <span className="w-12 text-center">Sets</span>
      </div>

      {standings.map((s, idx) => (
        <div
          key={s.tournamentAthleteId}
          className={cn(
            'grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn('font-bold text-sm w-5 text-center', rankColors[idx] ?? 'text-slate-700')}>
              {idx + 1}
            </span>
            <Avatar className="h-8 w-8 shrink-0">
              {s.athlete.photo_url && <AvatarImage src={s.athlete.photo_url} alt={s.athlete.name} />}
              <AvatarFallback className="text-xs">{s.athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-slate-900 truncate">{s.athlete.name}</span>
            {idx === 0 && <Medal className="h-4 w-4 text-yellow-500 shrink-0" />}
          </div>
          <span className="w-8 text-center text-sm font-semibold text-green-700">{s.wins}</span>
          <span className="w-8 text-center text-sm text-red-600">{s.losses}</span>
          <span className={cn(
            'w-12 text-center text-xs font-mono font-medium',
            s.setDiff > 0 ? 'text-green-700' : s.setDiff < 0 ? 'text-red-600' : 'text-slate-500'
          )}>
            {s.setsWon}/{s.setsLost}
          </span>
        </div>
      ))}

      {standings.length === 0 && (
        <div className="px-4 py-6 text-center text-slate-500 text-sm">
          Nenhum atleta neste grupo.
        </div>
      )}
    </div>
  )
}
