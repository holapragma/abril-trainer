import Link from 'next/link'
import { CalendarRange, ChevronRight } from 'lucide-react'
import { PageBody } from '@/components/layout/page-header'
import { StudentHeader } from '../student-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { getBlocks } from '@/lib/queries/planning'
import type { TrainingBlock } from '@/types/domain'
import { formatDate } from '@/lib/format'
import { BLOCK_STATUS } from '@/lib/constants'
import { NewBlockButton } from './new-block-button'

export default async function EntrenamientoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const blocks = await getBlocks(id)

  const activos = blocks.filter((b) => b.status === 'activo')
  const cerrados = blocks.filter((b) => b.status !== 'activo')

  return (
    <>
      <StudentHeader id={id} />
      <PageBody className="space-y-5">
      {blocks.length === 0 ? (
        <>
          <EmptyState
            icon={<CalendarRange size={24} />}
            title="Sin planificación"
            body="Un bloque agrupa las semanas de entrenamiento. Presencial suele ser de 1 o 2 semanas; virtual, de 4 o 6."
          />
          <NewBlockButton studentId={id} />
        </>
      ) : (
        <>
          <section className="space-y-2">
            {activos.map((b) => (
              <BlockCard key={b.id} studentId={id} block={b} />
            ))}
            <NewBlockButton studentId={id} />
          </section>

          {cerrados.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-text-2 uppercase">
                Bloques anteriores
              </h2>
              <div className="space-y-2">
                {cerrados.map((b) => (
                  <BlockCard key={b.id} studentId={id} block={b} muted />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      </PageBody>
    </>
  )
}

function BlockCard({
  studentId,
  block,
  muted,
}: {
  studentId: string
  block: TrainingBlock
  muted?: boolean
}) {
  return (
    <Link
      href={`/alumnos/${studentId}/entrenamiento/${block.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={muted ? 'truncate font-medium text-text-2' : 'truncate font-medium'}>
            {block.name}
          </p>
          {block.status !== 'activo' && <Badge>{BLOCK_STATUS[block.status]}</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-text-2">
          {block.total_weeks} {block.total_weeks === 1 ? 'semana' : 'semanas'} · desde{' '}
          {formatDate(block.starts_on)}
        </p>
        {block.goal && <p className="mt-0.5 truncate text-xs text-text-3">{block.goal}</p>}
      </div>
      <ChevronRight size={18} className="shrink-0 text-text-3" />
    </Link>
  )
}
