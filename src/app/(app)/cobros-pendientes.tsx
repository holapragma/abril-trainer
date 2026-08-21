'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardList } from '@/components/ui/card'
import { ErrorNote } from '@/components/ui/states'
import { generateMonthlyCharges, togglePaid } from '@/lib/actions/payments'
import { dueLabel, formatMoney, pluralize } from '@/lib/format'
import { todayISO } from '@/lib/today'
import type { DashboardSummary } from '@/types/domain'

/**
 * Los cobros sin saldar, en el inicio y con el tilde a mano.
 *
 * Cobrar era: ir a Pagos, buscar al alumno, tocar el tilde. Ahora los que
 * importan están donde Abril ya mira, y marcarlos abre solo el del mes que
 * viene.
 */
export function CobrosPendientes({
  cobros,
  porGenerar,
}: {
  cobros: DashboardSummary['cobros_pendientes']
  porGenerar: number
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (cobros.length === 0 && porGenerar === 0) return null

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Cobros</h2>
        <Link href="/pagos" className="text-sm font-medium text-text-2 hover:text-text">
          Ver todos
        </Link>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {aviso && <p className="mb-2 text-sm text-text-2">{aviso}</p>}

      {cobros.length > 0 && (
        <CardList>
          {cobros.map((c) => {
            const vencido = c.due_date < todayISO()
            return (
            <div key={c.id} className="flex items-center gap-3 p-3.5">
              <Link
                href={`/alumnos/${c.student_id}/pagos`}
                className="min-w-0 flex-1 transition-colors hover:text-accent"
              >
                <p className="truncate font-medium">
                  {c.first_name} {c.last_name}
                </p>
                <p className="text-sm text-text-2">
                  <span className="tabular">{formatMoney(Number(c.amount))}</span> · {dueLabel(c.due_date)}
                </p>
              </Link>

              <Badge tone={vencido ? 'danger' : 'warn'}>{vencido ? 'Vencido' : 'Pendiente'}</Badge>

              <button
                type="button"
                aria-label={`Marcar como pagado el cobro de ${c.first_name}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null)
                    setAviso(null)
                    const res = await togglePaid(c.id, true)
                    if (!res.ok) return setError(res.error)
                    if (res.data.chained) setAviso('Cobrado. Ya quedó abierto el del mes que viene.')
                    router.refresh()
                  })
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-3 transition-colors hover:text-text disabled:opacity-50"
              >
                <Check size={18} />
              </button>
            </div>
            )
          })}
        </CardList>
      )}

      {porGenerar > 0 && (
        <Button
          variant="secondary"
          full
          className="mt-2"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              setAviso(null)
              const res = await generateMonthlyCharges()
              if (!res.ok) return setError(res.error)
              setAviso(
                res.data.created === 0
                  ? 'No faltaba ninguno.'
                  : `Se abrieron ${pluralize(res.data.created, 'cobro', 'cobros')}.`,
              )
              router.refresh()
            })
          }
        >
          <Wallet size={18} />
          {pending
            ? 'Generando…'
            : `Abrir ${pluralize(porGenerar, 'cobro', 'cobros')} de este mes`}
        </Button>
      )}
    </section>
  )
}
