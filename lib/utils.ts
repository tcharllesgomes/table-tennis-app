import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { GroupMatch, GroupStanding, Athlete, TournamentAthlete } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateGroupStandings(
  tournamentAthletes: (TournamentAthlete & { athlete: Athlete })[],
  matches: GroupMatch[]
): GroupStanding[] {
  const statsMap = new Map<string, GroupStanding>()

  for (const ta of tournamentAthletes) {
    statsMap.set(ta.athlete_id, {
      athlete: ta.athlete,
      tournamentAthleteId: ta.id,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
    })
  }

  for (const match of matches) {
    if (match.status === 'pending') continue
    const a1 = statsMap.get(match.athlete1_id)
    const a2 = statsMap.get(match.athlete2_id)
    if (!a1 || !a2) continue

    a1.setsWon += match.athlete1_sets
    a1.setsLost += match.athlete2_sets
    a2.setsWon += match.athlete2_sets
    a2.setsLost += match.athlete1_sets

    if (match.winner_id === match.athlete1_id) {
      a1.wins++
      a2.losses++
    } else if (match.winner_id === match.athlete2_id) {
      a2.wins++
      a1.losses++
    }
  }

  const standings = Array.from(statsMap.values()).map((s) => ({
    ...s,
    setDiff: s.setsWon - s.setsLost,
  }))

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff
    return b.setsWon - a.setsWon
  })

  return standings.map((s, i) => ({ ...s, rank: i + 1 }))
}

export function getRoundName(round: number, totalRounds: number): string {
  if (round === 1) return 'Final'
  if (round === 2) return 'Semifinal'
  if (round === 3) return 'Quartas de Final'
  if (round === 4) return 'Oitavas de Final'
  return `Rodada ${totalRounds - round + 1}`
}

export function getBracketRankLabel(rank: number): string {
  const labels: Record<number, string> = {
    1: '1º Colocados',
    2: '2º Colocados',
    3: '3º Colocados',
    4: '4º Colocados',
    5: '5º Colocados',
    6: '6º Colocados',
  }
  return labels[rank] ?? `${rank}º Colocados`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    group_stage: 'Fase de Grupos',
    knockout_stage: 'Mata-Mata',
    finished: 'Finalizado',
  }
  return labels[status] ?? status
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function getGroupLabel(n: number): string {
  return String.fromCharCode(64 + n) // 1→A, 2→B, etc.
}
