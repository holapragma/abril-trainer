import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getClass, getClassRoster, lastOccurrence } from '@/lib/queries/classes'
import { signedAvatarUrls } from '@/lib/storage'
import { formatDateFull, formatTime } from '@/lib/format'
import { weekdayLabel } from '@/lib/constants'
import { AttendanceSheet } from './attendance-sheet'

export default async function AsistenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ fecha?: string }>
}) {
  const { classId } = await params
  const { fecha } = await searchParams

  const klass = await getClass(classId)
  if (!klass) notFound()

  // Sin fecha en la URL, la ocurrencia más reciente de esa clase.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') ? fecha! : lastOccurrence(klass.weekday)

  const roster = await getClassRoster(classId, date)
  const avatars = await signedAvatarUrls(roster.map((r) => r.photo_url))

  return (
    <>
      <PageHeader
        title="Pasar lista"
        subtitle={`${klass.name} · ${weekdayLabel(klass.weekday)} ${formatTime(klass.start_time)}`}
        back={`/clases/${classId}`}
      />
      <PageBody className="space-y-4">
        <p className="text-center text-sm text-text-2">{formatDateFull(date)}</p>
        <AttendanceSheet
          classId={classId}
          date={date}
          rows={roster.map((r) => ({ ...r, avatarUrl: avatars.get(r.photo_url ?? '') ?? null }))}
        />
      </PageBody>
    </>
  )
}
