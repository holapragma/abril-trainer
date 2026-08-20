import { cn } from '@/lib/cn'

/**
 * Isotipo de marca: cuadrado en --color-text con un acento en --color-accent
 * superpuesto arriba a la derecha. Proporción 1:3,2 (radio 10px sobre 32px):
 * mantenerla al escalar.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Abril Trainer"
      className={cn('shrink-0', className)}
    >
      <rect width="32" height="32" rx="10" fill="var(--color-text)" />
      <rect x="18" y="6" width="12" height="12" rx="4" fill="var(--color-accent)" />
    </svg>
  )
}
