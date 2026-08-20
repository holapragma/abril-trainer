'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createClass, updateClass } from '@/lib/actions/classes'
import { WEEKDAYS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Klass } from '@/types/domain'

export function ClassForm({ klass }: { klass?: Klass }) {
  const router = useRouter()
  const [weekday, setWeekday] = useState(klass?.weekday ?? 1)
  const [active, setActive] = useState(klass?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const input = {
          name: fd.get('name'),
          weekday,
          start_time: fd.get('start_time'),
          duration_minutes: fd.get('duration_minutes'),
          capacity: fd.get('capacity'),
          active,
        }

        setError(null)
        setFieldErrors({})

        startTransition(async () => {
          const res = klass ? await updateClass(klass.id, input) : await createClass(input)
          if (res.ok) {
            router.push(klass ? `/clases/${klass.id}` : '/clases')
            router.refresh()
          } else {
            setError(res.error)
            setFieldErrors(res.fieldErrors ?? {})
          }
        })
      }}
    >
      {error && <ErrorNote>{error}</ErrorNote>}

      <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
        <Input id="name" name="name" defaultValue={klass?.name} required maxLength={80} placeholder="Fuerza" autoFocus={!klass} />
      </Field>

      <Field label="Día" required>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setWeekday(d.value)}
              aria-label={d.label}
              aria-pressed={weekday === d.value}
              className={cn(
                'h-11 rounded-lg border text-xs font-semibold transition-colors',
                weekday === d.value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-text-2',
              )}
            >
              {d.short}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora" htmlFor="start_time" required error={fieldErrors.start_time}>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={klass?.start_time?.slice(0, 5) ?? '18:00'}
            required
          />
        </Field>
        <Field label="Duración (min)" htmlFor="duration_minutes" required>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            inputMode="numeric"
            min={15}
            max={300}
            step={15}
            defaultValue={klass?.duration_minutes ?? 60}
            required
          />
        </Field>
      </div>

      <Field
        label="Cupo máximo"
        htmlFor="capacity"
        required
        error={fieldErrors.capacity}
        hint="Grupos chicos: 4 a 6 personas por hora"
      >
        <Input
          id="capacity"
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          defaultValue={klass?.capacity ?? 6}
          required
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 accent-[var(--color-accent)]"
        />
        <span className="text-sm">
          <span className="font-medium">Clase activa</span>
          <span className="block text-text-2">Las inactivas no aparecen en el inicio</span>
        </span>
      </label>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? 'Guardando…' : klass ? 'Guardar' : 'Crear clase'}
      </Button>
    </form>
  )
}
