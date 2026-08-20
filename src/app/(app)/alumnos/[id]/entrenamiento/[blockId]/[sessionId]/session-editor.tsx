'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Confirm } from '@/components/ui/confirm'
import { Field, Input, Textarea } from '@/components/ui/field'
import { EmptyState, ErrorNote } from '@/components/ui/states'
import {
  addExercisesToSession,
  deleteSession,
  removeSessionExercise,
  swapSessionExercises,
  updateSession,
  updateSessionExercise,
} from '@/lib/actions/planning'
import { muscleLabel } from '@/lib/constants'
import { prescription } from '@/lib/format'
import type { SessionExerciseWithExercise, SessionWithExercises } from '@/types/domain'
import { ExercisePicker } from './exercise-picker'

/**
 * Editor de sesión.
 *
 * Regla de oro: editar un ejercicio NO cambia de pantalla. Se abre un panel
 * sobre la lista, porque perder de vista la sesión entera mientras se ajusta una
 * serie es lo que hace lentas a estas apps.
 */
export function SessionEditor({
  session,
  studentId,
  blockId,
}: {
  session: SessionWithExercises
  studentId: string
  blockId: string
}) {
  const router = useRouter()
  const path = `/alumnos/${studentId}/entrenamiento/${blockId}/${session.id}`

  const [editing, setEditing] = useState<SessionExerciseWithExercise | null>(null)
  const [picking, setPicking] = useState(false)
  const [editingSession, setEditingSession] = useState(false)
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false)
  const [removing, setRemoving] = useState<SessionExerciseWithExercise | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const items = session.session_exercises

  function move(index: number, dir: -1 | 1) {
    const a = items[index]
    const b = items[index + dir]
    if (!a || !b) return
    setError(null)
    startTransition(async () => {
      const res = await swapSessionExercises(
        { id: a.id, order_index: a.order_index },
        { id: b.id, order_index: b.order_index },
        path,
      )
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      {items.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="Sesión vacía"
          body="Agregá los ejercicios desde la biblioteca y definí series, repeticiones y descanso."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2 p-3">
              {/* Reordenar con flechas: arrastrar dentro de una lista con scroll,
                  en un navegador móvil, es frágil y poco accesible. */}
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || pending}
                  aria-label="Subir ejercicio"
                  className="flex h-7 w-7 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text disabled:opacity-25"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1 || pending}
                  aria-label="Bajar ejercicio"
                  className="flex h-7 w-7 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text disabled:opacity-25"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setEditing(item)}
                className="min-w-0 flex-1 py-1 text-left"
              >
                <p className="truncate font-medium">{item.exercise?.name ?? 'Ejercicio'}</p>
                <p className="tabular truncate text-sm text-text-2">
                  {prescription(item) || 'Sin prescripción'}
                </p>
                {item.notes && <p className="truncate text-xs text-text-3">{item.notes}</p>}
              </button>

              <IconButton label="Editar" onClick={() => setEditing(item)} className="h-9 w-9">
                <Pencil size={16} />
              </IconButton>
              <IconButton
                label="Quitar"
                onClick={() => setRemoving(item)}
                className="h-9 w-9 hover:text-danger"
              >
                <Trash2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" full onClick={() => setPicking(true)}>
        <Plus size={18} />
        Agregar ejercicio
      </Button>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={() => setEditingSession(true)}>
          Renombrar sesión
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-danger"
          onClick={() => setConfirmDeleteSession(true)}
        >
          Eliminar sesión
        </Button>
      </div>

      {/* Editar un ejercicio, sobre la lista */}
      <ExerciseSheet
        key={editing?.id ?? 'none'}
        item={editing}
        path={path}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          router.refresh()
        }}
      />

      {/* Elegir ejercicios de la biblioteca */}
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        alreadyIn={items.map((i) => i.exercise_id)}
        onConfirm={(ids) => {
          setError(null)
          startTransition(async () => {
            const res = await addExercisesToSession(session.id, ids, path)
            setPicking(false)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }}
      />

      {/* Renombrar sesión */}
      <Sheet
        open={editingSession}
        onClose={() => setEditingSession(false)}
        title="Sesión"
        footer={
          <Button type="submit" form="edit-session" full disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        }
      >
        <form
          id="edit-session"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await updateSession(session.id, path, {
                day_label: String(fd.get('day_label') ?? ''),
                name: (fd.get('name') as string) || null,
                notes: (fd.get('notes') as string) || null,
              })
              if (res.ok) {
                setEditingSession(false)
                router.refresh()
              } else setError(res.error)
            })
          }}
        >
          <Field label="Etiqueta" htmlFor="day_label" required>
            <Input id="day_label" name="day_label" defaultValue={session.day_label} maxLength={24} required />
          </Field>
          <Field label="Nombre" htmlFor="name" hint="Opcional: «Empuje», «Tren inferior»…">
            <Input id="name" name="name" defaultValue={session.name ?? ''} maxLength={80} />
          </Field>
          <Field label="Notas de la sesión" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={session.notes ?? ''} maxLength={500} />
          </Field>
        </form>
      </Sheet>

      <Confirm
        open={removing !== null}
        title="¿Quitar ejercicio?"
        body={removing?.exercise?.name ?? undefined}
        confirmLabel="Quitar"
        pending={pending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          startTransition(async () => {
            const res = await removeSessionExercise(removing.id, path)
            setRemoving(null)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }}
      />

      <Confirm
        open={confirmDeleteSession}
        title="¿Eliminar la sesión?"
        body="Se borran sus ejercicios. No se puede deshacer."
        pending={pending}
        onCancel={() => setConfirmDeleteSession(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteSession(session.id, path)
            setConfirmDeleteSession(false)
            if (res.ok) {
              router.push(`/alumnos/${studentId}/entrenamiento/${blockId}`)
              router.refresh()
            } else setError(res.error)
          })
        }
      />
    </div>
  )
}

