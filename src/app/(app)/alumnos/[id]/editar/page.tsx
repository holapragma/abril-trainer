import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getStudent } from '@/lib/queries/students'
import { signedAvatarUrl } from '@/lib/storage'
import { fullName, initials } from '@/lib/format'
import { StudentForm } from '../../student-form'
import { StudentPhoto } from './student-photo'
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

  const avatar = await signedAvatarUrl(student.photo_url)

  return (
    <>
      <PageHeader title="Editar" subtitle={fullName(student)} back={`/alumnos/${id}`} />
      <PageBody className="space-y-8">
        <StudentPhoto studentId={id} initials={initials(student)} currentUrl={avatar} />
        <StudentForm student={student} />
        <DeleteStudent id={id} name={fullName(student)} />
      </PageBody>
    </>
  )
}
