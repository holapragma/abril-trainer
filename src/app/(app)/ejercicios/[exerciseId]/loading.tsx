import { PageBody } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <PageBody className="space-y-4">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </PageBody>
  )
}
