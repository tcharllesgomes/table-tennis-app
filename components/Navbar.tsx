'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/types'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu'
import { Menu, X, Trophy, Users, History, Settings, LogOut, ShieldCheck, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile | null
}

const publicLinks = [
  { href: '/', label: 'Início', icon: Trophy },
  { href: '/historico', label: 'Histórico', icon: History },
]

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role)
  const isAthlete = profile?.role === 'athlete'
  const initials = profile?.name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-40 w-full bg-navy-600 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <span className="text-2xl">🏓</span>
            <span className="hidden sm:block">Tênis de Mesa</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {publicLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAthlete && (
              <Link
                href="/perfil"
                className={cn(
                  'hidden md:block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === '/perfil'
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                Meu Perfil
              </Link>
            )}
            {isAdmin && (
              <>
                <Link
                  href="/atletas"
                  className={cn(
                    'hidden md:block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === '/atletas'
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  Atletas
                </Link>
                <Link href="/admin">
                  <Button size="sm" variant="accent" className="hidden md:flex gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Painel Admin
                  </Button>
                </Link>
              </>
            )}

            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-full">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{profile.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{profile.role.replace('_', ' ')}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {isAthlete && (
                    <DropdownMenuItem asChild>
                      <Link href="/perfil" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" /> Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-navy-600 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Entrar
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 pt-2 border-t border-white/20">
            {publicLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  pathname === href
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {isAthlete && (
              <Link
                href="/perfil"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  pathname === '/perfil'
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/atletas"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  pathname === '/atletas'
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                <Users className="h-4 w-4" />
                Atletas
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-orange-300 hover:text-orange-200 hover:bg-white/10 mt-1"
              >
                <ShieldCheck className="h-4 w-4" />
                Painel Admin
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
