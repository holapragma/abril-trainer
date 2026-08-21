'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, Wallet } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Confirm } from '@/components/ui/confirm'
import { EmptyState, ErrorNote } from '@/components/ui/states'
import { PaymentSheet, type MembershipHint } from '@/app/(app)/pagos/payment-sheet'
import { deletePayment, togglePaid } from '@/lib/actions/payments'
import { dueLabel, formatDate, formatMoney } from '@/lib/format'
import { PAYMENT_STATUS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { PaymentWithStatus } from '@/types/domain'

const TONE = { pagado: 'ok', pendiente: 'warn', vencido: 'danger' } as const

export function StudentPayments({
  studentId,
  payments,
  membership,
}: {
  studentId: string
  payments: PaymentWithStatus[]
  membership: MembershipHint | null
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<PaymentWithStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const debe = payments
    .filter((p) => p.status !== 'pagado')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      {aviso && <p className="text-sm text-text-2">{aviso}</p>}

      {debe > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-text-2 uppercase">Adeuda</p>
          <p className="tabular font-display mt-1 text-3xl leading-none font-bold text-danger">
            {formatMoney(debe)}
          </p>
        </Card>
      )}

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title="Sin pagos"
          body="Registrá el primer cobro de este alumno."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {payments.map((p) => {
            const isPaid = p.status === 'pagado'
            return (
              <li key={p.id} className="flex items-center gap-2 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="tabular font-medium">{formatMoney(p.amount)}</p>
                  <p className="text-sm text-text-2">
                    {isPaid ? `Pagado el ${formatDate(p.paid_at)}` : dueLabel(p.due_date)}
                  </p>
                  {p.note && <p className="truncate text-xs text-text-3">{p.note}</p>}
                </div>

                <Badge tone={TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>

                <button
                  type="button"
                  aria-label={isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await togglePaid(p.id, !isPaid)
                      if (!res.ok) return setError(res.error)
                      // Cobrar abre el ciclo siguiente: conviene decirlo, o
                      // parece que apareció un pago de la nada.
                      setAviso(res.data.chained ? 'Ya quedó abierto el cobro del mes que viene.' : null)
                      router.refresh()
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

                <IconButton
                  label="Eliminar pago"
                  className="h-9 w-9 hover:text-danger"
                  onClick={() => setToDelete(p)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="secondary" full onClick={() => setAdding(true)}>
        <Plus size={18} />
        Registrar pago
      </Button>

      {membership && (
        <p className="text-center text-xs text-text-3">
          El cobro del mes siguiente se abre solo al marcar pagado el anterior.
        </p>
      )}

      <PaymentSheet
        open={adding}
        students={[]}
        studentId={studentId}
        membership={membership}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false)
          router.refresh()
        }}
      />

      <Confirm
        open={toDelete !== null}
        title="¿Eliminar este pago?"
        body={toDelete ? formatMoney(toDelete.amount) : undefined}
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          startTransition(async () => {
            const res = await deletePayment(toDelete.id)
            setToDelete(null)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }}
      />
    </div>
  )
}
