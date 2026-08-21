import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getExercise } from '@/lib/queries/exercises'
import { ExerciseForm } from '../../exercise-form'

export const metadata: Metadata = { title: 'Editar ejercicio · Abril Trainer' }

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>
}) {
  const { exerciseId } = await params
  const exercise = await getExercise(exerciseId)
  if (!exercise) notFound()

  // Los 361 del catálogo son de solo lectura: no son de nadie y se comparten
  // entre entrenadoras. Editar es solo para los propios.
  if (!exercise.owner_id) notFound()

  return (
    <>
      <PageHeader title="Editar ejercicio" subtitle={exercise.name} back={`/ejercicios/${exerciseId}`} />
      <PageBody>
        <ExerciseForm exercise={exercise} />
      </PageBody>
    </>
  )
}
