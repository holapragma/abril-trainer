'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createExercise } from '@/lib/actions/exercises'
import { DIFFICULTIES, EQUIPMENT, MUSCLES, MUSCLE_IDS } from '@/lib/constants'

export function NewExerciseForm() {
  const router = useRouter()
  const [steps, setSteps] = useState<string[]>([''])
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
          const res = await createExercise({
            name: fd.get('name'),
            primary_muscle: fd.get('primary_muscle'),
            equipment: fd.get('equipment'),
            difficulty: fd.get('difficulty'),
            steps: steps.filter((s) => s.trim() !== ''),
          })

          if (res.ok) {
            router.push(`/ejercicios/${res.data.id}`)
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
        <Input id="name" name="name" required maxLength={120} autoFocus placeholder="Sentadilla búlgara" />
      </Field>

      <Field label="Músculo principal" htmlFor="primary_muscle" required error={fieldErrors.primary_muscle}>
        <Select id="primary_muscle" name="primary_muscle" required defaultValue="chest">
          {MUSCLE_IDS.map((m) => (
            <option key={m} value={m}>
              {MUSCLES[m]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Equipamiento" htmlFor="equipment">
          <Select id="equipment" name="equipment" defaultValue="Peso corporal">
            {EQUIPMENT.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dificultad" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue="Intermedio">
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
        {pending ? 'Creando…' : 'Crear ejercicio'}
      </Button>

      <p className="text-center text-xs text-text-3">
        Después vas a poder subirle un vídeo desde su ficha
      </p>
    </form>
  )
}
