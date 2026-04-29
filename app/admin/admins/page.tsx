'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Loader2, UserCog, Shield, UserMinus, UserCheck } from 'lucide-react'

export default function AdminAdminsPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    const [{ data: { user } }, { data: profileData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').order('role').order('name'),
    ])
    setCurrentUserId(user?.id ?? null)
    setProfiles(profileData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleInvite() {
    if (!email.trim() || !name.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Convite enviado!', description: `Convite enviado para ${email}.`, variant: 'success' })
      setInviteOpen(false)
      setEmail('')
      setName('')
      fetchData()
    }
    setSaving(false)
  }

  async function handlePromote() {
    if (!selectedUserId) return
    setSaving(true)
    const res = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: selectedUserId, role: 'admin' }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Admin adicionado!', variant: 'success' })
      setPromoteOpen(false)
      setSelectedUserId('')
      fetchData()
    }
    setSaving(false)
  }

  async function handleRevoke(targetId: string, targetName: string) {
    if (!confirm(`Remover permissão de admin de ${targetName}?`)) return
    const res = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetId, role: 'viewer' }),
    })
    const data = await res.json()
    if (!res.ok) toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    else { toast({ title: 'Permissão removida', variant: 'success' }); fetchData() }
  }

  const admins = profiles.filter((p) => ['admin', 'super_admin'].includes(p.role))
  const promotable = profiles.filter((p) => !['admin', 'super_admin'].includes(p.role))

  const roleLabel = (role: string) => role === 'super_admin' ? 'Super Admin' : 'Admin'
  const roleVariant = (role: string): any => role === 'super_admin' ? 'default' : 'secondary'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Administradores</h1>
          <span className="bg-slate-100 text-slate-600 text-sm px-2 py-0.5 rounded-full">{admins.length}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPromoteOpen(true)} size="sm" variant="outline" disabled={promotable.length === 0}>
            <UserCheck className="h-4 w-4 mr-1" /> Promover usuário
          </Button>
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Convidar por e-mail
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2 text-sm text-amber-800">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Admins têm as mesmas permissões que o Super Admin, exceto a capacidade de gerenciar outros admins.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-navy-600" /></div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback>{admin.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{admin.name}</p>
              </div>
              <Badge variant={roleVariant(admin.role)}>{roleLabel(admin.role)}</Badge>
              {admin.role === 'admin' && admin.id !== currentUserId && (
                <button
                  onClick={() => handleRevoke(admin.id, admin.name)}
                  className="text-red-400 hover:text-red-600 transition-colors ml-1"
                  title="Remover admin"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Promover usuário existente */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Promover a Admin
            </DialogTitle>
            <DialogDescription>
              Selecione um usuário já cadastrado para torná-lo administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5 block">Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                {promotable.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    <span className="text-slate-400 ml-1 text-xs capitalize">({p.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPromoteOpen(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handlePromote} disabled={saving || !selectedUserId} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Promover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Convidar por e-mail */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Convidar por E-mail
            </DialogTitle>
            <DialogDescription>
              O usuário receberá um e-mail para criar conta já com permissão de admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do administrador" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={saving || !email.trim() || !name.trim()} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
