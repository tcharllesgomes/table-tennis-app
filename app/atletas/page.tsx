import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Users } from 'lucide-react'

export default async function AtletasPage() {
  const supabase = createClient()
  const { data: athletes } = await supabase
    .from('athletes')
    .select('*')
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-navy-600" />
        <h1 className="text-2xl font-bold text-slate-900">Atletas</h1>
        <span className="ml-2 bg-slate-100 text-slate-600 text-sm font-medium px-2 py-0.5 rounded-full">
          {athletes?.length ?? 0}
        </span>
      </div>

      {athletes && athletes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
              <Avatar className="h-16 w-16 mx-auto mb-3">
                {athlete.photo_url && <AvatarImage src={athlete.photo_url} alt={athlete.name} />}
                <AvatarFallback className="text-lg">
                  {athlete.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-slate-900 truncate" title={athlete.name}>
                {athlete.name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum atleta cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
