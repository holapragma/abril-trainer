'use client'

import { useActionState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { login } from '@/lib/actions/auth'

/**
 * Solo rutas internas. Sin esto, /login?next=https://otro-sitio funciona como
 * redirección abierta: alguien manda ese enlace, Abril entra con su contraseña
 * y termina en una página que no es la suya.
 *
 * Se rechaza también //host y /\host, que el navegador resuelve como absolutas.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [state, formAction, pending] = useActionState(login, null)

  useEffect(() => {
    if (state?.ok) {
      router.replace(safeNext(params.get('next')))
      router.refresh()
    }
  }, [state, router, params])

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors && <ErrorNote>{state.error}</ErrorNote>}

      <Field label="Email" htmlFor="email" error={state?.ok === false ? state.fieldErrors?.email : undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          placeholder="abril@ejemplo.com"
        />
      </Field>

      <Field
        label="Contraseña"
        htmlFor="password"
        error={state?.ok === false ? state.fieldErrors?.password : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
