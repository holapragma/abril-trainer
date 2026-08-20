'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, SegmentedField, Textarea } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createStudent, updateStudent } from '@/lib/actions/students'
import { formatDateInput } from '@/lib/format'
import type { Enums } from '@/types/database.types'
import type { Student } from '@/types/domain'

/**
 * Alta y edición en dos pasos.
 *
 * Son 10 campos: de una sola vez, en un teléfono, es un muro. El paso 1 tiene
 * lo imprescindible y ya permite guardar; el paso 2 es todo lo que se puede
 * completar después. Crear un alumno tiene que costar tres toques.
 */
export function StudentForm({ student }: { student?: Student }) {
  const router = useRouter()
  const editing = Boolean(student)

  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const [modality, setModality] = useState<Enums<'modality'>>(student?.modality ?? 'presencial')
  const [status, setStatus] = useState<Enums<'student_status'>>(student?.status ?? 'activo')

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const input = {
      first_name: fd.get('first_name'),
      last_name: fd.get('last_name'),
      modality,
      status,
      phone: fd.get('phone'),
      email: fd.get('email'),
      birthdate: fd.get('birthdate'),
      goal: fd.get('goal'),
      notes: fd.get('notes'),
      joined_at: fd.get('joined_at'),
    }

    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const res = student
        ? await updateStudent(student.id, input)
        : await createStudent(input)

      if (!res.ok) {
        setError(res.error)
        setFieldErrors(res.fieldErrors ?? {})
        // Si el fallo es de un campo del paso 1, hay que volver a mostrarlo.
        if (res.fieldErrors?.first_name || res.fieldErrors?.last_name) setStep(1)
        return
      }

      if (student) router.push(`/alumnos/${student.id}`)
      else router.push(`/alumnos/${(res.data as { id: string }).id}`)
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="space-y-5"
    >
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Ambos pasos se mantienen montados: cambiar de paso no puede perder lo
          ya escrito, y el submit lee el formulario entero. */}
      <div className={step === 1 ? 'space-y-4' : 'hidden'}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" htmlFor="first_name" required error={fieldErrors.first_name}>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={student?.first_name}
              autoComplete="given-name"
              autoCapitalize="words"
              required
              maxLength={60}
            />
          </Field>
          <Field label="Apellido" htmlFor="last_name" required error={fieldErrors.last_name}>
            <Input
              id="last_name"
              name="last_name"
              defaultValue={student?.last_name}
              autoComplete="family-name"
              autoCapitalize="words"
              required
              maxLength={60}
            />
          </Field>
        </div>

        <Field label="Modalidad" required>
          <SegmentedField
            value={modality}
            onChange={setModality}
            options={[
              { value: 'presencial', label: 'Presencial' },
              { value: 'virtual', label: 'Virtual' },
            ]}
          />
        </Field>

        {editing && (
          <Field label="Estado">
            <SegmentedField
              value={status}
              onChange={setStatus}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'pausa', label: 'En pausa' },
                { value: 'baja', label: 'Baja' },
              ]}
            />
          </Field>
        )}
      </div>

      <div className={step === 2 ? 'space-y-4' : 'hidden'}>
        <Field label="Teléfono" htmlFor="phone" error={fieldErrors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={student?.phone ?? ''}
            autoComplete="tel"
            maxLength={30}
            placeholder="+54 9 11 ..."
          />
        </Field>

        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={student?.email ?? ''}
            maxLength={120}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nacimiento" htmlFor="birthdate" error={fieldErrors.birthdate}>
            <Input
              id="birthdate"
              name="birthdate"
              type="date"
              defaultValue={formatDateInput(student?.birthdate)}
            />
          </Field>
          <Field label="Fecha de alta" htmlFor="joined_at">
            <Input
              id="joined_at"
              name="joined_at"
              type="date"
              defaultValue={formatDateInput(student?.joined_at ?? new Date())}
            />
          </Field>
        </div>

        <Field label="Objetivo" htmlFor="goal" hint="Qué busca conseguir">
          <Input
            id="goal"
            name="goal"
            defaultValue={student?.goal ?? ''}
            maxLength={200}
            placeholder="Ganar fuerza, preparar un torneo…"
          />
        </Field>

        <Field label="Notas" htmlFor="notes" hint="Privado. Solo lo ves vos.">
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={student?.notes ?? ''}
            maxLength={2000}
            placeholder="Lesiones, preferencias, lo que haga falta recordar…"
          />
        </Field>
      </div>

      {/* Barra de acción al pie: dentro del alcance del pulgar. */}
      <div className="flex gap-2 pt-1">
        {step === 1 ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setStep(2)} className="flex-1">
              Más datos
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? 'Guardando…' : editing ? 'Guardar' : 'Crear alumno'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">
              Atrás
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? 'Guardando…' : editing ? 'Guardar' : 'Crear alumno'}
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-text-3">
        {step === 1 ? 'Con nombre y modalidad ya podés guardar' : 'Paso 2 de 2 · todo opcional'}
      </p>
    </form>
  )
}
