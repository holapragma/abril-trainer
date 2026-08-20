import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { NewExerciseForm } from './new-exercise-form'

export const metadata: Metadata = { title: 'Nuevo ejercicio · Abril Trainer' }

export default function NuevoEjercicioPage() {
  return (
    <>
      <PageHeader title="Nuevo ejercicio" back="/ejercicios" />
      <PageBody>
        <NewExerciseForm />
      </PageBody>
    </>
  )
}
