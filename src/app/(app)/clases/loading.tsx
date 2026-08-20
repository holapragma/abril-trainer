import { Plus } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <PageHeader
        title="Clases"
        action={
          <ButtonLink href="/clases/nueva" size="sm">
            <Plus size={18} />
            Nueva
          </ButtonLink>
        }
      />
      <PageBody className="space-y-5">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageBody>
    </>
  )
}
