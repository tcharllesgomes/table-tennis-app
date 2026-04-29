'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const messages: Record<string, string> = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
      'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
    }
    const msg = messages[error.message] ?? `Erro: ${error.message}`
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  redirect('/admin')
}
