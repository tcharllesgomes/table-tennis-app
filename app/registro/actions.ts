'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

function fail(msg: string): never {
  redirect(`/registro?error=${encodeURIComponent(msg)}`)
}

export async function signUp(formData: FormData) {
  const name = (formData.get('name') as string ?? '').trim()
  const email = (formData.get('email') as string ?? '').trim()
  const password = (formData.get('password') as string ?? '')
  const confirmPassword = (formData.get('confirmPassword') as string ?? '')

  if (!name) fail('O nome é obrigatório.')
  if (name.length < 2) fail('O nome deve ter pelo menos 2 caracteres.')
  if (!email) fail('O e-mail é obrigatório.')
  if (!password) fail('A senha é obrigatória.')
  if (password.length < 6) fail('A senha deve ter pelo menos 6 caracteres.')
  if (password !== confirmPassword) fail('As senhas não coincidem.')

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) {
    const messages: Record<string, string> = {
      'User already registered': 'Este e-mail já está cadastrado.',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    }
    const msg = messages[error.message] ?? `Erro: ${error.message}`
    redirect(`/registro?error=${encodeURIComponent(msg)}`)
  }

  // Supabase retorna identities vazio quando o e-mail já existe e confirmação está ativada
  if (data.user?.identities?.length === 0) {
    redirect(`/registro?error=${encodeURIComponent('Este e-mail já está cadastrado.')}`)
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Tênis de Mesa <onboarding@resend.dev>',
      to: 'cng.tcharlles@gmail.com',
      subject: 'Novo cadastro no app',
      html: `<p><strong>${name}</strong> (${email}) acabou de criar uma conta.</p>`,
    })
  }

  redirect('/registro?success=1')
}
