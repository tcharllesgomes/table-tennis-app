import { KnockoutMatch } from './supabase/types'

function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))))
}

// Gera posições de seed padrão (1 vs N, 2 vs N-1, ...)
function getSeedPositions(n: number): number[] {
  if (n <= 1) return [1]
  if (n === 2) return [1, 2]
  const half = getSeedPositions(n / 2)
  const result: number[] = []
  for (const s of half) {
    result.push(s, n + 1 - s)
  }
  return result
}

export function generateBracketMatches(
  tournamentId: string,
  bracketRank: number,
  athleteIds: string[]
): Omit<KnockoutMatch, 'id' | 'created_at'>[] {
  const n = athleteIds.length
  if (n < 2) return []

  const bracketSize = nextPowerOf2(n)
  const totalRounds = Math.log2(bracketSize)
  const seedPositions = getSeedPositions(bracketSize)

  const matches: Omit<KnockoutMatch, 'id' | 'created_at'>[] = []

  // Primeiro round (maior número de round)
  const firstRound = totalRounds
  for (let i = 0; i < bracketSize / 2; i++) {
    const seed1 = seedPositions[2 * i] - 1
    const seed2 = seedPositions[2 * i + 1] - 1
    const athlete1Id = seed1 < n ? athleteIds[seed1] : null
    const athlete2Id = seed2 < n ? athleteIds[seed2] : null

    // Se um lado é bye (null), o outro avança automaticamente
    const isBye = !athlete1Id || !athlete2Id
    matches.push({
      tournament_id: tournamentId,
      bracket_rank: bracketRank,
      round: firstRound,
      match_number: i + 1,
      athlete1_id: athlete1Id,
      athlete2_id: athlete2Id,
      athlete1_sets: 0,
      athlete2_sets: 0,
      winner_id: isBye ? (athlete1Id ?? athlete2Id) : null,
      status: isBye ? 'finished' : 'pending',
    })
  }

  // Rounds seguintes (inicialmente vazios, preenchidos conforme resultados)
  for (let round = totalRounds - 1; round >= 1; round--) {
    const matchCount = Math.pow(2, round - 1)
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        tournament_id: tournamentId,
        bracket_rank: bracketRank,
        round,
        match_number: i + 1,
        athlete1_id: null,
        athlete2_id: null,
        athlete1_sets: 0,
        athlete2_sets: 0,
        winner_id: null,
        status: 'pending',
      })
    }
  }

  return matches
}

// Dado match_number no round atual, retorna o match_number no próximo round (round - 1)
export function getNextMatchNumber(currentMatchNumber: number): number {
  return Math.ceil(currentMatchNumber / 2)
}

// Vencedor do match_number vai para athlete1 ou athlete2 do próximo match
export function getNextMatchSlot(currentMatchNumber: number): 'athlete1' | 'athlete2' {
  return currentMatchNumber % 2 === 1 ? 'athlete1' : 'athlete2'
}

export interface BracketRound {
  round: number
  roundName: string
  matches: KnockoutMatch[]
}

export function organizeBracketByRounds(matches: KnockoutMatch[]): BracketRound[] {
  if (matches.length === 0) return []

  const maxRound = Math.max(...matches.map((m) => m.round))
  const rounds: BracketRound[] = []

  for (let round = maxRound; round >= 1; round--) {
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.match_number - b.match_number)

    if (roundMatches.length > 0) {
      rounds.push({
        round,
        roundName: getRoundName(round, maxRound),
        matches: roundMatches,
      })
    }
  }

  return rounds
}

function getRoundName(round: number, maxRound: number): string {
  if (round === 1) return 'Final'
  if (round === 2) return 'Semifinal'
  if (round === 3) return 'Quartas de Final'
  if (round === 4) return 'Oitavas de Final'
  return `Rodada ${maxRound - round + 1}`
}
