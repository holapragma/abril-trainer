import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getBlock, getBlockSessions, groupByWeek } from '@/lib/queries/planning'
import { getStudent } from '@/lib/queries/students'
import { fullName } from '@/lib/format'
import { WeekList } from './week-list'
import { BlockMenu } from './block-menu'

export default async function BlockPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string }>
}) {
  const { id, blockId } = await params
  const [student, block, sessions] = await Promise.all([
    getStudent(id),
    getBlock(blockId),
    getBlockSessions(blockId),
  ])
  if (!student || !block) notFound()

  const weeks = groupByWeek(sessions, block.total_weeks)

  return (
    <>
      <PageHeader
        title={block.name}
        subtitle={fullName(student)}
        back={`/alumnos/${id}/entrenamiento`}
        action={<BlockMenu studentId={id} block={block} />}
      />
      <PageBody>
        <WeekList studentId={id} block={block} weeks={weeks} />
      </PageBody>
    </>
  )
}
