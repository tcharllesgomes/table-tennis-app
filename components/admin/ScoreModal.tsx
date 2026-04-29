'use client'

import { useState, useEffect } from 'react'
import { GroupMatch, KnockoutMatch, Athlete } from '@/lib/supabase/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Flag } from 'lucide-react'

type AnyMatch = (GroupMatch | KnockoutMatch) & {
  athlete1?: Athlete | null
  athlete2?: Athlete | null
}

interface ScoreModalProps {
  match: AnyMatch | null
  type: 'group' | 'knockout'
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ScoreModal({ match, type, open, onClose, onSaved }: ScoreModalProps) {
  const { toast } = useToast()
  const [sets1, setSets1] = useState('')
  const [sets2, setSets2] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (match && open) {
      setSets1(match.athlete1_sets.toString())
      setSets2(match.athlete2_sets.toString())
    }
  }, [match, open])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose()
      setSets1('')
      setSets2('')
    }
  }

  async function submit(body: Record<string, any>) {
    if (!match) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      toast({ title: 'Salvo!', variant: 'success' })
      onSaved()
      handleOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const s1 = parseInt(sets1)
    const s2 = parseInt(sets2)
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      toast({ title: 'Placar inválido', description: 'Informe valores válidos para os sets.', variant: 'destructive' })
      return
    }
    if (s1 === s2) {
      toast({ title: 'Empate não permitido', description: 'Um atleta deve vencer a partida.', variant: 'destructive' })
      return
    }
    submit({ athlete1_sets: s1, athlete2_sets: s2 })
  }

  async function handleWalkover(winnerId: string | null | undefined) {
    if (!winnerId) return
    if (!confirm('Confirmar W.O.? A partida será registrada como 3x0.')) return
    submit({ walkover_winner_id: winnerId })
  }

  if (!match) return null

  const a1 = match.athlete1
  const a2 = match.athlete2
  const canWO = !!(a1 && a2)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Placar</DialogTitle>
          <DialogDescription>Informe os sets vencidos ou registre um W.O.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Atleta 1 */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              {a1?.photo_url && <AvatarImage src={a1.photo_url} />}
              <AvatarFallback className="text-xs">
                {a1?.name.slice(0, 2).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Label className="block text-sm font-medium truncate">
                {a1?.name ?? 'A definir'}
              </Label>
            </div>
            <Input
              type="number"
              min={0}
              value={sets1}
              onChange={(e) => setSets1(e.target.value)}
              className="w-16 text-center font-bold text-lg"
              placeholder="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">VS</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Atleta 2 */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              {a2?.photo_url && <AvatarImage src={a2.photo_url} />}
              <AvatarFallback className="text-xs">
                {a2?.name.slice(0, 2).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Label className="block text-sm font-medium truncate">
                {a2?.name ?? 'A definir'}
              </Label>
            </div>
            <Input
              type="number"
              min={0}
              value={sets2}
              onChange={(e) => setSets2(e.target.value)}
              className="w-16 text-center font-bold text-lg"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </div>

        {canWO && (
          <div className="border-t border-slate-200 pt-3 mt-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Dar W.O.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleWalkover(a1?.id)}
                disabled={loading}
              >
                Vence {a1?.name}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleWalkover(a2?.id)}
                disabled={loading}
              >
                Vence {a2?.name}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