/** Panel de edición de un ejercicio de la sesión. */
function ExerciseSheet({
  item,
  path,
  onClose,
  onSaved,
}: {
  item: SessionExerciseWithExercise | null
  path: string
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={item?.exercise?.name ?? 'Ejercicio'}
      description={item?.exercise ? muscleLabel(item.exercise.primary_muscle) : undefined}
      footer={
        <Button type="submit" form="edit-se" full disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      }
    >
      {item && (
        <form
          id="edit-se"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            setError(null)
            startTransition(async () => {
              const res = await updateSessionExercise(
                item.id,
                {
                  session_id: item.session_id,
                  exercise_id: item.exercise_id,
                  sets: fd.get('sets'),
                  reps: fd.get('reps'),
                  load: fd.get('load'),
                  rest_seconds: fd.get('rest_seconds'),
                  time_seconds: fd.get('time_seconds'),
                  tempo: fd.get('tempo'),
                  notes: fd.get('notes'),
                },
                path,
              )
              if (res.ok) onSaved()
              else setError(res.error)
            })
          }}
        >
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Series" htmlFor="sets">
              <Input
                id="sets"
                name="sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                defaultValue={item.sets ?? ''}
              />
            </Field>
            {/* Texto, no número: acá va «8-10», «AMRAP», «máximas». */}
            <Field label="Repeticiones" htmlFor="reps">
              <Input id="reps" name="reps" defaultValue={item.reps ?? ''} maxLength={24} placeholder="8-10" />
            </Field>
          </div>

          <Field label="Carga" htmlFor="load" hint="Kilos, porcentaje, RPE o peso corporal">
            <Input id="load" name="load" defaultValue={item.load ?? ''} maxLength={24} placeholder="60kg · 70% · RPE 8" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Descanso (seg)" htmlFor="rest_seconds">
              <Input
                id="rest_seconds"
                name="rest_seconds"
                type="number"
                inputMode="numeric"
                min={0}
                max={3600}
                step={15}
                defaultValue={item.rest_seconds ?? ''}
              />
            </Field>
            <Field label="Tiempo (seg)" htmlFor="time_seconds" hint="Para isométricos">
              <Input
                id="time_seconds"
                name="time_seconds"
                type="number"
                inputMode="numeric"
                min={0}
                max={7200}
                defaultValue={item.time_seconds ?? ''}
              />
            </Field>
          </div>

          <Field label="Tempo" htmlFor="tempo">
            <Input id="tempo" name="tempo" defaultValue={item.tempo ?? ''} maxLength={16} placeholder="3-1-1-0" />
          </Field>

          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={item.notes ?? ''} rows={2} maxLength={500} />
          </Field>
        </form>
      )}
    </Sheet>
  )
}
