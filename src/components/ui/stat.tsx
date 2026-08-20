import Link from 'next/link'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent'

const valueTone: Record<Tone, string> = {
  neutral: 'text-text',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  accent: 'text-accent',
}

/** Cifra + etiqueta. La unidad del dashboard. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  href,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: Tone
  href?: string
  className?: string
}) {
  const inner = (
    <>
      <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">{label}</p>
      <p className={cn('tabular font-display mt-1 text-3xl leading-none font-bold', valueTone[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-3">{hint}</p>}
    </>
  )

  const base = 'rounded-card border border-border bg-surface p-4'

  return href ? (
    <Link
      href={href}
      className={cn(base, 'block transition-colors hover:border-border-strong', className)}
    >
      {inner}
    </Link>
  ) : (
    <div className={cn(base, className)}>{inner}</div>
  )
}

