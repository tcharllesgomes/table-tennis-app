'use client'

import { KnockoutMatch } from '@/lib/supabase/types'
import { BracketRound, organizeBracketByRounds } from '@/lib/bracket'
import { MatchCard } from './MatchCard'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnockoutBracketProps {
  matches: KnockoutMatch[]
  onEditMatch?: (match: KnockoutMatch) => void
}

const CARD_HEIGHT = 96 // px
const CARD_GAP = 16    // px

function getRoundSpacing(roundIndex: number): number {
  return Math.pow(2, roundIndex) * (CARD_HEIGHT + CARD_GAP) - CARD_GAP
}

export function KnockoutBracket({ matches, onEditMatch }: KnockoutBracketProps) {
  const rounds = organizeBracketByRounds(matches)
  if (rounds.length === 0) return (
    <div className="text-center py-12 text-slate-500">Mata-mata ainda não gerado.</div>
  )

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start gap-0 min-w-max">
        {rounds.map((round, roundIndex) => (
          <div key={round.round} className="flex items-start gap-0">
            {/* Round column */}
            <div className="flex flex-col" style={{ width: 240 }}>
              {/* Round label */}
              <div className={cn(
                'text-center text-xs font-bold uppercase tracking-wider py-2 mb-3 rounded-md mx-2',
                round.round === 1
                  ? 'bg-orange-500 text-white'
                  : 'bg-navy-600 text-white'
              )}>
                {round.round === 1 && <Trophy className="inline h-3 w-3 mr-1" />}
                {round.roundName}
              </div>

              {/* Matches */}
              <div
                className="flex flex-col mx-2"
                style={{ gap: `${getRoundSpacing(roundIndex)}px` }}
              >
                {round.matches.map((match) => (
                  <div key={match.id} style={{ height: CARD_HEIGHT }}>
                    <MatchCard
                      match={match}
                      onEdit={onEditMatch ? () => onEditMatch(match) : undefined}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Connector SVG between this round and the next */}
            {roundIndex < rounds.length - 1 && (
              <BracketConnector
                matchCount={round.matches.length}
                roundIndex={roundIndex}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BracketConnector({
  matchCount,
  roundIndex,
}: {
  matchCount: number
  roundIndex: number
}) {
  const labelHeight = 38 // approx height of round label + mb-3
  const groupSpacing = getRoundSpacing(roundIndex)
  const pairHeight = 2 * CARD_HEIGHT + groupSpacing
  const totalHeight = matchCount * CARD_HEIGHT + (matchCount - 1) * groupSpacing

  const pairs = Math.ceil(matchCount / 2)
  const width = 32

  return (
    <svg
      width={width}
      height={totalHeight + labelHeight}
      className="shrink-0"
      style={{ marginTop: 0 }}
    >
      {Array.from({ length: pairs }, (_, i) => {
        const offsetY = labelHeight
        const y1 = offsetY + i * (pairHeight + groupSpacing) + CARD_HEIGHT / 2
        const y2 = offsetY + i * (pairHeight + groupSpacing) + CARD_HEIGHT + groupSpacing + CARD_HEIGHT / 2
        const ymid = (y1 + y2) / 2

        return (
          <g key={i}>
            <polyline
              points={`0,${y1} ${width / 2},${y1} ${width / 2},${ymid}`}
              fill="none" stroke="#cbd5e1" strokeWidth="1.5"
            />
            <polyline
              points={`0,${y2} ${width / 2},${y2} ${width / 2},${ymid}`}
              fill="none" stroke="#cbd5e1" strokeWidth="1.5"
            />
            <line x1={width / 2} y1={ymid} x2={width} y2={ymid} stroke="#cbd5e1" strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}
