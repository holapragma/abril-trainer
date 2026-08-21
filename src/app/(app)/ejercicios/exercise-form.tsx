'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createExercise, updateExercise } from '@/lib/actions/exercises'
import { DIFFICULTIES, EQUIPMENT, MUSCLES, MUSCLE_IDS } from '@/lib/constants'
import type { Exercise } from '@/types/domain'

/**
 * Alta y edición de un ejercicio propio. Mismo formulario para las dos cosas,
 * como en el alta de alumno: un ejercicio mal cargado se corrige, no se borra
 * y se vuelve a escribir.
 */
export function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const router = useRouter()
  const editing = Boolean(exercise)
  const [steps, setSteps] = useState<string[]>(
    exercise?.steps.length ? exercise.steps : [''],
  )
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setFieldErrors({})

        startTransition(async () => {
          const input = {
            name: fd.get('name'),
            primary_muscle: fd.get('primary_muscle'),
            equipment: fd.get('equipment'),
            difficulty: fd.get('difficulty'),
            steps: steps.filter((s) => s.trim() !== ''),
          }

          const res = exercise
            ? await updateExercise(exercise.id, input)
            : await createExercise(input)

          if (res.ok) {
            router.push(`/ejercicios/${exercise ? exercise.id : (res.data as { id: string }).id}`)
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
        <Input
          id="name"
          name="name"
          defaultValue={exercise?.name}
          required
          maxLength={120}
          autoFocus={!editing}
          placeholder="Sentadilla búlgara"
        />
      </Field>

      <Field label="Músculo principal" htmlFor="primary_muscle" required error={fieldErrors.primary_muscle}>
        <Select
          id="primary_muscle"
          name="primary_muscle"
          required
          defaultValue={exercise?.primary_muscle ?? 'chest'}
        >
          {MUSCLE_IDS.map((m) => (
            <option key={m} value={m}>
              {MUSCLES[m]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Equipamiento" htmlFor="equipment">
          <Select id="equipment" name="equipment" defaultValue={exercise?.equipment ?? 'Peso corporal'}>
            {EQUIPMENT.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dificultad" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue={exercise?.difficulty ?? 'Intermedio'}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text-2">Pasos</p>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-text-2">
              {i + 1}
            </span>
            <Input
              value={step}
              onChange={(e) => setSteps(steps.map((s, j) => (j === i ? e.target.value : s)))}
              maxLength={500}
              placeholder="Describí el paso…"
            />
            {steps.length > 1 && (
              <IconButton
                label={`Quitar paso ${i + 1}`}
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                className="h-9 w-9"
              >
                <X size={16} />
              </IconButton>
            )}
          </div>
        ))}
        {steps.length < 12 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSteps([...steps, ''])}
          >
            <Plus size={16} />
            Agregar paso
          </Button>
        )}
      </div>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? 'Guardando…' : editing ? 'Guardar' : 'Crear ejercicio'}
      </Button>

      {!editing && (
        <p className="text-center text-xs text-text-3">
          Después vas a poder subirle un vídeo desde su ficha
        </p>
      )}
    </form>
  )
}
