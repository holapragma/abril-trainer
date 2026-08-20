import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader title="Planes" back="/ajustes" />
      <PageBody className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </PageBody>
    </>
  )
}
