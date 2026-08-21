'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { clearClassException, setClassException } from '@/lib/actions/classes'
import { formatDateShortEs } from '@/lib/format'
import type { ClassException } from '@/types/domain'

/**
 * Suspender o mover la clase de un día puntual.
 *
 * Antes, un feriado se «resolvía» marcando a todos justificado: la planilla
 * quedaba diciendo que faltaron seis personas a una clase que nunca existió.
 */
export function ClassExceptionControl({
  classId,
  date,
  exception,
}: {
  classId: string
  date: string
  exception: ClassException | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error ?? 'No se pudo guardar')
      }
    })
  }

  // Cuando se está mirando el día AL QUE se movió la clase, no hay nada que
  // suspender acá: la excepción vive en la fecha original.
  const esDestino = exception?.kind === 'movida' && exception.new_date === date

  if (exception) {
    return (
      <div className="space-y-2 rounded-card border border-border bg-surface-2 p-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <p className="text-sm font-medium">
          {exception.kind === 'cancelada'
            ? 'Esta clase está suspendida'
            : esDestino
              ? `Movida desde el ${formatDateShortEs(exception.date)}${
                  exception.new_start_time ? ` · ${exception.new_start_time.slice(0, 5)}` : ''
                }`
              : `Movida al ${formatDateShortEs(exception.new_date ?? date)}${
                  exception.new_start_time ? ` · ${exception.new_start_time.slice(0, 5)}` : ''
                }`}
        </p>
        {exception.reason && <p className="text-sm text-text-2">{exception.reason}</p>}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => clearClassException(classId, exception.date))}
        >
          <Undo2 size={16} />
          Volver a dictarla
        </Button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text"
      >
        <CalendarOff size={16} />
        Suspender o mover esta clase
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Clase del ${formatDateShortEs(date)}`}
        description="Solo este día. La clase semanal sigue igual."
      >
        <div className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              run(() =>
                setClassException({
                  class_id: classId,
                  date,
                  kind: 'cancelada',
                  reason: String(fd.get('reason') ?? ''),
                }),
              )
            }}
          >
            <Field label="Motivo" htmlFor="reason" hint="Opcional. Feriado, lluvia, viaje…">
              <Input id="reason" name="reason" maxLength={120} />
            </Field>
            <Button type="submit" variant="secondary" full disabled={pending}>
              Suspender este día
            </Button>
          </form>

          <form
            className="space-y-3 border-t border-border pt-5"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              run(() =>
                setClassException({
                  class_id: classId,
                  date,
                  kind: 'movida',
                  new_date: String(fd.get('new_date') ?? ''),
                  new_start_time: String(fd.get('new_start_time') ?? '') || null,
                }),
              )
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Se pasa al" htmlFor="new_date" required>
                <Input id="new_date" name="new_date" type="date" defaultValue={date} required />
              </Field>
              <Field label="Hora" htmlFor="new_start_time" hint="Si cambia">
                <Input id="new_start_time" name="new_start_time" type="time" />
              </Field>
            </div>
            <Button type="submit" full disabled={pending}>
              Mover este día
            </Button>
          </form>
        </div>
      </Sheet>
    </>
  )
}
