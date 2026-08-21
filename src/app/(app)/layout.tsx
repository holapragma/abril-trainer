import { Suspense } from 'react'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/states'
import { getProfile } from '@/lib/queries/profile'

/**
 * Shell de la aplicación.
 *
 * Una sola estructura para los dos tamaños: en el teléfono el contenedor es una
 * columna normal con la barra inferior encima, y a partir de `lg` se vuelve
 * horizontal con el sidebar a la izquierda. El móvil no cambia — todo lo de
 * escritorio entra por modificadores de breakpoint.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <Sidebar
        footer={
          <Suspense fallback={<TrainerCardSkeleton />}>
            <TrainerCard />
          </Suspense>
        }
      />

      {/* min-w-0: sin esto, cualquier tabla o texto largo del contenido estira
          el flex y empuja el sidebar fuera de la pantalla. */}
      <main className="min-w-0 flex-1">{children}</main>

      <BottomNav />
    </div>
  )
}

/**
 * Quién está usando la app, al pie del sidebar.
 *
 * Va en su propio Suspense para que la columna se pinte de inmediato: si el
 * layout esperara al perfil, cada navegación bloquearía el shell entero.
 *
 * No consulta nada por su cuenta: reutiliza getProfile(), que ya está envuelta
 * en cache() de React, así que en las pantallas que también lo piden —el inicio
 * y ajustes— esto no agrega ni una consulta.
 */
async function TrainerCard() {
  const profile = await getProfile()

  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <Avatar initials={initialsOf(profile.full_name)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.full_name}</p>
        {profile.business_name && (
          <p className="truncate text-xs text-text-3">{profile.business_name}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Iniciales de un nombre suelto. No se reutiliza initials() de format.ts porque
 * aquella espera nombre y apellido por separado, y acá puede haber una sola
 * palabra: «Abril» tiene que dar «Ab», no «AA».
 */
function initialsOf(fullName: string): string {
  const [first = '', last = ''] = fullName.trim().split(/\s+/)
  const second = last.charAt(0) || first.charAt(1)
  return `${first.charAt(0)}${second}`.toUpperCase()
}

function TrainerCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}
