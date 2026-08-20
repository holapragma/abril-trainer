import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Plus, Users } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState, SkeletonList } from '@/components/ui/states'
import { SearchInput } from '@/components/ui/misc'
import { getStudents } from '@/lib/queries/students'
import { signedAvatarUrls } from '@/lib/storage'
import type { Enums } from '@/types/database.types'
import { StudentRow } from './student-row'
import { StudentFilters } from './student-filters'

export const metadata: Metadata = { title: 'Alumnos · Abril Trainer' }

type SearchParams = Promise<{ q?: string; estado?: string; modalidad?: string }>

export default async function AlumnosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  return (
    <>
      <PageHeader
        title="Alumnos"
        action={
          <ButtonLink href="/alumnos/nuevo" size="sm" aria-label="Nuevo alumno">
            <Plus size={18} />
            Nuevo
          </ButtonLink>
        }
      />
      <PageBody className="space-y-3">
        <SearchInput placeholder="Buscar por nombre…" />
        <StudentFilters />
        <Suspense key={JSON.stringify(sp)} fallback={<SkeletonList />}>
          <StudentList
            q={sp.q}
            status={sp.estado as Enums<'student_status'> | undefined}
            modality={sp.modalidad as Enums<'modality'> | undefined}
          />
        </Suspense>
      </PageBody>
    </>
  )
}

async function StudentList({
  q,
  status,
  modality,
}: {
  q?: string
  status?: Enums<'student_status'>
  modality?: Enums<'modality'>
}) {
  const students = await getStudents({ q, status, modality })
  const avatars = await signedAvatarUrls(students.map((s) => s.photo_url))

  if (students.length === 0) {
    const filtrando = Boolean(q || status || modality)
    return filtrando ? (
      <EmptyState
        icon={<Users size={24} />}
        title="Sin resultados"
        body="Probá con otro nombre o quitá los filtros."
      />
    ) : (
      <EmptyState
        icon={<Users size={24} />}
        title="Todavía no hay alumnos"
        body="Creá el primero y empezá a armarle la planificación."
        actionLabel="Crear alumno"
        actionHref="/alumnos/nuevo"
      />
    )
  }

  return (
    <>
      <p className="px-1 text-xs text-text-3">
        {students.length} {students.length === 1 ? 'alumno' : 'alumnos'}
      </p>
      <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {students.map((s) => (
          <StudentRow key={s.id} student={s} avatarUrl={avatars.get(s.photo_url ?? '') ?? null} />
        ))}
      </div>
    </>
  )
}
