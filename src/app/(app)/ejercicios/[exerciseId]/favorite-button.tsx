'use client'

import { useOptimistic, useTransition } from 'react'
import { Star } from 'lucide-react'
import { IconButton } from '@/components/ui/button'
import { toggleFavorite } from '@/lib/actions/exercises'
import { cn } from '@/lib/cn'

export function FavoriteButton({
  exerciseId,
  initial,
}: {
  exerciseId: string
  initial: boolean
}) {
  const [fav, setFav] = useOptimistic(initial, (prev: boolean) => !prev)
  const [, startTransition] = useTransition()

  return (
    <IconButton
      label={fav ? 'Quitar de favoritos' : 'Marcar como favorito'}
      aria-pressed={fav}
      onClick={() =>
        startTransition(async () => {
          setFav(true)
          await toggleFavorite(exerciseId)
        })
      }
    >
      <Star size={20} className={cn(fav && 'fill-accent text-accent')} />
    </IconButton>
  )
}
