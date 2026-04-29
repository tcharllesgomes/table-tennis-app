import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Trophy, Users, UserCog } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/')

  const isSuperAdmin = profile.role === 'super_admin'

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/torneios', label: 'Campeonatos', icon: Trophy },
    { href: '/admin/atletas', label: 'Atletas', icon: Users },
    ...(isSuperAdmin ? [{ href: '/admin/admins', label: 'Administradores', icon: UserCog }] : []),
  ]

  return (
    <div className="flex min-h-[calc(100vh-128px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-800 shrink-0 hidden md:block">
        <div className="p-4">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Admin</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-20 left-0 w-56 p-4 border-t border-white/10">
          <p className="text-white/50 text-xs truncate">{profile.name}</p>
          <p className="text-white/30 text-xs capitalize">{profile.role.replace('_', ' ')}</p>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden w-full fixed bottom-0 left-0 z-30 bg-navy-800 flex border-t border-white/10">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center py-2 text-white/60 hover:text-white text-xs gap-1"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:block">{label}</span>
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
