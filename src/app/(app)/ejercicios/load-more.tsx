'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'

/**
 * «Cargar más» de la biblioteca.
 *
 * La tanda vive en la URL (?n=), igual que el buscador y los filtros: así el
 * botón de atrás funciona y compartir un enlace muestra lo mismo. Sin scroll
 * infinito a propósito — en un teléfono con mal wifi, un botón explícito dice
 * qué está pasando y no dispara cargas que nadie pidió.
 */
export function LoadMore({ pages, shown }: { pages: number; shown: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function more() {
    const next = new URLSearchParams(params.toString())
    next.set('n', String(pages + 1))
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-2 pt-1">
      <Button variant="secondary" full onClick={more} disabled={pending}>
        {pending ? 'Cargando…' : 'Cargar más'}
      </Button>
      <p className="text-center text-xs text-text-3">{shown} ejercicios a la vista</p>
    </div>
  )
}
