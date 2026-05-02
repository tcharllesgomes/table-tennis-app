'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Loader2, Trophy, Layers } from 'lucide-react'
import Link from 'next/link'

export default function NovoTorneioPge() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    edition: '1',
    description: '',
    type: 'classic',
    groups_count: '4',
    players_per_group: '4',
    start_date: '',
    end_date: '',
    is_current: true,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: form.name.trim(),
        edition: parseInt(form.edition),
        description: form.description.trim() || null,
        type: form.type,
        groups_count: form.type === 'classic' ? parseInt(form.groups_count) : 0,
        players_per_group: form.type === 'classic' ? parseInt(form.players_per_group) : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_current: form.is_current,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      toast({ title: 'Erro ao criar campeonato', description: error.message, variant: 'destructive' })
      setLoading(false)
      return
    }
    toast({ title: 'Campeonato criado!', variant: 'success' })
    router.push(`/admin/torneios/${data.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/torneios" className="text-slate-500 hover:text-navy-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Novo Campeonato</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-navy-600" /> Informações do Campeonato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do Campeonato *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ex: Copa Verão 2025" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edition">Edição *</Label>
                <Input id="edition" type="number" min={1} value={form.edition} onChange={(e) => set('edition', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {/* Tipo de torneio */}
            <div className="space-y-1.5">
              <Label>Formato *</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'classic', label: 'Clássico', desc: 'Mata-mata por posição' },
                  { value: 'categories', label: 'Por Categorias', desc: 'Múltiplas categorias independentes' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('type', opt.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      form.type === opt.value
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${form.type === opt.value ? 'text-navy-700' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'classic' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="groups_count">Nº de Grupos *</Label>
                    <Input id="groups_count" type="number" min={2} value={form.groups_count} onChange={(e) => set('groups_count', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="players_per_group">Atletas por Grupo *</Label>
                    <Input id="players_per_group" type="number" min={2} value={form.players_per_group} onChange={(e) => set('players_per_group', e.target.value)} required />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                  Total de atletas esperados:{' '}
                  <span className="font-semibold text-navy-600">
                    {parseInt(form.groups_count || '0') * parseInt(form.players_per_group || '0')}
                  </span>
                </div>
              </>
            )}

            {form.type === 'categories' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                <Layers className="h-4 w-4 shrink-0 mt-0.5" />
                <span>As categorias e suas configurações de grupos serão definidas após a criação do torneio.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Data de Início</Label>
                <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">Data de Fim</Label>
                <Input id="end_date" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Criar Campeonato
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
