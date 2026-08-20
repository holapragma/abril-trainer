import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { StudentForm } from '../student-form'

export const metadata: Metadata = { title: 'Nuevo alumno · Abril Trainer' }

export default function NuevoAlumnoPage() {
  return (
    <>
      <PageHeader title="Nuevo alumno" back="/alumnos" />
      <PageBody>
        <StudentForm />
      </PageBody>
    </>
  )
}
