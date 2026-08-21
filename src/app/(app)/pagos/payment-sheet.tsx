'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { FilterInput } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { ErrorNote } from '@/components/ui/states'
import { createPayment } from '@/lib/actions/payments'
import { fullName, formatMoney } from '@/lib/format'
import { PAYMENT_METHODS } from '@/lib/constants'
import { addMonths, todayISO } from '@/lib/today'
import type { StudentListItem } from '@/types/domain'

/**
 * Lo que la membresía activa del alumno ya sabe: importe pactado, cuándo vence
 * el próximo ciclo y a qué membresía imputarlo.
 *
 * Existe para el cobro suelto —una clase aparte, un ajuste—: el cobro del ciclo
 * lo abre la propia membresía al asignar el plan y al cobrar el anterior.
 */
export type MembershipHint = {
  membership_id: string
  amount: number
  due_date: string
  plan_name: string | null
}

/** Vencimiento por defecto: dentro de un mes, que es el ciclo habitual. */
function defaultDueDate(): string {
  return addMonths(todayISO(), 1)
}

export function PaymentSheet({
  open,
  students,
  studentId,
  membership,
  onClose,
  onSaved,
}: {
  open: boolean
  students: StudentListItem[]
  studentId?: string
  membership?: MembershipHint | null
  onClose: () => void
  onSaved: () => void
}) {
  const [paid, setPaid] = useState(false)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const formId = 'new-payment'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar pago"
      footer={
        <Button type="submit" form={formId} full disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          setError(null)
          setFieldErrors({})

          startTransition(async () => {
            const res = await createPayment({
              student_id: studentId ?? fd.get('student_id'),
              amount: fd.get('amount'),
              due_date: fd.get('due_date'),
              // Se imputa a la membresía activa cuando la hay: sin esto no se
              // puede saber después cuántos ciclos lleva pagos un alumno.
              membership_id: membership?.membership_id ?? null,
              method: fd.get('method'),
              note: fd.get('note'),
              paid,
            })
            if (res.ok) onSaved()
            else {
              setError(res.error)
              setFieldErrors(res.fieldErrors ?? {})
            }
          })
        }}
      >
        {error && <ErrorNote>{error}</ErrorNote>}

        {membership && (
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-text-2">
            Se imputa a <span className="font-medium text-text">{membership.plan_name ?? 'su plan'}</span>
            {' · '}
            {formatMoney(membership.amount)} por ciclo
          </p>
        )}

        {!studentId && (
          <Field label="Alumno" htmlFor="student_id" required error={fieldErrors.student_id}>
            <div className="space-y-2">
              {/* Con pocos alumnos el desplegable alcanza; pasada la treintena,
                  buscar es más rápido que recorrer la lista con el pulgar. */}
              {students.length > 8 && (
                <FilterInput value={q} onChange={setQ} placeholder="Buscar alumno…" />
              )}
              <Select id="student_id" name="student_id" required defaultValue="">
                <option value="" disabled>
                  Elegí un alumno
                </option>
                {students
                  .filter((s) => fullName(s).toLowerCase().includes(q.trim().toLowerCase()))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {fullName(s)}
                    </option>
                  ))}
              </Select>
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto" htmlFor="amount" required error={fieldErrors.amount}>
            <Input
              id="amount"
              name="amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              required
              placeholder="45000"
              defaultValue={membership?.amount ?? ''}
              autoFocus
            />
          </Field>
          <Field label="Vence el" htmlFor="due_date" required error={fieldErrors.due_date}>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={membership?.due_date ?? defaultDueDate()}
              required
            />
          </Field>
        </div>

        <Field label="Método" htmlFor="method">
          <Select id="method" name="method" defaultValue="Efectivo">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nota" htmlFor="note">
          <Input id="note" name="note" maxLength={300} placeholder="Marzo, clases sueltas…" />
        </Field>

        <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          <span className="text-sm">
            <span className="font-medium">Ya está pagado</span>
            <span className="block text-text-2">Si no, queda pendiente hasta su vencimiento</span>
          </span>
        </label>
      </form>
    </Sheet>
  )
}
