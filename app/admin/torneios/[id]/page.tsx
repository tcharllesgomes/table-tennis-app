'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tournament, TournamentAthlete, Athlete, GroupMatch, KnockoutMatch, TournamentCategory, CategoryAthlete } from '@/lib/supabase/types'
import { MatchCard } from '@/components/tournament/MatchCard'
import { GroupStandings } from '@/components/tournament/GroupStandings'
import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'
import { ScoreModal } from '@/components/admin/ScoreModal'
import { CategoryPanel } from '@/components/admin/CategoryPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { calculateGroupStandings, getGroupLabel, getStatusLabel, getBracketRankLabel } from '@/lib/utils'
import { ArrowLeft, Loader2, Users, Swords, Plus, UserPlus, Trash2, Shuffle, Trash } from 'lucide-react'
import Link from 'next/link'

export default function AdminTournamentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [tournamentAthletes, setTournamentAthletes] = useState<(TournamentAthlete & { athlete: Athlete })[]>([])
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
  const [groupMatches, setGroupMatches] = useState<(GroupMatch & { athlete1: Athlete; athlete2: Athlete })[]>([])
  const [knockoutMatches, setKnockoutMatches] = useState<(KnockoutMatch & { athlete1: Athlete | null; athlete2: Athlete | null })[]>([])
  const [categories, setCategories] = useState<(TournamentCategory & {
    athletes: (CategoryAthlete & { athlete: Athlete })[]
    groupMatches: (GroupMatch & { athlete1: Athlete; athlete2: Athlete })[]
    knockoutMatches: (KnockoutMatch & { athlete1: Athlete | null; athlete2: Athlete | null })[]
  })[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [scoreModal, setScoreModal] = useState<{ match: any; type: 'group' | 'knockout' } | null>(null)
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('none')

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [
      { data: t },
      { data: ta },
      { data: athletes },
      { data: gm },
      { data: km },
      { data: cats },
      { data: catAthletes },
    ] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_athletes').select('*, athlete:athletes(*)').eq('tournament_id', tournamentId),
      supabase.from('athletes').select('*').order('name'),
      supabase.from('group_matches').select('*, athlete1:athletes!group_matches_athlete1_id_fkey(*), athlete2:athletes!group_matches_athlete2_id_fkey(*)').eq('tournament_id', tournamentId).order('group_number').order('match_order'),
      supabase.from('knockout_matches').select('*, athlete1:athletes!knockout_matches_athlete1_id_fkey(*), athlete2:athletes!knockout_matches_athlete2_id_fkey(*)').eq('tournament_id', tournamentId).order('bracket_rank').order('round', { ascending: false }).order('match_number'),
      supabase.from('tournament_categories').select('*').eq('tournament_id', tournamentId).order('created_at'),
      supabase.from('category_athletes').select('*, athlete:athletes(*)').eq('tournament_id', tournamentId),
    ])

    setTournament(t)
    setTournamentAthletes((ta as any) ?? [])
    setAllAthletes(athletes ?? [])
    setGroupMatches((gm as any) ?? [])
    setKnockoutMatches((km as any) ?? [])

    if (cats) {
      const gmList = (gm as any) ?? []
      const kmList = (km as any) ?? []
      const caList = (catAthletes as any) ?? []
      setCategories(cats.map((cat: TournamentCategory) => ({
        ...cat,
        athletes: caList.filter((ca: any) => ca.category_id === cat.id),
        groupMatches: gmList.filter((m: any) => m.category_id === cat.id),
        knockoutMatches: kmList.filter((m: any) => m.category_id === cat.id),
      })))
    }

    setLoading(false)
  }, [tournamentId])

  useEffect(() => { fetchData() }, [fetchData])

  async function addAthlete() {
    if (!selectedAthlete) return
    setActionLoading(true)
    const { error } = await supabase.from('tournament_athletes').insert({
      tournament_id: tournamentId,
      athlete_id: selectedAthlete,
      group_number: selectedGroup === 'none' ? null : parseInt(selectedGroup),
    })
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Atleta adicionado!', variant: 'success' }); setSelectedAthlete(''); fetchData() }
    setActionLoading(false)
  }

  async function removeAthlete(taId: string) {
    const { error } = await supabase.from('tournament_athletes').delete().eq('id', taId)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else fetchData()
  }

  async function updateAthleteGroup(taId: string, groupNumber: number | null) {
    await supabase.from('tournament_athletes').update({ group_number: groupNumber }).eq('id', taId)
    fetchData()
  }

  async function shuffleGroups() {
    if (tournamentAthletes.length === 0) {
      toast({ title: 'Nenhum atleta inscrito', variant: 'destructive' })
      return
    }
    if (!confirm('Sortear sobrescreverá os grupos atuais. Continuar?')) return

    setActionLoading(true)
    const shuffled = [...tournamentAthletes]
      .map((ta) => ({ ta, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ ta }) => ta)

    const groupCount = tournament!.groups_count
    const updates = shuffled.map((ta, i) =>
      supabase
        .from('tournament_athletes')
        .update({ group_number: (i % groupCount) + 1 })
        .eq('id', ta.id)
    )

    const results = await Promise.all(updates)
    const firstError = results.find((r) => r.error)?.error
    if (firstError) toast({ title: 'Erro', description: firstError.message, variant: 'destructive' })
    else { toast({ title: 'Atletas sorteados!', variant: 'success' }); fetchData() }
    setActionLoading(false)
  }

  async function startGroupStage() {
    setActionLoading(true)
    const res = await fetch('/api/admin/start-group-stage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId }),
    })
    const data = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    else { toast({ title: 'Fase de grupos iniciada!', variant: 'success' }); fetchData() }
    setActionLoading(false)
  }

  async function advanceToKnockout() {
    setActionLoading(true)
    const res = await fetch('/api/admin/advance-to-knockout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId }),
    })
    const data = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    else { toast({ title: 'Mata-mata gerado!', variant: 'success' }); fetchData() }
    setActionLoading(false)
  }

  async function finishTournament() {
    setActionLoading(true)
    const res = await fetch('/api/admin/finish-tournament', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId }),
    })
    const data = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    else { toast({ title: 'Campeonato finalizado!', variant: 'success' }); fetchData() }
    setActionLoading(false)
  }

  async function deleteTournament() {
    if (!confirm(`Excluir "${tournament?.name}"? Esta ação é irreversível e remove todas as partidas e inscrições.`)) return
    setActionLoading(true)
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      setActionLoading(false)
    } else {
      router.push('/admin/torneios')
      router.refresh()
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-600" /></div>
  if (!tournament) return <div className="text-center py-20 text-slate-500">Campeonato não encontrado.</div>

  const groupNumbers = Array.from({ length: tournament.groups_count }, (_, i) => i + 1)
  const registeredIds = new Set(tournamentAthletes.map((ta) => ta.athlete_id))
  const availableAthletes = allAthletes.filter((a) => !registeredIds.has(a.id))

  const statusVariant: Record<string, any> = {
    draft: 'secondary', group_stage: 'accent', knockout_stage: 'warning', finished: 'success',
  }

  const bracketRanks = Array.from(new Set(knockoutMatches.map((m) => m.bracket_rank))).sort()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/torneios" className="text-slate-500 hover:text-navy-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{tournament.name}</h1>
            <Badge variant={statusVariant[tournament.status]}>{getStatusLabel(tournament.status)}</Badge>
          </div>
          <p className="text-sm text-slate-500">{tournament.edition}ª Edição</p>
        </div>
        <button
          onClick={deleteTournament}
          disabled={actionLoading}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Excluir campeonato"
        >
          <Trash className="h-5 w-5" />
        </button>
      </div>

      {/* Ações de fase */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-slate-600 font-medium">
          {tournament.status === 'draft' && 'Configure os grupos e inicie a fase de grupos.'}
          {tournament.status === 'group_stage' && 'Registre os placares das partidas de grupo.'}
          {tournament.status === 'knockout_stage' && 'Registre os placares das partidas do mata-mata.'}
          {tournament.status === 'finished' && 'Campeonato finalizado.'}
        </p>
        <div className="flex gap-2">
          {tournament.status === 'draft' && (
            <Button onClick={startGroupStage} disabled={actionLoading} variant="accent" size="sm">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar Fase de Grupos'}
            </Button>
          )}
          {tournament.status === 'group_stage' && (
            <Button onClick={advanceToKnockout} disabled={actionLoading} variant="accent" size="sm">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Mata-Mata'}
            </Button>
          )}
          {tournament.status === 'knockout_stage' && (
            <Button onClick={finishTournament} disabled={actionLoading} size="sm">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalizar Campeonato'}
            </Button>
          )}
        </div>
      </div>

      {tournament.type === 'categories' ? (
        <CategoryPanel
          tournamentId={tournamentId}
          tournamentStatus={tournament.status}
          categories={categories}
          allAthletes={allAthletes}
          onRefresh={fetchData}
        />
      ) : (
        <>
          <Tabs defaultValue={tournament.status === 'knockout_stage' || tournament.status === 'finished' ? 'knockout' : 'groups'}>
            <TabsList className="mb-4">
              <TabsTrigger value="athletes"><Users className="h-4 w-4 mr-1.5" />Atletas</TabsTrigger>
              <TabsTrigger value="groups"><Users className="h-4 w-4 mr-1.5" />Grupos</TabsTrigger>
              {(tournament.status === 'knockout_stage' || tournament.status === 'finished') && (
                <TabsTrigger value="knockout"><Swords className="h-4 w-4 mr-1.5" />Mata-Mata</TabsTrigger>
              )}
            </TabsList>

            {/* Aba Atletas */}
            <TabsContent value="athletes">
              {tournament.status === 'draft' && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Adicionar Atleta
                    </h3>
                    <Button
                      onClick={shuffleGroups}
                      disabled={actionLoading || tournamentAthletes.length === 0}
                      size="sm"
                      variant="accent"
                    >
                      <Shuffle className="h-4 w-4 mr-1.5" /> Sortear Grupos
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                      <SelectTrigger className="flex-1 min-w-[180px]">
                        <SelectValue placeholder="Selecione um atleta" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAthletes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem grupo</SelectItem>
                        {groupNumbers.map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grupo {getGroupLabel(g)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addAthlete} disabled={actionLoading || !selectedAthlete} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Adicione sem grupo e use <strong>Sortear Grupos</strong> para distribuir aleatoriamente, ou escolha o grupo manualmente.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {(() => {
                  const unassigned = tournamentAthletes.filter((ta) => ta.group_number == null)
                  if (unassigned.length === 0) return null
                  return (
                    <div className="bg-white rounded-xl border border-amber-300 overflow-hidden">
                      <div className="bg-amber-500 px-4 py-2">
                        <span className="text-white font-bold text-sm">Sem grupo</span>
                        <span className="text-white/80 text-xs ml-2">({unassigned.length})</span>
                      </div>
                      {unassigned.map((ta) => (
                        <div key={ta.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                              {ta.athlete.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{ta.athlete.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tournament.status === 'draft' && (
                              <>
                                <Select
                                  value="none"
                                  onValueChange={(v) => updateAthleteGroup(ta.id, v === 'none' ? null : parseInt(v))}
                                >
                                  <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem grupo</SelectItem>
                                    {groupNumbers.map((n) => (
                                      <SelectItem key={n} value={n.toString()}>Grupo {getGroupLabel(n)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button onClick={() => removeAthlete(ta.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {groupNumbers.map((g) => {
                  const athletes = tournamentAthletes.filter((ta) => ta.group_number === g)
                  return (
                    <div key={g} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-navy-600 px-4 py-2">
                        <span className="text-white font-bold text-sm">Grupo {getGroupLabel(g)}</span>
                        <span className="text-white/60 text-xs ml-2">({athletes.length}/{tournament.players_per_group})</span>
                      </div>
                      {athletes.map((ta) => (
                        <div key={ta.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600">
                              {ta.athlete.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{ta.athlete.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tournament.status === 'draft' && (
                              <>
                                <Select
                                  value={ta.group_number?.toString() ?? 'none'}
                                  onValueChange={(v) => updateAthleteGroup(ta.id, v === 'none' ? null : parseInt(v))}
                                >
                                  <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem grupo</SelectItem>
                                    {groupNumbers.map((n) => (
                                      <SelectItem key={n} value={n.toString()}>Grupo {getGroupLabel(n)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button onClick={() => removeAthlete(ta.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {athletes.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400 italic">Nenhum atleta neste grupo.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* Aba Grupos */}
            <TabsContent value="groups">
              {groupMatches.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p>Inicie a fase de grupos para ver as partidas.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupNumbers.map((g) => {
                    const gAthletes = tournamentAthletes.filter((ta) => ta.group_number === g)
                    const matches = groupMatches.filter((m) => m.group_number === g)
                    const standings = calculateGroupStandings(gAthletes as any, matches)
                    return (
                      <div key={g} className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                        <GroupStandings standings={standings} groupLabel={getGroupLabel(g)} />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Partidas do Grupo {getGroupLabel(g)}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {matches.map((match) => (
                              <MatchCard
                                key={match.id}
                                match={match}
                                onEdit={tournament.status === 'group_stage'
                                  ? () => setScoreModal({ match, type: 'group' })
                                  : undefined}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Aba Mata-Mata */}
            <TabsContent value="knockout">
              {knockoutMatches.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Mata-mata ainda não gerado.</div>
              ) : (
                <div className="space-y-8">
                  {bracketRanks.map((rank) => {
                    const bracketMatches = knockoutMatches.filter((m) => m.bracket_rank === rank)
                    return (
                      <div key={rank}>
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Swords className="h-4 w-4 text-orange-500" />
                          {getBracketRankLabel(rank)}
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <KnockoutBracket
                            matches={bracketMatches}
                            onEditMatch={(m) => setScoreModal({ match: m, type: 'knockout' })}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Score Modal */}
          {scoreModal && (
            <ScoreModal
              match={scoreModal.match}
              type={scoreModal.type}
              open={!!scoreModal}
              onClose={() => setScoreModal(null)}
              onSaved={fetchData}
            />
          )}
        </>
      )}
    </div>
  )
}
