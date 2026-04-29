'use client'

import { useState } from 'react'
import { TournamentCategory, Athlete, CategoryAthlete, GroupMatch, KnockoutMatch } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MatchCard } from '@/components/tournament/MatchCard'
import { GroupStandings } from '@/components/tournament/GroupStandings'
import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'
import { ScoreModal } from '@/components/admin/ScoreModal'
import { useToast } from '@/components/ui/use-toast'
import { calculateGroupStandings, getGroupLabel, getBracketRankLabel } from '@/lib/utils'
import { Plus, Pencil, Trash2, UserPlus, Shuffle, ChevronDown, ChevronRight, Swords } from 'lucide-react'

interface CategoryPanelProps {
  tournamentId: string
  tournamentStatus: string
  categories: (TournamentCategory & {
    athletes: (CategoryAthlete & { athlete: Athlete })[]
    groupMatches: (GroupMatch & { athlete1: Athlete; athlete2: Athlete })[]
    knockoutMatches: (KnockoutMatch & { athlete1: Athlete | null; athlete2: Athlete | null })[]
  })[]
  allAthletes: Athlete[]
  onRefresh: () => void
}

export function CategoryPanel({
  tournamentId,
  tournamentStatus,
  categories,
  allAthletes,
  onRefresh,
}: CategoryPanelProps) {
  const { toast } = useToast()
  const [expandedCat, setExpandedCat] = useState<string | null>(categories[0]?.id ?? null)
  const [catForm, setCatForm] = useState({ name: '', groups_count: '2', players_per_group: '4' })
  const [editingCat, setEditingCat] = useState<TournamentCategory | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState<Record<string, string>>({})
  const [selectedGroup, setSelectedGroup] = useState<Record<string, string>>({})
  const [scoreModal, setScoreModal] = useState<{ match: any; type: 'group' | 'knockout' } | null>(null)

  const isDraft = tournamentStatus === 'draft'

  function openNewCat() {
    setEditingCat(null)
    setCatForm({ name: '', groups_count: '2', players_per_group: '4' })
    setCatDialogOpen(true)
  }

  function openEditCat(cat: TournamentCategory) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, groups_count: cat.groups_count.toString(), players_per_group: cat.players_per_group.toString() })
    setCatDialogOpen(true)
  }

  async function saveCat() {
    if (!catForm.name.trim()) return
    setSaving(true)
    if (editingCat) {
      const res = await fetch(`/api/admin/categories/${editingCat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catForm.name, groups_count: parseInt(catForm.groups_count), players_per_group: parseInt(catForm.players_per_group) }),
      })
      const d = await res.json()
      if (!res.ok) toast({ title: 'Erro', description: d.error, variant: 'destructive' })
      else toast({ title: 'Categoria atualizada!', variant: 'success' })
    } else {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId, name: catForm.name, groups_count: parseInt(catForm.groups_count), players_per_group: parseInt(catForm.players_per_group) }),
      })
      const d = await res.json()
      if (!res.ok) toast({ title: 'Erro', description: d.error, variant: 'destructive' })
      else { toast({ title: 'Categoria criada!', variant: 'success' }); setExpandedCat(d.data?.id ?? null) }
    }
    setSaving(false)
    setCatDialogOpen(false)
    onRefresh()
  }

  async function deleteCat(cat: TournamentCategory) {
    if (!confirm(`Excluir categoria "${cat.name}"? Todos os atletas e partidas serão removidos.`)) return
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: d.error, variant: 'destructive' })
    else { toast({ title: 'Categoria excluída', variant: 'success' }); onRefresh() }
  }

  async function addAthlete(catId: string, groupCount: number) {
    const athleteId = selectedAthlete[catId]
    if (!athleteId) return
    const group = selectedGroup[catId]
    const res = await fetch(`/api/admin/categories/${catId}/athletes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, group_number: group && group !== 'none' ? parseInt(group) : null }),
    })
    const d = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: d.error, variant: 'destructive' })
    else { toast({ title: 'Atleta adicionado!', variant: 'success' }); setSelectedAthlete((p) => ({ ...p, [catId]: '' })); onRefresh() }
  }

  async function removeAthlete(catId: string, athleteId: string) {
    const res = await fetch(`/api/admin/categories/${catId}/athletes/${athleteId}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: d.error, variant: 'destructive' })
    else onRefresh()
  }

  async function updateGroup(catId: string, athleteId: string, group: string) {
    await fetch(`/api/admin/categories/${catId}/athletes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, group_number: group === 'none' ? null : parseInt(group) }),
    })
    onRefresh()
  }

  async function shuffleGroups(cat: TournamentCategory & { athletes: (CategoryAthlete & { athlete: Athlete })[] }) {
    if (cat.athletes.length === 0) { toast({ title: 'Nenhum atleta', variant: 'destructive' }); return }
    if (!confirm('Sortear sobrescreverá os grupos atuais. Continuar?')) return
    const shuffled = [...cat.athletes].sort(() => Math.random() - 0.5)
    await Promise.all(shuffled.map((ca, i) =>
      fetch(`/api/admin/categories/${cat.id}/athletes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: ca.athlete_id, group_number: (i % cat.groups_count) + 1 }),
      })
    ))
    toast({ title: 'Atletas sorteados!', variant: 'success' })
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {isDraft && (
        <div className="flex justify-end">
          <Button onClick={openNewCat} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Categoria
          </Button>
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p>Nenhuma categoria criada. Adicione categorias para este torneio.</p>
        </div>
      )}

      {categories.map((cat) => {
        const isExpanded = expandedCat === cat.id
        const groupNumbers = Array.from({ length: cat.groups_count }, (_, i) => i + 1)
        const registeredIds = new Set(cat.athletes.map((a) => a.athlete_id))
        const available = allAthletes.filter((a) => !registeredIds.has(a.id))
        const unassigned = cat.athletes.filter((a) => a.group_number == null)
        const bracketRanks = Array.from(new Set(cat.knockoutMatches.map((m) => m.bracket_rank))).sort()

        return (
          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header da categoria */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <span className="font-semibold text-slate-900">{cat.name}</span>
                <span className="text-xs text-slate-400">{cat.athletes.length} atleta{cat.athletes.length !== 1 ? 's' : ''} · {cat.groups_count} grupo{cat.groups_count !== 1 ? 's' : ''}</span>
              </div>
              {isDraft && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEditCat(cat)} className="p-1.5 text-slate-400 hover:text-navy-600 transition-colors rounded">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteCat(cat)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-4 space-y-5">
                {/* Adicionar atleta */}
                {isDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Atletas</p>
                      <Button size="sm" variant="accent" onClick={() => shuffleGroups(cat)} disabled={cat.athletes.length === 0} className="h-7 text-xs">
                        <Shuffle className="h-3.5 w-3.5 mr-1" /> Sortear
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Select value={selectedAthlete[cat.id] ?? ''} onValueChange={(v) => setSelectedAthlete((p) => ({ ...p, [cat.id]: v }))}>
                        <SelectTrigger className="flex-1 min-w-[160px] h-8 text-sm">
                          <SelectValue placeholder="Selecionar atleta" />
                        </SelectTrigger>
                        <SelectContent>
                          {available.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={selectedGroup[cat.id] ?? 'none'} onValueChange={(v) => setSelectedGroup((p) => ({ ...p, [cat.id]: v }))}>
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue placeholder="Grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem grupo</SelectItem>
                          {groupNumbers.map((g) => <SelectItem key={g} value={g.toString()}>Grupo {getGroupLabel(g)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8" disabled={!selectedAthlete[cat.id]} onClick={() => addAthlete(cat.id, cat.groups_count)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de atletas */}
                {cat.athletes.length > 0 && (
                  <div className="space-y-2">
                    {/* Sem grupo */}
                    {unassigned.length > 0 && (
                      <div className="rounded-lg border border-amber-300 overflow-hidden">
                        <div className="bg-amber-500 px-3 py-1.5">
                          <span className="text-white font-bold text-xs">Sem grupo ({unassigned.length})</span>
                        </div>
                        {unassigned.map((ca) => (
                          <div key={ca.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0">
                            <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">{ca.athlete.name.slice(0, 2).toUpperCase()}</div>
                            <span className="text-sm flex-1 truncate">{ca.athlete.name}</span>
                            {isDraft && (
                              <>
                                <Select value="none" onValueChange={(v) => updateGroup(cat.id, ca.athlete_id, v)}>
                                  <SelectTrigger className="w-28 h-6 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem grupo</SelectItem>
                                    {groupNumbers.map((g) => <SelectItem key={g} value={g.toString()}>Grupo {getGroupLabel(g)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <button onClick={() => removeAthlete(cat.id, ca.athlete_id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {groupNumbers.map((g) => {
                      const gAthletes = cat.athletes.filter((a) => a.group_number === g)
                      return (
                        <div key={g} className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-navy-600 px-3 py-1.5">
                            <span className="text-white font-bold text-xs">Grupo {getGroupLabel(g)}</span>
                            <span className="text-white/60 text-xs ml-1.5">({gAthletes.length}/{cat.players_per_group})</span>
                          </div>
                          {gAthletes.length === 0 && <p className="px-3 py-2 text-xs text-slate-400 italic">Vazio</p>}
                          {gAthletes.map((ca) => (
                            <div key={ca.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0">
                              <div className="h-6 w-6 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600">{ca.athlete.name.slice(0, 2).toUpperCase()}</div>
                              <span className="text-sm flex-1 truncate">{ca.athlete.name}</span>
                              {isDraft && (
                                <>
                                  <Select value={g.toString()} onValueChange={(v) => updateGroup(cat.id, ca.athlete_id, v)}>
                                    <SelectTrigger className="w-28 h-6 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sem grupo</SelectItem>
                                      {groupNumbers.map((n) => <SelectItem key={n} value={n.toString()}>Grupo {getGroupLabel(n)}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <button onClick={() => removeAthlete(cat.id, ca.athlete_id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Partidas e standings */}
                {cat.groupMatches.length > 0 && (
                  <div className="space-y-6">
                    {groupNumbers.map((g) => {
                      const gAthletes = cat.athletes.filter((a) => a.group_number === g)
                      const matches = cat.groupMatches.filter((m) => m.group_number === g)
                      if (matches.length === 0 && gAthletes.length === 0) return null
                      const adapted = gAthletes.map((ca) => ({ ...ca, athlete_id: ca.athlete_id }))
                      const standings = calculateGroupStandings(adapted as any, matches as any)
                      return (
                        <div key={g} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                          <GroupStandings standings={standings} groupLabel={getGroupLabel(g)} />
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Partidas — Grupo {getGroupLabel(g)}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {matches.map((m) => (
                                <MatchCard
                                  key={m.id}
                                  match={m}
                                  onEdit={tournamentStatus === 'group_stage' ? () => setScoreModal({ match: m, type: 'group' }) : undefined}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Mata-mata da categoria */}
                {cat.knockoutMatches.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Swords className="h-3.5 w-3.5" /> Mata-Mata</p>
                    {bracketRanks.map((rank) => (
                      <div key={rank}>
                        <p className="text-sm font-medium text-slate-700 mb-2">{getBracketRankLabel(rank)}</p>
                        <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
                          <KnockoutBracket
                            matches={cat.knockoutMatches.filter((m) => m.bracket_rank === rank)}
                            onEditMatch={tournamentStatus === 'knockout_stage' ? (m) => setScoreModal({ match: m, type: 'knockout' }) : undefined}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Dialog criação/edição de categoria */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Ouro, Iniciante..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nº de Grupos</Label>
                <Input type="number" min={1} value={catForm.groups_count} onChange={(e) => setCatForm((p) => ({ ...p, groups_count: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Atletas/Grupo</Label>
                <Input type="number" min={2} value={catForm.players_per_group} onChange={(e) => setCatForm((p) => ({ ...p, players_per_group: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatDialogOpen(false)} disabled={saving} className="flex-1">Cancelar</Button>
            <Button onClick={saveCat} disabled={saving || !catForm.name.trim()} className="flex-1">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {scoreModal && (
        <ScoreModal
          match={scoreModal.match}
          type={scoreModal.type}
          open={!!scoreModal}
          onClose={() => setScoreModal(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}
