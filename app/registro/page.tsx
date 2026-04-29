import { signUp } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function RegistroPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const error = searchParams.error
  const success = searchParams.success === '1'

  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🏓</span>
          <h1 className="text-2xl font-bold text-navy-600 mt-3">Criar Conta</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe seus resultados e histórico</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" /> Cadastro
            </CardTitle>
            <CardDescription>Crie sua conta de atleta</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-semibold text-slate-800">Cadastro realizado!</p>
                <p className="text-sm text-slate-500">
                  Verifique seu e-mail para confirmar a conta. Após confirmação, faça login.
                </p>
                <Link href="/login" className="mt-2 text-sm text-navy-600 font-medium hover:underline">
                  Ir para o login
                </Link>
              </div>
            ) : (
              <form action={signUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" name="name" type="text" placeholder="Seu nome" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" required minLength={6} />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full">Criar conta</Button>

                <p className="text-center text-sm text-slate-500">
                  Já tem conta?{' '}
                  <Link href="/login" className="text-navy-600 font-medium hover:underline">
                    Entrar
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
