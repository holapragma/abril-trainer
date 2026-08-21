'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { copyBlock, createBlock } from '@/lib/actions/planning'
import { SESSION_LABELS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { todayISO } from '@/lib/today'

export type CopyableBlock = {
  id: string
  name: string
  total_weeks: number
  sessionCount: number
  student: { id: string; first_name: string; last_name: string } | null
}

/** Duraciones típicas: presencial cambia cada 1-2 semanas, virtual cada 4-6. */
const PRESETS = [1, 2, 4, 6, 8, 12]

export function NewBlockButton({
  studentId,
  sessionsPerWeek = 3,
  copiables = [],
}: {
  studentId: string
  /** Sesiones a crear en la semana 1, según lo que el alumno tiene contratado. */
  sessionsPerWeek?: number
  copiables?: CopyableBlock[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [weeks, setWeeks] = useState(4)
  const [perWeek, setPerWeek] = useState(Math.min(Math.max(sessionsPerWeek, 0), 5))
  const [copyFrom, setCopyFrom] = useState<CopyableBlock | null>(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const formId = 'new-block'

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      // Copiar y crear desde cero terminan igual: en el bloque nuevo del alumno.
      const res = copyFrom
        ? await copyBlock({
            block_id: copyFrom.id,
            student_id: studentId,
            name: String(fd.get('name') ?? ''),
            starts_on: String(fd.get('starts_on') ?? ''),
          })
        : await createBlock({
            student_id: studentId,
            name: fd.get('name'),
            goal: fd.get('goal'),
            starts_on: fd.get('starts_on'),
            total_weeks: weeks,
            sessions_per_week: perWeek,
          })

      if (res.ok) {
        setOpen(false)
        router.push(`/alumnos/${studentId}/entrenamiento/${res.data.id}`)
        router.refresh()
      } else {
        setError(res.error)
        setFieldErrors(res.fieldErrors ?? {})
      }
    })
  }

  return (
    <>
      <Button variant="secondary" full onClick={() => setOpen(true)}>
        <Plus size={18} />
        Nuevo bloque
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo bloque"
        description="Un bloque agrupa las semanas de una etapa de entrenamiento."
        footer={
          <Button type="submit" form={formId} full disabled={pending}>
            {pending ? 'Creando…' : copyFrom ? 'Copiar acá' : 'Crear bloque'}
          </Button>
        }
      >
        <form id={formId} onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              key={copyFrom?.id ?? 'nuevo'}
              defaultValue={copyFrom?.name ?? ''}
              required
              maxLength={80}
              placeholder="Bloque 01"
              autoFocus
            />
          </Field>

          {copiables.length > 0 && (
            <Field label="Empezar desde" hint="Copiar una rutina ya armada, y ajustarla">
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setCopyFrom(null)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left text-sm transition-colors',
                    copyFrom === null
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-text-2',
                  )}
                >
                  Desde cero
                </button>

                {copiables.length > 4 && (
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por alumno o bloque…"
                    aria-label="Buscar planificación para copiar"
                  />
                )}

                <div className="max-h-52 space-y-1.5 overflow-y-auto overscroll-contain">
                  {copiables
                    .filter((b) => {
                      const t = q.trim().toLowerCase()
                      if (!t) return true
                      const quien = b.student
                        ? `${b.student.first_name} ${b.student.last_name}`.toLowerCase()
                        : ''
                      return b.name.toLowerCase().includes(t) || quien.includes(t)
                    })
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCopyFrom(b)}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left transition-colors',
                          copyFrom?.id === b.id
                            ? 'border-accent bg-accent-soft'
                            : 'border-border bg-surface',
                        )}
                      >
                        <span className="block truncate text-sm font-medium">{b.name}</span>
                        <span className="block truncate text-xs text-text-2">
                          {b.student ? `${b.student.first_name} ${b.student.last_name} · ` : ''}
                          {b.total_weeks} sem · {b.sessionCount} sesiones
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </Field>
          )}

          {copyFrom ? (
            <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-text-2">
              Se copian las semanas, las sesiones y sus ejercicios con series,
              repeticiones y notas. No viaja nada personal del otro alumno.
            </p>
          ) : (
          <>
          <Field label="Duración" required error={fieldErrors.total_weeks}>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeeks(w)}
                  className={cn(
                    'h-11 rounded-lg border text-sm font-semibold transition-colors',
                    weeks === w
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-text-2',
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-text-3">
              {weeks === 1 ? '1 semana' : `${weeks} semanas`} · presencial suele ser 1-2, virtual 4-6
            </p>
          </Field>

          <Field
            label="Sesiones de la semana 1"
            hint="Se crean vacías, listas para cargarles ejercicios"
          >
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPerWeek(n)}
                  className={cn(
                    'h-11 rounded-lg border text-sm font-semibold transition-colors',
                    perWeek === n
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-text-2',
                  )}
                >
                  {n === 0 ? '—' : n}
                </button>
              ))}
            </div>
            {perWeek > 0 && (
              <p className="mt-1.5 text-xs text-text-3">
                {SESSION_LABELS.slice(0, perWeek).join(' · ')}
              </p>
            )}
          </Field>
          </>
          )}

          <Field label="Empieza el" htmlFor="starts_on" required>
            <Input
              id="starts_on"
              name="starts_on"
              type="date"
              required
              defaultValue={todayISO()}
            />
          </Field>

          {!copyFrom && (
            <Field label="Objetivo" htmlFor="goal">
              <Input id="goal" name="goal" maxLength={200} placeholder="Subir fuerza en básicos" />
            </Field>
          )}
        </form>
      </Sheet>
    </>
  )
}
