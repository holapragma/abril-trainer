import type { Metadata } from 'next'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ClassForm } from '../class-form'

export const metadata: Metadata = { title: 'Nueva clase · Abril Trainer' }

export default function NuevaClasePage() {
  return (
    <>
      <PageHeader title="Nueva clase" back="/clases" />
      <PageBody>
        <ClassForm />
      </PageBody>
    </>
  )
}
