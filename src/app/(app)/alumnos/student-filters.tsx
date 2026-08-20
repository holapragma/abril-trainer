'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Chip } from '@/components/ui/misc'

const FILTERS = [
  { param: 'estado', value: 'activo', label: 'Activos' },
  { param: 'estado', value: 'pausa', label: 'En pausa' },
  { param: 'modalidad', value: 'presencial', label: 'Presencial' },
  { param: 'modalidad', value: 'virtual', label: 'Virtual' },
] as const

export function StudentFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function toggle(param: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (next.get(param) === value) next.delete(param)
    else next.set(param, value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const anyActive = FILTERS.some((f) => params.get(f.param) === f.value)

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <Chip
        selected={!anyActive}
        onClick={() => {
          const next = new URLSearchParams(params.toString())
          next.delete('estado')
          next.delete('modalidad')
          const qs = next.toString()
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        }}
      >
        Todos
      </Chip>
      {FILTERS.map((f) => (
        <Chip
          key={`${f.param}-${f.value}`}
          selected={params.get(f.param) === f.value}
          onClick={() => toggle(f.param, f.value)}
        >
          {f.label}
        </Chip>
      ))}
    </div>
  )
}
