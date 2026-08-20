import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { StatTile } from '@/components/ui/stat'
import { getPaymentTotals, getPayments } from '@/lib/queries/payments'
import { getStudents } from '@/lib/queries/students'
import { formatMoneyShort } from '@/lib/format'
import type { PaymentStatus } from '@/lib/constants'
import { PaymentsList } from './payments-list'

export const metadata: Metadata = { title: 'Pagos · Abril Trainer' }

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const filter = (['pagado', 'pendiente', 'vencido'] as const).includes(estado as PaymentStatus)
    ? (estado as PaymentStatus)
    : undefined

  const [payments, totals, students] = await Promise.all([
    getPayments(filter),
    getPaymentTotals(),
    getStudents({ status: 'activo' }),
  ])

  return (
    <>
      <PageHeader title="Pagos" />
      <PageBody className="space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="Cobrado" value={formatMoneyShort(totals.cobradoMes)} hint="este mes" tone="ok" />
          <StatTile label="Pendientes" value={totals.pendientes} tone="warn" />
          <StatTile label="Vencidos" value={totals.vencidos} tone={totals.vencidos > 0 ? 'danger' : 'neutral'} />
        </div>

        <PaymentsList payments={payments} students={students} activeFilter={filter} />
      </PageBody>
    </>
  )
}
