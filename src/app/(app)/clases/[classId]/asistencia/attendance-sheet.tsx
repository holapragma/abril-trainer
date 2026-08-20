'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, CircleSlash, Minus, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorNote } from '@/components/ui/states'
import { markAllPresent, markAttendance } from '@/lib/actions/classes'
import { addDays, isToday, todayISO } from '@/lib/today'
import { formatDateShortEs, fullName, initials } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { AttendanceRow } from '@/types/domain'
import type { Enums } from '@/types/database.types'

type Row = AttendanceRow & { avatarUrl: string | null }
type Status = Enums<'abril_trainer_attendance_status'>

/**
 * Pasar lista.
 *
 * Es la acción más sensible al momento de toda la app: Abril la usa de pie,
 * con prisa, mientras la gente entra. Por eso responde al instante con
 * useOptimistic y sincroniza detrás — y por eso los objetivos táctiles son
 * generosos.
 */
export function AttendanceSheet({
  classId,
  date,
  rows,
}: {
  classId: string
  date: string
  rows: Row[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [marks, setMark] = useOptimistic(
    new Map(rows.map((r) => [r.student_id, r.status])),
    (prev: Map<string, Status | null>, next: { id: string; status: Status | null }) => {
      const m = new Map(prev)
      m.set(next.id, next.status)
      return m
    },
  )

  function set(studentId: string, status: Status | null) {
    setError(null)
    startTransition(async () => {
      setMark({ id: studentId, status })
      const res = await markAttendance(classId, studentId, date, status)
      if (!res.ok) {
        setError(res.error)
        router.refresh()
      }
    })
  }

  const sinMarcar = rows.filter((r) => !marks.get(r.student_id))
  const presentes = rows.filter((r) => marks.get(r.student_id) === 'presente').length

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="Nadie inscrito"
        body="Inscribí alumnos en la clase para poder pasar lista."
        actionLabel="Ver clase"
        actionHref={`/clases/${classId}`}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      <DateNav date={date} classId={classId} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-2">
          <span className="tabular font-semibold text-text">{presentes}</span> de {rows.length}{' '}
          presentes
        </p>
        {sinMarcar.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              startTransition(async () => {
                for (const r of sinMarcar) setMark({ id: r.student_id, status: 'presente' })
                const res = await markAllPresent(
                  classId,
                  sinMarcar.map((r) => r.student_id),
                  date,
                )
                if (!res.ok) setError(res.error)
                router.refresh()
              })
            }
          >
            Marcar todos
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {rows.map((r) => {
          const status = marks.get(r.student_id) ?? null
          return (
            <li key={r.student_id} className="flex items-center gap-3 p-3">
              <Avatar src={r.avatarUrl} initials={initials(r)} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{fullName(r)}</span>

              <div className="flex shrink-0 gap-1">
                <StatusButton
                  label="Presente"
                  active={status === 'presente'}
                  tone="ok"
                  onClick={() => set(r.student_id, status === 'presente' ? null : 'presente')}
                >
                  <Check size={18} />
                </StatusButton>
                <StatusButton
                  label="Justificado"
                  active={status === 'justificado'}
                  tone="warn"
                  onClick={() => set(r.student_id, status === 'justificado' ? null : 'justificado')}
                >
                  <CircleSlash size={17} />
                </StatusButton>
                <StatusButton
                  label="Ausente"
                  active={status === 'ausente'}
                  tone="danger"
                  onClick={() => set(r.student_id, status === 'ausente' ? null : 'ausente')}
                >
                  <Minus size={18} />
                </StatusButton>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-center text-xs text-text-3">
        Tocá de nuevo para desmarcar. Se guarda solo.
      </p>
    </div>
  )
}

function StatusButton({
  label,
  active,
  tone,
  onClick,
  children,
}: {
  label: string
  active: boolean
  tone: 'ok' | 'warn' | 'danger'
  onClick: () => void
  children: React.ReactNode
}) {
  const tones = {
    ok: 'bg-ok text-white border-ok',
    warn: 'bg-warn text-white border-warn',
    danger: 'bg-danger text-white border-danger',
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
        active ? tones[tone] : 'border-border bg-surface text-text-3 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

/** Navega a la ocurrencia anterior o siguiente de la misma clase semanal. */
function DateNav({ date, classId }: { date: string; classId: string }) {
  const router = useRouter()

  function shift(weeks: number) {
    router.push(`/clases/${classId}/asistencia?fecha=${addDays(date, weeks * 7)}`)
  }

  const isFuture = date > todayISO()

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-1">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Semana anterior"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-2 hover:bg-surface hover:text-text"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium">{isToday(date) ? 'Hoy' : formatDateShortEs(date)}</span>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={isFuture}
        aria-label="Semana siguiente"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-2 hover:bg-surface hover:text-text disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
