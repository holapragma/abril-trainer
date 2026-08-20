import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ButtonLink } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/misc'
import { Skeleton } from '@/components/ui/states'
import { getExercises, getFavoriteIds, getLibraryCounts } from '@/lib/queries/exercises'
import { ExerciseGrid } from './exercise-grid'
import { LibraryFilters } from './library-filters'

export const metadata: Metadata = { title: 'Ejercicios · Abril Trainer' }

type SearchParams = Promise<{ q?: string; grupo?: string; favs?: string; propios?: string }>

export default async function EjerciciosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <PageBody className="space-y-3">
        <SearchInput placeholder="Buscar ejercicio…" />
        <LibraryFilters />
        <Suspense key={JSON.stringify(sp)} fallback={<GridSkeleton />}>
          <Results
            q={sp.q}
            group={sp.grupo}
            favsOnly={sp.favs === '1'}
            mineOnly={sp.propios === '1'}
          />
        </Suspense>
      </PageBody>
    </>
  )
}

/** Separado del shell: el conteo no debe bloquear buscador ni filtros. */
async function Header() {
  const counts = await getLibraryCounts()
  return (
    <PageHeader
      title="Ejercicios"
      subtitle={`${counts.total} en la biblioteca${counts.propios ? ` · ${counts.propios} propios` : ''}`}
      back="/ajustes"
      action={
        <ButtonLink href="/ejercicios/nuevo" size="sm">
          <Plus size={18} />
          Nuevo
        </ButtonLink>
      }
    />
  )
}

function HeaderFallback() {
  return (
    <PageHeader
      title="Ejercicios"
      back="/ajustes"
      action={
        <ButtonLink href="/ejercicios/nuevo" size="sm">
          <Plus size={18} />
          Nuevo
        </ButtonLink>
      }
    />
  )
}

async function Results({
  q,
  group,
  favsOnly,
  mineOnly,
}: {
  q?: string
  group?: string
  favsOnly: boolean
  mineOnly: boolean
}) {
  const [exercises, favorites] = await Promise.all([
    getExercises({ q, group, mineOnly }),
    getFavoriteIds(),
  ])

  // Filtrado de favoritos acá (no dentro de getExercises) para no duplicar la
  // consulta a exercise_favorites: ya la tenemos del Promise.all de arriba.
  const list = favsOnly ? exercises.filter((e) => favorites.has(e.id)) : exercises

  return <ExerciseGrid exercises={list} favorites={[...favorites]} />
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  )
}
