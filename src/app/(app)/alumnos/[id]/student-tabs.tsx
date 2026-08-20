'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const TABS = [
  { slug: '', label: 'Resumen' },
  { slug: 'entrenamiento', label: 'Entrenamiento' },
  { slug: 'asistencia', label: 'Asistencia' },
  { slug: 'pagos', label: 'Pagos' },
] as const

export function StudentTabs({ id }: { id: string }) {
  const pathname = usePathname()
  const base = `/alumnos/${id}`

  return (
    <nav className="no-scrollbar mx-auto max-w-2xl overflow-x-auto px-4" aria-label="Secciones del alumno">
      <ul className="flex gap-1">
        {TABS.map(({ slug, label }) => {
          const href = slug ? `${base}/${slug}` : base
          const active = slug ? pathname.startsWith(href) : pathname === base
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors',
                  active
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-2 hover:text-text',
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
