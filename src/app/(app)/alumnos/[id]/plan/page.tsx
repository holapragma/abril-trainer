import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/states'
import { Tags } from 'lucide-react'
import { getPlans } from '@/lib/queries/plans'
import { getActiveMembership, getStudent } from '@/lib/queries/students'
import { fullName } from '@/lib/format'
import { AssignPlanForm } from './assign-plan-form'

export const metadata: Metadata = { title: 'Plan del alumno · Abril Trainer' }

export default async function PlanAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [student, plans, membership] = await Promise.all([
    getStudent(id),
    getPlans(true),
    getActiveMembership(id),
  ])
  if (!student) notFound()

  return (
    <>
      <PageHeader title="Plan" subtitle={fullName(student)} back={`/alumnos/${id}`} />
      <PageBody>
        {plans.length === 0 ? (
          <EmptyState
            icon={<Tags size={24} />}
            title="No hay planes activos"
            body="Creá un plan primero y después asignáselo a este alumno."
            actionLabel="Crear plan"
            actionHref="/planes"
          />
        ) : (
          <AssignPlanForm studentId={id} plans={plans} current={membership} />
        )}
      </PageBody>
    </>
  )
}
