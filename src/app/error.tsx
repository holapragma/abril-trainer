'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Algo se rompió</h1>
      <p className="max-w-sm text-sm leading-relaxed text-text-2">
        No pudimos cargar esta pantalla. Puede ser un problema de conexión — probá de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  )
}
