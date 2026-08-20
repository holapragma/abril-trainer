'use client'

import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageBody, PageHeader } from '@/components/layout/page-header'

export default function AppError({
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
    <>
      <PageHeader title="Error" />
      <PageBody>
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-3">
            <WifiOff size={24} />
          </div>
          <h2 className="font-display text-lg font-semibold">No se pudo cargar</h2>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-text-2">
            Puede ser la conexión. Si el gimnasio tiene mal wifi, probá con datos.
          </p>
          <Button onClick={reset} className="mt-5">
            Reintentar
          </Button>
        </div>
      </PageBody>
    </>
  )
}
