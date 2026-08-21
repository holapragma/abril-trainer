import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { getClass, getClassRoster, lastOccurrence } from '@/lib/queries/classes'
import { todayISO, weekdayOf } from '@/lib/today'
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

  // La fecha viene de la URL, así que no se confía en ella: tiene que ser una
  // ocurrencia real de esta clase (mismo día de la semana) y no puede ser
  // futura. Cualquier otra cosa cae en la última ocurrencia, sin pantalla de
  // error: es un parámetro corregido, no un fallo que Abril tenga que resolver.
  const date = isValidOccurrence(fecha, klass.weekday) ? fecha : lastOccurrence(klass.weekday)

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

/** Una fecha de asistencia válida: formato, día de la semana de la clase y no futura. */
function isValidOccurrence(date: string | undefined, weekday: number): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (date > todayISO()) return false
  return weekdayOf(date) === weekday
}
