import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Toaster } from '@/components/ui/toaster'
import { ToastProvider } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tênis de Mesa - Campeonato',
  description: 'Sistema de gerenciamento de campeonatos de tênis de mesa',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ToastProvider>
          <Navbar profile={profile} />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
          <footer className="bg-navy-600 text-white/60 text-center text-xs py-4 mt-8">
            🏓 Campeonato de Tênis de Mesa
          </footer>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  )
}
