import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Skeleton, SkeletonList } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader title="Alumnos" />
      <PageBody className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-2/3" />
        <SkeletonList />
      </PageBody>
    </>
  )
}
