'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Confirm } from '@/components/ui/confirm'
import { Field, Input, SegmentedField, Textarea } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createPlan, deletePlan, updatePlan } from '@/lib/actions/plans'
import { formatMoney, pluralize } from '@/lib/format'
import type { Plan } from '@/types/domain'

type Modality = 'presencial' | 'virtual' | 'ambas'

export function PlansList({
  plans,
  usage,
}: {
  plans: Plan[]
  usage: Record<string, number>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}

      {plans.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {plans.map((p) => {
            const count = usage[p.id] ?? 0
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setEditing(p)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.name}</p>
                    {!p.active && <Badge>Inactivo</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-text-2">
                    {formatMoney(p.price)}
                    {p.sessions_per_week ? ` · ${p.sessions_per_week}× semana` : ''}
                    {p.duration_weeks ? ` · ${p.duration_weeks} sem.` : ''}
                  </p>
                </div>
                {count > 0 && (
                  <span className="shrink-0 text-xs text-text-3">
                    {pluralize(count, 'alumno', 'alumnos')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Button variant="secondary" full onClick={() => setEditing('new')}>
        <Plus size={18} />
        Nuevo plan
      </Button>

      <PlanSheet
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        plan={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onDelete={(p) => {
          setEditing(null)
          setToDelete(p)
        }}
        onSaved={() => {
          setEditing(null)
          router.refresh()
        }}
      />

      <Confirm
        open={toDelete !== null}
        title={`¿Eliminar «${toDelete?.name}»?`}
        body="Si algún alumno lo tiene asignado no se podrá borrar; en ese caso desactivalo."
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          startTransition(async () => {
            const res = await deletePlan(toDelete.id)
            setToDelete(null)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }}
      />
    </div>
  )
}

function PlanSheet({
  plan,
  open,
  onClose,
  onSaved,
  onDelete,
}: {
  plan?: Plan
  open: boolean
  onClose: () => void
  onSaved: () => void
  onDelete: (p: Plan) => void
}) {
  const [modality, setModality] = useState<Modality>(plan?.modality ?? 'ambas')
  const [active, setActive] = useState(plan?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const formId = 'plan-form'

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      name: fd.get('name'),
      description: fd.get('description'),
      modality: modality === 'ambas' ? null : modality,
      sessions_per_week: fd.get('sessions_per_week'),
      price: fd.get('price'),
      duration_weeks: fd.get('duration_weeks'),
      active,
    }

    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const res = plan ? await updatePlan(plan.id, input) : await createPlan(input)
      if (res.ok) onSaved()
      else {
        setError(res.error)
        setFieldErrors(res.fieldErrors ?? {})
      }
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={plan ? 'Editar plan' : 'Nuevo plan'}
      footer={
        <div className="flex gap-2">
          {plan && (
            <Button type="button" variant="secondary" className="text-danger" onClick={() => onDelete(plan)}>
              Eliminar
            </Button>
          )}
          <Button type="submit" form={formId} full disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
          <Input
            id="name"
            name="name"
            defaultValue={plan?.name}
            required
            maxLength={80}
            placeholder="Fuerza + Potencia"
          />
        </Field>

        <Field label="Modalidad">
          <SegmentedField
            value={modality}
            onChange={setModality}
            options={[
              { value: 'presencial', label: 'Presencial' },
              { value: 'virtual', label: 'Virtual' },
              { value: 'ambas', label: 'Ambas' },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio" htmlFor="price" required error={fieldErrors.price}>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              defaultValue={plan?.price ?? 0}
              required
            />
          </Field>
          <Field label="Veces por semana" htmlFor="sessions_per_week">
            <Input
              id="sessions_per_week"
              name="sessions_per_week"
              type="number"
              inputMode="numeric"
              min={1}
              max={14}
              defaultValue={plan?.sessions_per_week ?? ''}
              placeholder="3"
            />
          </Field>
        </div>

        <Field
          label="Duración en semanas"
          htmlFor="duration_weeks"
          hint="Dejalo vacío si es mensual sin plazo"
        >
          <Input
            id="duration_weeks"
            name="duration_weeks"
            type="number"
            inputMode="numeric"
            min={1}
            max={104}
            defaultValue={plan?.duration_weeks ?? ''}
            placeholder="4"
          />
        </Field>

        <Field label="Descripción" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={plan?.description ?? ''} maxLength={500} />
        </Field>

        <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          <span className="text-sm">
            <span className="font-medium">Plan activo</span>
            <span className="block text-text-2">Los inactivos no aparecen al asignar</span>
          </span>
        </label>
      </form>
    </Sheet>
  )
}
