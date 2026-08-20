'use client'

import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { Dumbbell, Star } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { ExerciseMedia } from '@/components/exercise-media'
import { toggleFavorite } from '@/lib/actions/exercises'
import { exerciseMediaPublicUrl } from '@/lib/media-url'
import { muscleLabel } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Exercise } from '@/types/domain'

export function ExerciseGrid({
  exercises,
  favorites,
}: {
  exercises: Exercise[]
  favorites: string[]
}) {
  // Marcar favorito responde al instante: es un gesto que se repite mucho y
  // esperar al servidor se nota.
  const [optimisticFavs, setOptimisticFavs] = useOptimistic(
    new Set(favorites),
    (prev: Set<string>, id: string) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    },
  )
  const [, startTransition] = useTransition()

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={24} />}
        title="Sin resultados"
        body="Probá con otro nombre, cambiá los filtros, o creá un ejercicio propio."
        actionLabel="Crear ejercicio"
        actionHref="/ejercicios/nuevo"
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {exercises.map((e) => {
        const fav = optimisticFavs.has(e.id)
        return (
          <div key={e.id} className="relative">
            <Link
              href={`/ejercicios/${e.id}`}
              className="block overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <ExerciseMedia
                url={exerciseMediaPublicUrl(e.media_url)}
                alt={e.name}
                className="aspect-square w-full rounded-none"
              />
              <div className="p-2.5">
                <p className="line-clamp-2 text-sm leading-snug font-medium">{e.name}</p>
                <p className="mt-0.5 truncate text-xs text-text-2">
                  {muscleLabel(e.primary_muscle)}
                </p>
              </div>
            </Link>

            <button
              type="button"
              aria-label={fav ? 'Quitar de favoritos' : 'Marcar como favorito'}
              aria-pressed={fav}
              onClick={() =>
                startTransition(async () => {
                  setOptimisticFavs(e.id)
                  await toggleFavorite(e.id)
                })
              }
              className="absolute top-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 backdrop-blur-sm"
            >
              <Star
                size={16}
                className={cn(fav ? 'fill-accent text-accent' : 'text-text-3')}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
