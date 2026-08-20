import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getStudent } from '@/lib/queries/students'
import { fullName } from '@/lib/format'
import { StudentForm } from '../../student-form'
import { DeleteStudent } from './delete-student'

export const metadata: Metadata = { title: 'Editar alumno · Abril Trainer' }

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const student = await getStudent(id)
  if (!student) notFound()

  return (
    <>
      <PageHeader title="Editar" subtitle={fullName(student)} back={`/alumnos/${id}`} />
      <PageBody className="space-y-8">
        <StudentForm student={student} />
        <DeleteStudent id={id} name={fullName(student)} />
      </PageBody>
    </>
  )
}
