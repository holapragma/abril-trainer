import Link from 'next/link'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:brightness-95',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-2',
  ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95',
}

// Todas las alturas ≥ 44px: es el objetivo táctil mínimo cómodo en un teléfono,
// y esta app se usa con prisa entre alumno y alumno.
const sizes: Record<Size, string> = {
  sm: 'h-11 px-3.5 text-sm gap-1.5',
  md: 'h-12 px-5 text-[15px] gap-2',
  lg: 'h-14 px-6 text-base gap-2',
}

// Píldora: botones y chips siempre a radio completo, es la firma del sistema.
const base =
  'inline-flex items-center justify-center rounded-full font-semibold transition-colors ' +
  'select-none outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'disabled:opacity-50 disabled:pointer-events-none'

type CommonProps = {
  variant?: Variant
  size?: Size
  full?: boolean
  className?: string
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  children,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  full,
  className,
  children,
  href,
  ...props
}: CommonProps & { href: string } & Omit<
    React.ComponentProps<typeof Link>,
    'href' | 'className' | 'children'
  >) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  )
}

/** Botón circular de icono. Mantiene los 44px aunque el glifo se vea más chico. */
export function IconButton({
  label,
  className,
  children,
  ...props
}: {
  label: string
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        'text-text-2 transition-colors hover:bg-surface-2 hover:text-text',
        'outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
