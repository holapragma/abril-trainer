import type { Metadata } from 'next'
import { Tags } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/states'
import { getPlanUsage, getPlans } from '@/lib/queries/plans'
import { PlansList } from './plans-list'

export const metadata: Metadata = { title: 'Planes · Abril Trainer' }

export default async function PlanesPage() {
  const [plans, usage] = await Promise.all([getPlans(), getPlanUsage()])

  return (
    <>
      <PageHeader title="Planes" back="/ajustes" />
      <PageBody>
        {plans.length === 0 ? (
          <>
            <EmptyState
              icon={<Tags size={24} />}
              title="Todavía no hay planes"
              body="Un plan define la modalidad, la frecuencia y el precio. Después lo asignás a cada alumno."
            />
            <PlansList plans={[]} usage={{}} />
          </>
        ) : (
          <PlansList plans={plans} usage={Object.fromEntries(usage)} />
        )}
      </PageBody>
    </>
  )
}
