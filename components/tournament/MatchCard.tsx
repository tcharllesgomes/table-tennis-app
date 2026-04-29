import { GroupMatch, KnockoutMatch, Athlete } from '@/lib/supabase/types'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Swords } from 'lucide-react'

interface MatchCardProps {
  match: (GroupMatch | KnockoutMatch) & {
    athlete1?: Athlete | null
    athlete2?: Athlete | null
  }
  onEdit?: () => void
  compact?: boolean
}

function AthleteRow({
  athlete,
  sets,
  isWinner,
}: {
  athlete: Athlete | null | undefined
  sets: number
  isWinner: boolean
}) {
  if (!athlete) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded opacity-40">
        <div className="h-7 w-7 rounded-full bg-slate-200 shrink-0" />
        <span className="text-sm text-slate-400 italic flex-1">A definir</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 rounded transition-colors',
        isWinner && 'bg-green-50'
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        {athlete.photo_url && <AvatarImage src={athlete.photo_url} alt={athlete.name} />}
        <AvatarFallback className="text-xs">{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className={cn('text-sm flex-1 truncate', isWinner ? 'font-semibold text-slate-900' : 'text-slate-700')}>
        {athlete.name}
      </span>
      <span className={cn(
        'text-sm font-bold w-6 text-center',
        isWinner ? 'text-green-700' : 'text-slate-500'
      )}>
        {sets}
      </span>
    </div>
  )
}

export function MatchCard({ match, onEdit, compact = false }: MatchCardProps) {
  const isWalkover = match.status === 'walkover'
  const isFinished = match.status === 'finished' || isWalkover
  const a1Winner = match.winner_id === match.athlete1_id
  const a2Winner = match.winner_id === match.athlete2_id

  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-sm transition-all',
        'border-slate-200',
        onEdit && !isFinished && 'cursor-pointer hover:border-navy-400 hover:shadow-md',
        compact ? 'min-w-[180px]' : 'min-w-[220px]'
      )}
      onClick={onEdit && !isFinished ? onEdit : undefined}
    >
      <div className={cn(
        'h-1 rounded-t-lg',
        isWalkover ? 'bg-amber-500' : isFinished ? 'bg-green-500' : 'bg-orange-400'
      )} />

      {isWalkover && (
        <div className="px-3 py-0.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider text-center">
          W.O.
        </div>
      )}

      <div className="p-2 space-y-0.5">
        <AthleteRow athlete={match.athlete1} sets={match.athlete1_sets} isWinner={isFinished && a1Winner} />
        <div className="flex items-center gap-1 px-2">
          <div className="flex-1 h-px bg-slate-100" />
          <Swords className="h-3 w-3 text-slate-300" />
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <AthleteRow athlete={match.athlete2} sets={match.athlete2_sets} isWinner={isFinished && a2Winner} />
      </div>

      {onEdit && (
        <div className={cn(
          'px-3 py-1.5 text-center text-xs rounded-b-lg border-t border-slate-100',
          isFinished
            ? 'bg-slate-50 text-slate-400'
            : 'bg-orange-50 text-orange-600 font-medium'
        )}>
          {isFinished ? 'Editar resultado' : 'Inserir placar'}
        </div>
      )}
    </div>
  )
}
