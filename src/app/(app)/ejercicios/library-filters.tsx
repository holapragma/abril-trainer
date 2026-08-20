'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Chip } from '@/components/ui/misc'
import { MUSCLE_GROUPS } from '@/lib/constants'

export function LibraryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || next.get(key) === value) next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const group = params.get('grupo')

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <Chip selected={params.get('favs') === '1'} onClick={() => setParam('favs', '1')}>
        ★ Favoritos
      </Chip>
      <Chip selected={params.get('propios') === '1'} onClick={() => setParam('propios', '1')}>
        Propios
      </Chip>
      <span className="w-px shrink-0 self-stretch bg-border" aria-hidden />
      <Chip selected={!group} onClick={() => setParam('grupo', null)}>
        Todos
      </Chip>
      {Object.entries(MUSCLE_GROUPS).map(([key, g]) => (
        <Chip key={key} selected={group === key} onClick={() => setParam('grupo', key)}>
          {g.label}
        </Chip>
      ))}
    </div>
  )
}
