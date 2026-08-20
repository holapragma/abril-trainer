import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Logo } from '@/components/logo'
import { Skeleton } from '@/components/ui/states'
import { LoginForm } from './login-form'
import { LoginSplash } from './login-splash'

export const metadata: Metadata = { title: 'Entrar · Abril Trainer' }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <LoginSplash />
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-9 text-center">
          <Logo size={64} className="mx-auto mb-5" />
          <h1 className="font-display text-3xl font-bold">Abril Trainer</h1>
          <p className="mt-1.5 text-sm text-text-2">Entrá para gestionar tus alumnos</p>
        </div>

        {/* LoginForm lee ?next= con useSearchParams, así que necesita su propio
            límite de Suspense para que esta página siga siendo prerenderizable. */}
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[70px] w-full" />
      <Skeleton className="h-[70px] w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  )
}
