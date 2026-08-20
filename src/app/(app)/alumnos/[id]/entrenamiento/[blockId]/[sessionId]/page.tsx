import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getBlock, getSession } from '@/lib/queries/planning'
import { SessionEditor } from './session-editor'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string; sessionId: string }>
}) {
  const { id, blockId, sessionId } = await params
  const [block, session] = await Promise.all([getBlock(blockId), getSession(sessionId)])
  if (!block || !session) notFound()

  return (
    <>
      <PageHeader
        title={session.name || `Sesión ${session.day_label}`}
        subtitle={`${block.name} · Semana ${session.week_number}`}
        back={`/alumnos/${id}/entrenamiento/${blockId}`}
      />
      <PageBody>
        <SessionEditor session={session} studentId={id} blockId={blockId} />
      </PageBody>
    </>
  )
}
