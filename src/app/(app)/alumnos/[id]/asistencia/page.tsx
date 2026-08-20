import { CalendarCheck } from 'lucide-react'
import { PageBody } from '@/components/layout/page-header'
import { StudentHeader } from '../student-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { getStudentAttendance } from '@/lib/queries/classes'
import { ATTENDANCE_STATUS } from '@/lib/constants'
import { formatDateFull, formatTime } from '@/lib/format'

const TONE = {
  presente: 'ok',
  justificado: 'warn',
  ausente: 'danger',
} as const

export default async function AlumnoAsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const history = await getStudentAttendance(id)

  if (history.length === 0) {
    return (
      <>
        <StudentHeader id={id} />
        <PageBody>
          <EmptyState
            icon={<CalendarCheck size={24} />}
            title="Sin registros"
            body="Cuando pases lista en alguna clase donde esté inscrito, va a aparecer acá."
          />
        </PageBody>
      </>
    )
  }

  const presentes = history.filter((h) => h.status === 'presente').length
  const pct = Math.round((presentes / history.length) * 100)

  return (
    <>
      <StudentHeader id={id} />
      <PageBody className="space-y-4">
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">
            Últimas {history.length} clases
          </p>
          <p className="tabular font-display mt-1 text-3xl leading-none font-bold text-ok">{pct}%</p>
          <p className="mt-1 text-sm text-text-2">
            {presentes} presentes de {history.length}
          </p>
        </Card>

        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {history.map((h) => {
            const klass = h.class as unknown as { name: string; start_time: string } | null
            return (
              <li key={h.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{klass?.name ?? 'Clase'}</p>
                  <p className="text-sm text-text-2">
                    {formatDateFull(h.date)}
                    {klass?.start_time ? ` · ${formatTime(klass.start_time)}` : ''}
                  </p>
                </div>
                <Badge tone={TONE[h.status]}>{ATTENDANCE_STATUS[h.status]}</Badge>
              </li>
            )
          })}
        </ul>
      </PageBody>
    </>
  )
}
