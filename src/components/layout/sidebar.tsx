'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/cn'
import { NAV_ITEMS, SETTINGS_ITEM, isNavItemActive, type NavItem } from './nav-items'

/**
 * Navegación de escritorio.
 *
 * A partir de `lg` —no de `md`— la barra inferior deja paso a esta columna. El
 * corte está en 1024px porque el sidebar se lleva 16rem: en una tablet de 768px
 * el contenido quedaría más angosto que en un teléfono grande apaisado, que es
 * el peor de los dos mundos. Hasta ahí, la barra inferior sigue siendo la mejor
 * respuesta — son pantallas táctiles.
 *
 * `sticky top-0 h-dvh` en vez de un `<main>` con scroll propio: así la página
 * conserva UN solo scroll, y las cabeceras `sticky` de cada pantalla siguen
 * funcionando sin anidar contextos de scroll.
 */
export function Sidebar({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <Link
        href="/"
        aria-label="Abril Trainer, ir al inicio"
        className="flex items-center gap-3 px-5 py-5"
      >
        <Logo size={32} />
        <span className="font-display truncate text-lg leading-tight font-bold">
          Abril Trainer
        </span>
      </Link>

      <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarLink item={item} active={isNavItemActive(item.href, pathname)} />
            </li>
          ))}
        </ul>

        <hr className="my-3 border-border" />

        <ul>
          <li>
            <SidebarLink
              item={SETTINGS_ITEM}
              active={isNavItemActive(SETTINGS_ITEM.href, pathname)}
            />
          </li>
        </ul>
      </nav>

      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </aside>
  )
}

/**
 * Un ítem del menú. Radio píldora, como el resto de los controles del sistema.
 *
 * El activo va en lima SUAVE, no en lima plena: la regla de marca es un solo
 * elemento lima por pantalla, y ese sitio le corresponde a la acción principal
 * de la pantalla, no a la navegación.
 *
 * Y dentro de ese fondo, el texto va en --color-text mientras el ícono se queda
 * con el acento: lima sobre lima suave da 1,7:1 de contraste, que a 14px no se
 * lee. La señal de «acá estás» la dan el fondo y el ícono, que no dependen de
 * distinguir letras.
 */
function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon, hint } = item

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-full px-3 py-2 transition-colors',
        active ? 'bg-accent-soft text-text' : 'text-text-2 hover:bg-surface-2 hover:text-text',
      )}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2.4 : 1.8}
        className={cn('shrink-0', active && 'text-accent')}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {hint && <span className="block truncate text-xs text-text-3">{hint}</span>}
      </span>
    </Link>
  )
}
