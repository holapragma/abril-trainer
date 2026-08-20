'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Chip } from '@/components/ui/misc'
import { EmptyState, ErrorNote } from '@/components/ui/states'
import { PaymentSheet } from './payment-sheet'
import { togglePaid } from '@/lib/actions/payments'
import { dueLabel, formatMoney, fullName } from '@/lib/format'
import { PAYMENT_STATUS, type PaymentStatus } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { PaymentWithStudent } from '@/lib/queries/payments'
import type { StudentListItem } from '@/types/domain'

const TONE = { pagado: 'ok', pendiente: 'warn', vencido: 'danger' } as const

export function PaymentsList({
  payments,
  students,
  activeFilter,
}: {
  payments: PaymentWithStudent[]
  students: StudentListItem[]
  activeFilter?: PaymentStatus
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function setFilter(value: PaymentStatus | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || next.get('estado') === value) next.delete('estado')
    else next.set('estado', value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip selected={!activeFilter} onClick={() => setFilter(null)}>
          Todos
        </Chip>
        {(['vencido', 'pendiente', 'pagado'] as const).map((s) => (
          <Chip key={s} selected={activeFilter === s} onClick={() => setFilter(s)}>
            {PAYMENT_STATUS[s]}
          </Chip>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title={activeFilter ? 'Nada por acá' : 'Sin pagos registrados'}
          body={
            activeFilter
              ? 'No hay pagos con ese estado.'
              : 'Registrá el primer cobro para llevar el control de quién está al día.'
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {payments.map((p) => {
            const isPaid = p.status === 'pagado'
            return (
              <li key={p.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.student ? fullName(p.student) : 'Alumno eliminado'}
                  </p>
                  <p className="text-sm text-text-2">
                    <span className="tabular">{formatMoney(p.amount)}</span>
                    {' · '}
                    {isPaid ? 'pagado' : dueLabel(p.due_date)}
                  </p>
                  {p.note && <p className="truncate text-xs text-text-3">{p.note}</p>}
                </div>

                <Badge tone={TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>

                <button
                  type="button"
                  aria-label={isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  aria-pressed={isPaid}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await togglePaid(p.id, !isPaid)
                      if (res.ok) router.refresh()
                      else setError(res.error)
                    })
                  }
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    isPaid
                      ? 'border-ok bg-ok text-white'
                      : 'border-border bg-surface text-text-3 hover:text-text',
                  )}
                >
                  <Check size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="secondary" full onClick={() => setAdding(true)} disabled={students.length === 0}>
        <Plus size={18} />
        {students.length === 0 ? 'Creá un alumno primero' : 'Registrar pago'}
      </Button>

      <PaymentSheet
        open={adding}
        students={students}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false)
          router.refresh()
        }}
      />
    </div>
  )
}
