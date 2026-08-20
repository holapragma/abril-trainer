import { cn } from '@/lib/cn'

const controlBase =
  'w-full rounded-xl border border-border bg-surface px-3.5 text-text ' +
  'placeholder:text-text-3 transition-colors outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent-soft ' +
  'disabled:opacity-60 aria-[invalid=true]:border-danger'

export function Field({
  label,
  error,
  hint,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-2">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-3">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, 'h-12', className)} {...props} />
}

export function Textarea({
  className,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(controlBase, 'py-3 leading-relaxed', className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, 'h-12 appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  )
}

/**
 * Grupo de opciones tipo segmentos. En un móvil se toca mucho mejor que un
 * <select> para 2-4 opciones, y muestra todo el abanico sin abrir nada.
 */
export function SegmentedField<T extends string>({
  value,
  onChange,
  options,
  name,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  name?: string
}) {
  return (
    <div className="flex gap-1.5 rounded-xl bg-surface-2 p-1.5" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 flex-1 rounded-lg text-sm font-semibold transition-colors',
              selected ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text',
            )}
          >
            {o.label}
          </button>
        )
      })}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
    </div>
  )
}
