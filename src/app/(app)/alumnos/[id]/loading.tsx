import { PageBody } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <PageBody className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-48 w-full" />
    </PageBody>
  )
}
