import Link from 'next/link'
import { CalendarCheck, Dumbbell, Mail, MessageCircle, Phone, Wallet } from 'lucide-react'
import { PageBody } from '@/components/layout/page-header'
import { StudentHeader } from './student-header'
import { Card, CardList } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { getStudent, getStudentOverview } from '@/lib/queries/students'
import { formatDate, formatMoney } from '@/lib/format'
import { notFound } from 'next/navigation'

export default async function StudentSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [student, overview] = await Promise.all([getStudent(id), getStudentOverview(id)])
  if (!student) notFound()

  const { membership, activeBlock, payments, attendance30d, adherencia } = overview
  const pendientes = payments.filter((p) => p.status !== 'pagado')
  const vencidos = pendientes.filter((p) => p.status === 'vencido')

  // El teléfono sin caracteres de formato, para el enlace de WhatsApp.
  const wa = student.phone?.replace(/[^\d]/g, '')

  return (
    <>
      <StudentHeader id={id} />
      <PageBody className="space-y-5">
      {/* Contacto: los dos gestos más frecuentes, a un toque. */}
      {(student.phone || student.email) && (
        <div className="flex gap-2">
          {wa && (
            <ButtonLink
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              <MessageCircle size={17} />
              WhatsApp
            </ButtonLink>
          )}
          {student.phone && (
            <ButtonLink href={`tel:${student.phone}`} variant="secondary" size="sm" className="flex-1">
              <Phone size={17} />
              Llamar
            </ButtonLink>
          )}
          {student.email && (
            <ButtonLink href={`mailto:${student.email}`} variant="secondary" size="sm" className="flex-1">
              <Mail size={17} />
              Email
            </ButtonLink>
          )}
        </div>
      )}

      {/* Plan */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">Plan</p>
            {membership?.plan ? (
              <>
                <p className="font-display mt-1 text-xl font-bold">{membership.plan.name}</p>
                <p className="mt-0.5 text-sm text-text-2">
                  {formatMoney(membership.price)}
                  {membership.plan.sessions_per_week
                    ? ` · ${membership.plan.sessions_per_week}× por semana`
                    : ''}
                </p>
                <p className="mt-0.5 text-xs text-text-3">
                  Desde {formatDate(membership.starts_on)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-text-2">Sin plan asignado</p>
            )}
          </div>
          <ButtonLink href={`/alumnos/${id}/plan`} variant="secondary" size="sm">
            {membership ? 'Cambiar' : 'Asignar'}
          </ButtonLink>
        </div>
      </Card>

      {/* Accesos rápidos */}
      <CardList>
        <Link
          href={`/alumnos/${id}/entrenamiento`}
          className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-2">
            <Dumbbell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Entrenamiento</p>
            <p className="truncate text-sm text-text-2">
              {activeBlock
                ? `${activeBlock.name} · ${activeBlock.total_weeks} semanas`
                : 'Sin planificación activa'}
            </p>
          </div>
          {!activeBlock && <Badge tone="warn">Falta</Badge>}
        </Link>

        <Link
          href={`/alumnos/${id}/asistencia`}
          className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-2">
            <CalendarCheck size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Asistencia</p>
            <p className="text-sm text-text-2">
              {attendance30d.total > 0
                ? `${attendance30d.presente} de ${attendance30d.total} en 30 días`
                : 'Sin registros en 30 días'}
            </p>
            {/* Lo contratado contra lo que vino: el único número que cruza el
                plan con la realidad. Solo aparece si el plan define frecuencia. */}
            {adherencia && (
              <p className="tabular text-xs text-text-3">
                {adherencia.asistidas} de {adherencia.esperadas} sesiones del plan
                {adherencia.ratio < 0.7 && adherencia.esperadas > 0 && ' · viene poco'}
              </p>
            )}
          </div>
        </Link>

        <Link
          href={`/alumnos/${id}/pagos`}
          className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-2">
            <Wallet size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Pagos</p>
            <p className="text-sm text-text-2">
              {pendientes.length === 0 ? 'Al día' : `${pendientes.length} sin pagar`}
            </p>
          </div>
          {vencidos.length > 0 && <Badge tone="danger">{vencidos.length} vencido</Badge>}
        </Link>
      </CardList>

      {/* Notas privadas */}
      {student.notes && (
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">
            Notas · privado
          </p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{student.notes}</p>
        </Card>
      )}

      <p className="text-center text-xs text-text-3">Alumno desde {formatDate(student.joined_at)}</p>
      </PageBody>
    </>
  )
}
