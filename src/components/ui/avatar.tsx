import { cn } from '@/lib/cn'

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
} as const

export function Avatar({
  src,
  initials,
  size = 'md',
  className,
}: {
  src?: string | null
  initials: string
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-accent-soft font-semibold text-accent select-none',
        sizes[size],
        className,
      )}
    >
      {src ? (
        // Storage devuelve URLs firmadas de vida corta; next/image las cachearía
        // con la firma dentro, así que acá conviene un <img> normal.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}
