'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Buscador que escribe en la URL. Estar en la query permite compartir y volver
 * atrás a un resultado, y hace que el filtrado lo resuelva el servidor.
 */
export function SearchInput({
  placeholder = 'Buscar…',
  param = 'q',
}: {
  placeholder?: string
  param?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get(param) ?? '')
  const [, startTransition] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(param, value)
      else next.delete(param)
      const qs = next.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
    // params se omite a propósito: solo se reacciona a lo que escribe el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, param])

  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-3"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'h-12 w-full rounded-xl border border-border bg-surface pr-10 pl-11',
          'text-text placeholder:text-text-3 outline-none',
          'focus:border-accent focus:ring-2 focus:ring-accent-soft',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-text-3 hover:text-text"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface text-text-2 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Filtro en memoria para listas que ya vienen cargadas (inscribir en una clase,
 * elegir alumno para un cobro). No consulta: recorta lo que ya está en pantalla,
 * que con treinta alumnos es la diferencia entre encontrar y hacer scroll.
 */
export function FilterInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
}) {
  return (
    <div className="relative">
      <Search
        size={17}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-3"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="h-12 w-full rounded-xl border border-border bg-surface pr-3 pl-11 text-text placeholder:text-text-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </div>
  )
}
