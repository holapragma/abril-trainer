'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { NAV_ITEMS, isNavItemActive } from './nav-items'

/**
 * La barra del teléfono. Las rutas y los íconos salen de nav-items.ts, que
 * comparte con el sidebar de escritorio: son dos presentaciones del mismo menú.
 *
 * Desaparece en `lg`, donde ese menú pasa a la columna izquierda.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname)
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
