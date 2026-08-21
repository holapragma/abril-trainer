import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Cabecera de página. `back` es un href, no un router.back(): llegar desde un
 * enlace directo tiene que dejar una salida coherente igual que llegar
 * navegando.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
  sticky = true,
}: {
  title: string
  subtitle?: string
  back?: string
  action?: React.ReactNode
  sticky?: boolean
}) {
  return (
    <header
      className={cn(
        'border-b border-border bg-bg/85 backdrop-blur-md',
        sticky && 'sticky top-0 z-30',
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-3">
        {back && (
          <Link
            href={back}
            aria-label="Volver"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text"
          >
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-xl leading-tight font-bold">{title}</h1>
          {subtitle && <p className="truncate text-sm text-text-2">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
    </header>
  )
}

/**
 * Contenedor de contenido: ancho de lectura, aire y hueco para la nav inferior.
 *
 * El ancho máximo se mantiene igual en escritorio a propósito: son listas y
 * formularios de una columna, y estirarlos a 1400px no agrega información,
 * solo obliga a barrer la pantalla con la vista. Lo que cambia es el relleno
 * inferior, que existía solo para no quedar tapado por la barra del teléfono.
 */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-4 pb-28 lg:pb-10', className)}>{children}</div>
  )
}
