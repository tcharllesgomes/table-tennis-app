'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Athlete, Profile } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Loader2, Upload, Users, Link2, Link2Off } from 'lucide-react'

export default function AdminAtletasPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Athlete | null>(null)
  const [name, setName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [linkingAthleteId, setLinkingAthleteId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')

  async function fetchData() {
    const [{ data: athleteData }, { data: profileData }] = await Promise.all([
      supabase.from('athletes').select('*').order('name'),
      supabase.from('profiles').select('*').order('name'),
    ])
    setAthletes(athleteData ?? [])
    setProfiles(profileData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function openNew() {
    setEditing(null)
    setName('')
    setPhotoFile(null)
    setPhotoPreview('')
    setOpen(true)
  }

  function openEdit(athlete: Athlete) {
    setEditing(athlete)
    setName(athlete.name)
    setPhotoFile(null)
    setPhotoPreview(athlete.photo_url ?? '')
    setOpen(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    let photo_url = editing?.photo_url ?? null

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('athletes')
        .upload(path, photoFile, { upsert: true })
      if (uploadError) {
        toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' })
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('athletes').getPublicUrl(path)
      photo_url = publicUrl
    }

    if (editing) {
      const { error } = await supabase.from('athletes').update({ name: name.trim(), photo_url }).eq('id', editing.id)
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else toast({ title: 'Atleta atualizado!', variant: 'success' })
    } else {
      const { error } = await supabase.from('athletes').insert({ name: name.trim(), photo_url })
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else toast({ title: 'Atleta cadastrado!', variant: 'success' })
    }

    setSaving(false)
    setOpen(false)
    fetchData()
  }

  async function handleLink(athleteId: string, userId: string | null) {
    const res = await fetch(`/api/admin/athletes/${athleteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    } else {
      toast({ title: userId ? 'Conta vinculada!' : 'Vínculo removido', variant: 'success' })
      setLinkingAthleteId(null)
      setSelectedUserId('')
      fetchData()
    }
  }

  // Usuários sem vínculo com atleta (não admin/super_admin com vínculo já em uso)
  const linkedUserIds = new Set(athletes.map((a) => a.user_id).filter(Boolean))
  const availableProfiles = profiles.filter(
    (p) => !['admin', 'super_admin'].includes(p.role) && !linkedUserIds.has(p.id)
  )

  const filtered = athletes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Atletas</h1>
          <span className="bg-slate-100 text-slate-600 text-sm px-2 py-0.5 rounded-full">{athletes.length}</span>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Atleta
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar atleta..."
        className="mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-navy-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{search ? 'Nenhum atleta encontrado.' : 'Nenhum atleta cadastrado.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((athlete) => {
            const linkedProfile = athlete.user_id ? profiles.find((p) => p.id === athlete.user_id) : null
            const isLinking = linkingAthleteId === athlete.id

            return (
              <div key={athlete.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    {athlete.photo_url && <AvatarImage src={athlete.photo_url} alt={athlete.name} />}
                    <AvatarFallback>{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{athlete.name}</p>
                    {linkedProfile && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                        <Link2 className="h-3 w-3" /> {linkedProfile.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(athlete)}
                    className="text-slate-400 hover:text-navy-600 transition-colors shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Vínculo de conta */}
                {isLinking ? (
                  <div className="flex gap-2">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Selecionar usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!selectedUserId}
                      onClick={() => handleLink(athlete.id, selectedUserId)}
                    >
                      Vincular
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => { setLinkingAthleteId(null); setSelectedUserId('') }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : linkedProfile ? (
                  <button
                    onClick={() => {
                      if (confirm(`Remover vínculo de ${athlete.name} com ${linkedProfile.name}?`)) {
                        handleLink(athlete.id, null)
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Link2Off className="h-3.5 w-3.5" /> Remover vínculo
                  </button>
                ) : (
                  <button
                    onClick={() => { setLinkingAthleteId(athlete.id); setSelectedUserId('') }}
                    className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-800 transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Vincular conta
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Atleta' : 'Novo Atleta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                {photoPreview && <AvatarImage src={photoPreview} />}
                <AvatarFallback className="text-xl">
                  {name ? name.slice(0, 2).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <span className="flex items-center gap-1.5 text-sm text-navy-600 hover:underline">
                  <Upload className="h-4 w-4" /> {photoPreview ? 'Alterar foto' : 'Adicionar foto'}
                </span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="athlete-name">Nome *</Label>
              <Input
                id="athlete-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do atleta"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
