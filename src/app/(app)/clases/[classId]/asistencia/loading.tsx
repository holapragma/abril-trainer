import { PageBody } from '@/components/layout/page-header'
import { Skeleton, SkeletonList } from '@/components/ui/states'

export default function Loading() {
  return (
    <PageBody className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <SkeletonList />
    </PageBody>
  )
}
