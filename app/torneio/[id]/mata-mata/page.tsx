import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'
import { KnockoutMatch, Athlete } from '@/lib/supabase/types'
import { ArrowLeft, Swords } from 'lucide-react'

export default async function MataMataCategoriasPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', params.id).single()
  if (!tournament) notFound()

  const { data: categories } = await supabase
    .from('tournament_categories')
    .select('id, name')
    .eq('tournament_id', params.id)
    .order('created_at')

  const { data: allMatches } = await supabase
    .from('knockout_matches')
    .select('*, athlete1:athletes!knockout_matches_athlete1_id_fkey(*), athlete2:athletes!knockout_matches_athlete2_id_fkey(*)')
    .eq('tournament_id', params.id)
    .order('bracket_rank')
    .order('round', { ascending: false })
    .order('match_number')

  const typedMatches = (allMatches ?? []) as (KnockoutMatch & { athlete1: Athlete | null; athlete2: Athlete | null } & { category_id: string | null })[]
  const hasAnyKnockout = typedMatches.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/torneio/${params.id}`} className="text-slate-500 hover:text-navy-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mata-Mata</h1>
          <p className="text-sm text-slate-500">{tournament.name} — {tournament.edition}ª Edição</p>
        </div>
      </div>

      {!hasAnyKnockout ? (
        <div className="text-center py-16 text-slate-500">
          <Swords className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Mata-mata ainda não foi gerado.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {(categories ?? []).map((cat) => {
            const catMatches = typedMatches.filter((m) => m.category_id === cat.id)
            if (catMatches.length === 0) return null

            return (
              <section key={cat.id}>
                <h2 className="text-lg font-bold text-navy-600 mb-4 pb-2 border-b border-slate-200">
                  {cat.name}
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto">
                  <KnockoutBracket matches={catMatches} />
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
