import Link from 'next/link'
import { Tournament } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, formatDate } from '@/lib/utils'
import { Calendar, ChevronRight, Trophy } from 'lucide-react'
import { ShareButton } from '@/components/tournament/ShareButton'

interface TournamentCardProps {
  tournament: Tournament
  featured?: boolean
}

const statusVariant: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'secondary'> = {
  draft: 'secondary',
  group_stage: 'accent',
  knockout_stage: 'warning',
  finished: 'success',
}

export function TournamentCard({ tournament, featured = false }: TournamentCardProps) {
  return (
    <Link href={`/torneio/${tournament.id}`}>
      <div className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group ${
        featured ? 'border-navy-600 ring-2 ring-navy-600/20' : 'border-slate-200'
      }`}>
        {featured && (
          <div className="bg-navy-600 rounded-t-xl px-4 py-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange-400" />
            <span className="text-white text-xs font-semibold uppercase tracking-wide">Mais Recente</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={`font-bold truncate ${featured ? 'text-xl text-navy-600' : 'text-base text-slate-900'}`}>
                {tournament.name}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">{tournament.edition}ª Edição</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <ShareButton
                title={tournament.name}
                url={`/torneio/${tournament.id}`}
                variant="icon"
              />
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-navy-600 transition-colors" />
            </div>
          </div>

          {tournament.description && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{tournament.description}</p>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {tournament.start_date ? formatDate(tournament.start_date) : 'Data a definir'}
            </div>
            <Badge variant={statusVariant[tournament.status]}>
              {getStatusLabel(tournament.status)}
            </Badge>
          </div>

          <div className="flex gap-3 mt-3 text-xs text-slate-500">
            <span>{tournament.groups_count} grupos</span>
            <span>·</span>
            <span>{tournament.players_per_group} por grupo</span>
            <span>·</span>
            <span>{tournament.groups_count * tournament.players_per_group} atletas</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
