import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader title="Nuevo alumno" back="/alumnos" />
      <PageBody className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </PageBody>
    </>
  )
}
