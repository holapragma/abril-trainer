import { notFound } from 'next/navigation'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import {
  getClass,
  getClassExceptions,
  getClassRoster,
  getExceptionFor,
  lastOccurrence,
} from '@/lib/queries/classes'
import { todayISO, weekdayOf } from '@/lib/today'
import { signedAvatarUrls } from '@/lib/storage'
import { formatDateFull, formatTime } from '@/lib/format'
import { weekdayLabel } from '@/lib/constants'
import { AttendanceSheet } from './attendance-sheet'
import { ClassExceptionControl } from './class-exception'

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

  // La fecha viene de la URL, así que no se confía en ella. Vale si cae en el
  // día de la clase, o si es el destino de una ocurrencia movida — una clase
  // que se pasó al jueves se dicta un jueves aunque la clase sea de los martes.
  // Y nunca puede ser futura. Cualquier otra cosa cae en la última ocurrencia:
  // es un parámetro corregido, no un fallo que Abril tenga que resolver.
  const movidas = await getClassExceptions(classId)
  const destinos = new Set(
    movidas.filter((x) => x.kind === 'movida' && x.new_date).map((x) => x.new_date as string),
  )
  const date = isValidOccurrence(fecha, klass.weekday, destinos)
    ? fecha
    : lastOccurrence(klass.weekday)

  const [roster, exception] = await Promise.all([
    getClassRoster(classId, date),
    getExceptionFor(classId, date),
  ])
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

        <ClassExceptionControl classId={classId} date={date} exception={exception} />

        <AttendanceSheet
          classId={classId}
          date={date}
          rows={roster.map((r) => ({ ...r, avatarUrl: avatars.get(r.photo_url ?? '') ?? null }))}
        />
      </PageBody>
    </>
  )
}

/**
 * Una fecha de asistencia válida: formato, no futura, y o bien cae en el día de
 * la clase o bien es adonde se movió una ocurrencia.
 */
function isValidOccurrence(
  date: string | undefined,
  weekday: number,
  destinosMovidos: Set<string>,
): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (date > todayISO()) return false
  return weekdayOf(date) === weekday || destinosMovidos.has(date)
}
