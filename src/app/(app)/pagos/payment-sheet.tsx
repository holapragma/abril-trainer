'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { ErrorNote } from '@/components/ui/states'
import { createPayment } from '@/lib/actions/payments'
import { fullName } from '@/lib/format'
import type { StudentListItem } from '@/types/domain'

/** Vencimiento por defecto: dentro de un mes, que es el ciclo habitual. */
function defaultDueDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function PaymentSheet({
  open,
  students,
  studentId,
  onClose,
  onSaved,
}: {
  open: boolean
  students: StudentListItem[]
  studentId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [paid, setPaid] = useState(false)
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
              membership_id: null,
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

        {!studentId && (
          <Field label="Alumno" htmlFor="student_id" required error={fieldErrors.student_id}>
            <Select id="student_id" name="student_id" required defaultValue="">
              <option value="" disabled>
                Elegí un alumno
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {fullName(s)}
                </option>
              ))}
            </Select>
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
              autoFocus
            />
          </Field>
          <Field label="Vence el" htmlFor="due_date" required error={fieldErrors.due_date}>
            <Input id="due_date" name="due_date" type="date" defaultValue={defaultDueDate()} required />
          </Field>
        </div>

        <Field label="Método" htmlFor="method">
          <Input id="method" name="method" maxLength={40} placeholder="Efectivo, transferencia…" />
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
