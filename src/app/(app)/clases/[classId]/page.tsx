import { notFound } from 'next/navigation'
import { ClipboardCheck, Pencil } from 'lucide-react'
import Link from 'next/link'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getClass, getClassRoster, lastOccurrence } from '@/lib/queries/classes'
import { getStudents } from '@/lib/queries/students'
import { signedAvatarUrls } from '@/lib/storage'
import { formatTime } from '@/lib/format'
import { weekdayLabel } from '@/lib/constants'
import { Roster } from './roster'

export default async function ClasePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const klass = await getClass(classId)
  if (!klass) notFound()

  const date = lastOccurrence(klass.weekday)
  const [roster, allStudents] = await Promise.all([
    getClassRoster(classId, date),
    getStudents({ status: 'activo' }),
  ])
  const avatars = await signedAvatarUrls(roster.map((r) => r.photo_url))

  return (
    <>
      <PageHeader
        title={klass.name}
        subtitle={`${weekdayLabel(klass.weekday)} ${formatTime(klass.start_time)} · ${klass.duration_minutes} min`}
        back="/clases"
        action={
          <Link
            href={`/clases/${classId}/editar`}
            aria-label="Editar clase"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text"
          >
            <Pencil size={18} />
          </Link>
        }
      />
      <PageBody className="space-y-4">
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">Inscritos</p>
            <p className="tabular font-display mt-1 text-3xl leading-none font-bold">
              {roster.length}
              <span className="text-xl text-text-3">/{klass.capacity}</span>
            </p>
          </div>
          <ButtonLink href={`/clases/${classId}/asistencia`} size="sm">
            <ClipboardCheck size={17} />
            Pasar lista
          </ButtonLink>
        </Card>

        <Roster
          classId={classId}
          capacity={klass.capacity}
          roster={roster.map((r) => ({ ...r, avatarUrl: avatars.get(r.photo_url ?? '') ?? null }))}
          candidates={allStudents.filter((s) => !roster.some((r) => r.student_id === s.id))}
        />
      </PageBody>
    </>
  )
}
