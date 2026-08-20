'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, House, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Cuatro pestañas, no cinco.
 *
 * «Entrenamientos» no está acá a propósito: una planificación siempre pertenece
 * a un alumno y se entra por su ficha. Una pestaña de nivel superior tendría que
 * inventarse un contenido que nadie pidió. Cuatro además respiran mejor en la
 * barra inferior de un teléfono.
 */
const TABS = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/clases', label: 'Clases', icon: CalendarDays },
  { href: '/pagos', label: 'Pagos', icon: Wallet },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-accent' : 'text-text-3 hover:text-text-2',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[11px] font-semibold">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
