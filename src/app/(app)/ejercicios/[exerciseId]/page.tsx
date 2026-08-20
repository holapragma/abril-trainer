import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ExerciseMedia } from '@/components/exercise-media'
import { getExercise, getFavoriteIds } from '@/lib/queries/exercises'
import { exerciseMediaPublicUrl } from '@/lib/media-url'
import { muscleLabel } from '@/lib/constants'
import { FavoriteButton } from './favorite-button'
import { OwnExerciseActions } from './own-exercise-actions'

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>
}) {
  const { exerciseId } = await params
  const [exercise, favorites] = await Promise.all([getExercise(exerciseId), getFavoriteIds()])
  if (!exercise) notFound()

  const isOwn = exercise.owner_id !== null

  return (
    <>
      <PageHeader
        title={exercise.name}
        back="/ejercicios"
        action={<FavoriteButton exerciseId={exercise.id} initial={favorites.has(exercise.id)} />}
      />
      <PageBody className="space-y-4">
        <ExerciseMedia
          url={exerciseMediaPublicUrl(exercise.media_url)}
          alt={exercise.name}
          className="aspect-square w-full"
        />

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{muscleLabel(exercise.primary_muscle)}</Badge>
          <Badge>{exercise.equipment}</Badge>
          <Badge>{exercise.difficulty}</Badge>
          {isOwn && <Badge tone="ok">Propio</Badge>}
        </div>

        {exercise.secondary_muscles.length > 0 && (
          <p className="text-sm text-text-2">
            También trabaja: {exercise.secondary_muscles.map(muscleLabel).join(', ')}
          </p>
        )}

        {exercise.steps.length > 0 && (
          <Card className="p-4">
            <h2 className="font-display mb-3 font-semibold">Cómo se hace</h2>
            <ol className="space-y-3">
              {exercise.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-text-2">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {isOwn && <OwnExerciseActions exercise={exercise} />}
      </PageBody>
    </>
  )
}
