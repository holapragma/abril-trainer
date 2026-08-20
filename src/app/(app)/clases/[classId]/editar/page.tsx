import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getClass } from '@/lib/queries/classes'
import { ClassForm } from '../../class-form'
import { DeleteClass } from './delete-class'

export const metadata: Metadata = { title: 'Editar clase · Abril Trainer' }

export default async function EditarClasePage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const klass = await getClass(classId)
  if (!klass) notFound()

  return (
    <>
      <PageHeader title="Editar clase" subtitle={klass.name} back={`/clases/${classId}`} />
      <PageBody className="space-y-8">
        <ClassForm klass={klass} />
        <DeleteClass id={classId} name={klass.name} />
      </PageBody>
    </>
  )
}
