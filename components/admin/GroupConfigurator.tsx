'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface GroupConfiguratorProps {
  athleteCount: number
  groupCount: number
  open: boolean
  onConfirm: (sizes: number[]) => void
  onCancel: () => void
}

function describeDistribution(sizes: number[]): string {
  const counts = new Map<number, number>()
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => `${count} grupo${count > 1 ? 's' : ''} de ${size}`)
    .join(' e ')
}

function generateDistributions(n: number, g: number, minPerGroup = 2): number[][] {
  if (n < g * minPerGroup) return []

  const results: number[][] = []
  const seen = new Set<string>()

  function addDist(d: number[]) {
    const sorted = [...d].sort((a, b) => b - a)
    const key = sorted.join(',')
    if (seen.has(key)) return
    seen.add(key)
    results.push(sorted)
  }

  // Balanced (most equal)
  const baseMin = Math.floor(n / g)
  const remainder = n % g
  const balanced = Array.from({ length: g }, (_, i) => (i < remainder ? baseMin + 1 : baseMin))
  addDist(balanced)

  // Variants: for each possible max group size above balanced, try 1..g large groups
  const balancedMax = Math.ceil(n / g)
  for (let maxSize = balancedMax + 1; maxSize <= n - (g - 1) * minPerGroup; maxSize++) {
    for (let bigGroups = 1; bigGroups < g; bigGroups++) {
      const rest = n - bigGroups * maxSize
      const restG = g - bigGroups
      if (rest < restG * minPerGroup) break
      const restMin = Math.floor(rest / restG)
      const restRem = rest % restG
      if (restMin < minPerGroup) break
      const d = [
        ...Array(bigGroups).fill(maxSize),
        ...Array.from({ length: restG }, (_, i) => (i < restRem ? restMin + 1 : restMin)),
      ]
      addDist(d)
      if (results.length >= 6) break
    }
    if (results.length >= 6) break
  }

  return results
}

export function GroupConfigurator({
  athleteCount,
  groupCount,
  open,
  onConfirm,
  onCancel,
}: GroupConfiguratorProps) {
  const distributions = useMemo(
    () => generateDistributions(athleteCount, groupCount),
    [athleteCount, groupCount]
  )

  const [selected, setSelected] = useState<'auto' | number>('auto')
  const [customSizes, setCustomSizes] = useState<string[]>(
    Array(groupCount).fill(Math.floor(athleteCount / groupCount).toString())
  )

  const activeSizes: number[] =
    selected === 'auto'
      ? (distributions[0] ?? [])
      : selected === -1
      ? customSizes.map(Number)
      : (distributions[selected] ?? [])

  const customTotal = customSizes.reduce((s, v) => s + (parseInt(v) || 0), 0)
  const customValid =
    customTotal === athleteCount && customSizes.every((v) => parseInt(v) >= 2)

  const canConfirm =
    selected === -1 ? customValid : activeSizes.length === groupCount

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Grupos</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-1">
          {athleteCount} atletas · {groupCount} grupos
        </p>

        {distributions.length === 0 ? (
          <p className="text-sm text-red-600">
            Atletas insuficientes para {groupCount} grupos (mínimo 2 por grupo).
          </p>
        ) : (
          <div className="space-y-2 py-1">
            {distributions.map((dist, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  (selected === 'auto' && idx === 0) || selected === idx
                    ? 'border-navy-600 bg-navy-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="dist"
                  className="accent-navy-600"
                  checked={(selected === 'auto' && idx === 0) || selected === idx}
                  onChange={() => setSelected(idx === 0 ? 'auto' : idx)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">
                    {describeDistribution(dist)}
                  </span>
                  {idx === 0 && (
                    <span className="ml-2 text-xs text-emerald-600 font-medium">sugerido</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {dist.map((size, gi) => (
                    <span
                      key={gi}
                      className="w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </label>
            ))}

            {/* Custom option */}
            <label
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                selected === -1
                  ? 'border-navy-600 bg-navy-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="dist"
                className="accent-navy-600 mt-0.5"
                checked={selected === -1}
                onChange={() => setSelected(-1)}
              />
              <div className="flex-1 space-y-2">
                <span className="text-sm font-medium text-slate-800">Personalizado</span>
                {selected === -1 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      {customSizes.map((v, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <Input
                            type="number"
                            min={2}
                            value={v}
                            onChange={(e) => {
                              const next = [...customSizes]
                              next[i] = e.target.value
                              setCustomSizes(next)
                            }}
                            className="w-14 h-8 text-center text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-slate-400">G{i + 1}</span>
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs ${customTotal === athleteCount ? 'text-emerald-600' : 'text-red-500'}`}>
                      Total: {customTotal}/{athleteCount}
                      {!customSizes.every((v) => parseInt(v) >= 2) && ' · mínimo 2 por grupo'}
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(selected === -1 ? customSizes.map(Number) : activeSizes)}
            disabled={!canConfirm}
            className="flex-1"
          >
            Sortear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
