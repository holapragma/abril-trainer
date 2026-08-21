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
import { LoadMore } from './load-more'

export const metadata: Metadata = { title: 'Ejercicios · Abril Trainer' }

type SearchParams = Promise<{
  q?: string
  grupo?: string
  favs?: string
  propios?: string
  n?: string
}>

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
            pages={Math.min(Math.max(Number(sp.n) || 1, 1), 20)}
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
  pages,
}: {
  q?: string
  group?: string
  favsOnly: boolean
  mineOnly: boolean
  pages: number
}) {
  const [{ items, hasMore }, favorites] = await Promise.all([
    getExercises({ q, group, mineOnly, pages }),
    getFavoriteIds(),
  ])

  // Filtrado de favoritos acá (no dentro de getExercises) para no duplicar la
  // consulta a abril_trainer_exercise_favorites: ya la tenemos del Promise.all de arriba.
  const list = favsOnly ? items.filter((e) => favorites.has(e.id)) : items

  return (
    <>
      <ExerciseGrid exercises={list} favorites={[...favorites]} />
      {/* Con el filtro de favoritos el recorte es en memoria, así que «cargar
          más» seguiría teniendo sentido: hay más favoritos más adelante. */}
      {hasMore && <LoadMore pages={pages} shown={list.length} />}
    </>
  )
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
