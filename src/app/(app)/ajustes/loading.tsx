import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <PageBody className="space-y-6">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </PageBody>
    </>
  )
}
