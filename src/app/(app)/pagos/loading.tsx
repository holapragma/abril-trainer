import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Skeleton, SkeletonList } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader title="Pagos" />
      <PageBody className="space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-9 w-2/3" />
        <SkeletonList />
      </PageBody>
    </>
  )
}
