'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { assignPlan, endMembership } from '@/lib/actions/plans'
import { formatDate, formatMoney } from '@/lib/format'
import { MODALITY } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { MembershipWithPlan, Plan } from '@/types/domain'

export function AssignPlanForm({
  studentId,
  plans,
  current,
}: {
  studentId: string
  plans: Plan[]
  current: MembershipWithPlan | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Plan | null>(
    plans.find((p) => p.id === current?.plan_id) ?? null,
  )
  // El precio arranca en el del plan pero se puede pisar: Abril negocia casos
  // puntuales, y lo pactado es lo que tiene que quedar en la membresía.
  const [price, setPrice] = useState<string>(String(current?.price ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function choose(plan: Plan) {
    setSelected(plan)
    setPrice(String(plan.price))
  }

  function save() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const res = await assignPlan({
        student_id: studentId,
        plan_id: selected.id,
        starts_on: new Date().toISOString().slice(0, 10),
        price: price === '' ? selected.price : Number(price),
      })
      if (res.ok) {
        router.push(`/alumnos/${studentId}`)
        router.refresh()
      } else setError(res.error)
    })
  }

  return (
    <div className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}

      {current?.plan && (
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">Plan actual</p>
          <p className="font-display mt-1 text-lg font-bold">{current.plan.name}</p>
          <p className="text-sm text-text-2">
            {formatMoney(current.price)} · desde {formatDate(current.starts_on)}
          </p>
        </Card>
      )}

      <div>
        <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-text-2 uppercase">
          {current ? 'Cambiar a' : 'Elegir plan'}
        </h2>
        <div className="space-y-2">
          {plans.map((p) => {
            const isSelected = selected?.id === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 truncate text-sm text-text-2">
                    {formatMoney(p.price)}
                    {p.modality ? ` · ${MODALITY[p.modality]}` : ''}
                    {p.sessions_per_week ? ` · ${p.sessions_per_week}× semana` : ''}
                  </p>
                </div>
                {isSelected && <Check size={20} className="shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <Field label="Precio pactado" htmlFor="price" hint="Queda congelado aunque cambie la tarifa del plan">
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
      )}

      <div className="space-y-2">
        <Button full size="lg" disabled={!selected || pending} onClick={save}>
          {pending ? 'Guardando…' : current ? 'Cambiar plan' : 'Asignar plan'}
        </Button>

        {current && (
          <Button
            variant="ghost"
            full
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await endMembership(studentId)
                if (res.ok) {
                  router.push(`/alumnos/${studentId}`)
                  router.refresh()
                } else setError(res.error)
              })
            }
          >
            Finalizar plan actual
          </Button>
        )}
      </div>
    </div>
  )
}
