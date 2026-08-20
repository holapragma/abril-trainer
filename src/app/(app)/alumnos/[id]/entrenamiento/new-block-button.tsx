'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createBlock } from '@/lib/actions/planning'
import { cn } from '@/lib/cn'

/** Duraciones típicas: presencial cambia cada 1-2 semanas, virtual cada 4-6. */
const PRESETS = [1, 2, 4, 6, 8, 12]

export function NewBlockButton({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [weeks, setWeeks] = useState(4)
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
      const res = await createBlock({
        student_id: studentId,
        name: fd.get('name'),
        goal: fd.get('goal'),
        starts_on: fd.get('starts_on'),
        total_weeks: weeks,
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
            {pending ? 'Creando…' : 'Crear bloque'}
          </Button>
        }
      >
        <form id={formId} onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
            <Input id="name" name="name" required maxLength={80} placeholder="Bloque 01" autoFocus />
          </Field>

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

          <Field label="Empieza el" htmlFor="starts_on" required>
            <Input
              id="starts_on"
              name="starts_on"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label="Objetivo" htmlFor="goal">
            <Input id="goal" name="goal" maxLength={200} placeholder="Subir fuerza en básicos" />
          </Field>
        </form>
      </Sheet>
    </>
  )
}
