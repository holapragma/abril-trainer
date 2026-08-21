import { CalendarDays, House, Settings, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Texto secundario: solo el sidebar tiene sitio para mostrarlo. */
  hint?: string
}

/**
 * Cuatro pestañas, no cinco.
 *
 * «Entrenamientos» no está acá a propósito: una planificación siempre pertenece
 * a un alumno y se entra por su ficha. Una pestaña de nivel superior tendría que
 * inventarse un contenido que nadie pidió.
 *
 * Las rutas viven acá y no dentro de cada barra: la nav inferior del teléfono y
 * el sidebar de escritorio son dos presentaciones del MISMO menú. Duplicar la
 * lista era garantizar que algún día dijeran cosas distintas.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/clases', label: 'Clases', icon: CalendarDays },
  { href: '/pagos', label: 'Pagos', icon: Wallet },
] as const

/**
 * Ajustes queda fuera de la nav del teléfono —donde se llega por el engranaje
 * del inicio— pero en escritorio sobra sitio en la columna y esconderlo sería
 * gratuito. Es la única diferencia entre las dos barras.
 */
export const SETTINGS_ITEM: NavItem = {
  href: '/ajustes',
  label: 'Ajustes',
  icon: Settings,
  hint: 'Planes, ejercicios y tema',
}

/**
 * Qué ítem está activo. `/` se compara exacto porque de lo contrario sería
 * prefijo de todas las rutas y quedaría siempre encendido.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
