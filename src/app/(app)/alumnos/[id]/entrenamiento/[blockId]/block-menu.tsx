'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MoreVertical, Trash2 } from 'lucide-react'
import { IconButton, Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Confirm } from '@/components/ui/confirm'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { deleteBlock, finishBlock, updateBlock } from '@/lib/actions/planning'
import { formatDateInput } from '@/lib/format'
import type { TrainingBlock } from '@/types/domain'

export function BlockMenu({ studentId, block }: { studentId: string; block: TrainingBlock }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const formId = 'edit-block'

  return (
    <>
      <IconButton label="Opciones del bloque" onClick={() => setOpen(true)}>
        <MoreVertical size={20} />
      </IconButton>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Bloque"
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
            startTransition(async () => {
              const res = await updateBlock(block.id, studentId, {
                student_id: studentId,
                name: fd.get('name'),
                goal: fd.get('goal'),
                starts_on: fd.get('starts_on'),
                total_weeks: fd.get('total_weeks'),
              })
              if (res.ok) {
                setOpen(false)
                router.refresh()
              } else setError(res.error)
            })
          }}
        >
          {error && <ErrorNote>{error}</ErrorNote>}

          <Field label="Nombre" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={block.name} required maxLength={80} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Semanas" htmlFor="total_weeks" required>
              <Input
                id="total_weeks"
                name="total_weeks"
                type="number"
                inputMode="numeric"
                min={1}
                max={52}
                defaultValue={block.total_weeks}
                required
              />
            </Field>
            <Field label="Empieza" htmlFor="starts_on" required>
              <Input
                id="starts_on"
                name="starts_on"
                type="date"
                defaultValue={formatDateInput(block.starts_on)}
                required
              />
            </Field>
          </div>

          <Field label="Objetivo" htmlFor="goal">
            <Input id="goal" name="goal" defaultValue={block.goal ?? ''} maxLength={200} />
          </Field>
        </form>

        <div className="mt-6 space-y-2 border-t border-border pt-5">
          {block.status === 'activo' && (
            <Button
              variant="secondary"
              full
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await finishBlock(block.id, studentId)
                  if (res.ok) {
                    setOpen(false)
                    router.refresh()
                  } else setError(res.error)
                })
              }
            >
              <CheckCircle2 size={18} />
              Marcar como terminado
            </Button>
          )}

          <Button
            variant="secondary"
            full
            className="text-danger"
            onClick={() => {
              setOpen(false)
              setConfirmDelete(true)
            }}
          >
            <Trash2 size={18} />
            Eliminar bloque
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={confirmDelete}
        title={`¿Eliminar «${block.name}»?`}
        body="Se borran todas sus semanas, sesiones y ejercicios. No se puede deshacer."
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteBlock(block.id, studentId)
            setConfirmDelete(false)
            if (res.ok) {
              router.push(`/alumnos/${studentId}/entrenamiento`)
              router.refresh()
            } else setError(res.error)
          })
        }
      />
    </>
  )
}
