import { cn } from '@/lib/cn'

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-border bg-surface', className)} {...props}>
      {children}
    </div>
  )
}

/** Lista con separadores internos: el patrón dominante de esta app. */
export function CardList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'divide-y divide-border overflow-hidden rounded-card border border-border bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}
