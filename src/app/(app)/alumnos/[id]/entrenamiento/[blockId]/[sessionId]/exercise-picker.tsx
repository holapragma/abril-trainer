'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Chip } from '@/components/ui/misc'
import { ErrorNote, Skeleton } from '@/components/ui/states'
import { createClient } from '@/lib/supabase/client'
import { MUSCLE_GROUPS, muscleLabel } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { pluralize } from '@/lib/format'

type PickerExercise = {
  id: string
  name: string
  primary_muscle: string
  equipment: string
  owner_id: string | null
}

const GROUP_KEYS = Object.keys(MUSCLE_GROUPS)

/**
 * Selector de ejercicios de la biblioteca.
 *
 * Se pueden marcar varios y agregarlos de una: armando una sesión se eligen
 * cinco o seis seguidos, y confirmar de a uno sería seis veces el trabajo.
 * Los favoritos van primero porque Abril repite un núcleo pequeño de ejercicios.
 */
export function ExercisePicker({
  open,
  onClose,
  onConfirm,
  alreadyIn,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (ids: string[]) => void
  alreadyIn: string[]
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [favsOnly, setFavsOnly] = useState(false)
  const [items, setItems] = useState<PickerExercise[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const already = new Set(alreadyIn)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    let query = supabase
      .from('exercises')
      .select('id, name, primary_muscle, equipment, owner_id')
      .order('name')
      .limit(60)

    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`)
    if (group) {
      const muscles = MUSCLE_GROUPS[group]?.muscles ?? []
      query = query.in('primary_muscle', [...muscles])
    }

    const { data, error } = await query
    if (error) {
      console.error('ExercisePicker:', error.message)
      setError('No se pudo cargar la biblioteca')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [q, group])

  // Favoritos: se cargan una vez al abrir.
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('exercise_favorites')
      .select('exercise_id')
      .then(({ data }) => setFavorites(new Set((data ?? []).map((f) => f.exercise_id))))
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(load, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [open, load, q])

  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setQ('')
      setGroup(null)
      setFavsOnly(false)
    }
  }, [open])

  const visible = favsOnly ? items.filter((e) => favorites.has(e.id)) : items
  const ordered = [...visible].sort((a, b) => {
    const fa = favorites.has(a.id) ? 0 : 1
    const fb = favorites.has(b.id) ? 0 : 1
    return fa !== fb ? fa - fb : a.name.localeCompare(b.name, 'es')
  })

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar ejercicios"
      description="Podés elegir varios y agregarlos juntos"
      className="sm:max-w-xl"
      footer={
        <Button full disabled={selected.size === 0} onClick={() => onConfirm([...selected])}>
          {selected.size === 0
            ? 'Elegí al menos uno'
            : `Agregar ${pluralize(selected.size, 'ejercicio', 'ejercicios')}`}
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-3"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio…"
            aria-label="Buscar ejercicio"
            autoFocus
            className="h-12 w-full rounded-xl border border-border bg-surface pr-3 pl-11 text-text placeholder:text-text-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip selected={favsOnly} onClick={() => setFavsOnly((v) => !v)}>
            ★ Favoritos
          </Chip>
          <Chip selected={group === null} onClick={() => setGroup(null)}>
            Todos
          </Chip>
          {GROUP_KEYS.map((k) => (
            <Chip key={k} selected={group === k} onClick={() => setGroup(group === k ? null : k)}>
              {MUSCLE_GROUPS[k]!.label}
            </Chip>
          ))}
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-2">
            {favsOnly ? 'Todavía no marcaste favoritos.' : 'Sin resultados.'}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {ordered.map((e) => {
              const isIn = already.has(e.id)
              const isSel = selected.has(e.id)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => !isIn && toggle(e.id)}
                    disabled={isIn}
                    className={cn(
                      'flex w-full items-center gap-3 p-3 text-left transition-colors',
                      isIn ? 'opacity-45' : 'hover:bg-surface-2',
                      isSel && 'bg-accent-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                        isSel ? 'border-accent bg-accent text-on-accent' : 'border-border-strong',
                      )}
                    >
                      {isSel && <Check size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{e.name}</span>
                        {favorites.has(e.id) && (
                          <Star size={13} className="shrink-0 fill-accent text-accent" />
                        )}
                      </span>
                      <span className="block truncate text-sm text-text-2">
                        {muscleLabel(e.primary_muscle)} · {e.equipment}
                        {e.owner_id && ' · propio'}
                      </span>
                    </span>
                    {isIn && <span className="shrink-0 text-xs text-text-3">ya está</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
