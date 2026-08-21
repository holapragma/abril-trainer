import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getBlock, getBlockSessions, getBlocks, groupByWeek } from '@/lib/queries/planning'
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
  const [student, block, sessions, blocks] = await Promise.all([
    getStudent(id),
    getBlock(blockId),
    getBlockSessions(blockId),
    getBlocks(id),
  ])
  if (!student || !block) notFound()

  // Si la lista de bloques redirige acá (un solo bloque activo), volver a ella
  // sería un rebote: se vuelve a la ficha.
  const soloBloque = blocks.length === 1

  const weeks = groupByWeek(sessions, block.total_weeks)

  return (
    <>
      <PageHeader
        title={block.name}
        subtitle={fullName(student)}
        back={soloBloque ? `/alumnos/${id}` : `/alumnos/${id}/entrenamiento`}
        action={<BlockMenu studentId={id} block={block} />}
      />
      <PageBody>
        <WeekList studentId={id} block={block} weeks={weeks} />
      </PageBody>
    </>
  )
}
