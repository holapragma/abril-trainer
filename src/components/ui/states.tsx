import { cn } from '@/lib/cn'
import { ButtonLink } from './button'

/**
 * Estado vacío. Cada lista escribe el suyo: un genérico de «no hay datos» no
 * le dice a nadie qué hacer a continuación.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  actionHref,
  className,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  actionLabel?: string
  actionHref?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-3">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-text-2">{body}</p>}
      {actionLabel && actionHref && (
        <ButtonLink href={actionHref} className="mt-5">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />
}

/** Esqueleto de una lista de filas: el loading.tsx más frecuente de la app. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Mensaje de error dentro de una tarjeta, para fallos parciales de una sección. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">{children}</p>
  )
}
