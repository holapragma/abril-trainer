import { PageBody } from '@/components/layout/page-header'
import { StudentHeader } from '../student-header'
import { getMembershipHint, getStudentPayments } from '@/lib/queries/payments'
import { StudentPayments } from './student-payments'

export default async function AlumnoPagosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [payments, membership] = await Promise.all([
    getStudentPayments(id),
    getMembershipHint(id),
  ])

  return (
    <>
      <StudentHeader id={id} />
      <PageBody>
      <StudentPayments studentId={id} payments={payments} membership={membership} />
      </PageBody>
    </>
  )
}
