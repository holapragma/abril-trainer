import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, ChevronRight, Plus } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { getClasses } from '@/lib/queries/classes'
import { WEEKDAYS } from '@/lib/constants'
import { formatTime } from '@/lib/format'
import { todayWeekday } from '@/lib/today'

export const metadata: Metadata = { title: 'Clases · Abril Trainer' }

export default async function ClasesPage() {
  const classes = await getClasses()
  const todayIso = todayWeekday()

  return (
    <>
      <PageHeader
        title="Clases"
        action={
          <ButtonLink href="/clases/nueva" size="sm">
            <Plus size={18} />
            Nueva
          </ButtonLink>
        }
      />
      <PageBody className="space-y-6">
        {classes.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="Todavía no hay clases"
            body="Creá una clase recurrente con su día, hora y cupo. Después inscribís a los alumnos y pasás lista."
            actionLabel="Crear clase"
            actionHref="/clases/nueva"
          />
        ) : (
          WEEKDAYS.map((day) => {
            const dayClasses = classes.filter((c) => c.weekday === day.value)
            if (dayClasses.length === 0) return null

            return (
              <section key={day.value}>
                <h2 className="font-display mb-2 text-lg font-semibold">
                  {day.label}
                  {day.value === todayIso && (
                    <span className="ml-2 align-middle">
                      <Badge tone="accent">Hoy</Badge>
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {dayClasses.map((c) => {
                    const full = c.enrolled >= c.capacity
                    return (
                      <Link
                        key={c.id}
                        href={`/clases/${c.id}`}
                        className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                      >
                        <span className="tabular font-display w-14 shrink-0 text-lg font-bold">
                          {formatTime(c.start_time)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{c.name}</p>
                            {!c.active && <Badge>Inactiva</Badge>}
                          </div>
                          <p className="text-sm text-text-2">
                            {c.duration_minutes} min · {c.enrolled}/{c.capacity} alumnos
                          </p>
                        </div>
                        {full && <Badge tone="warn">Completa</Badge>}
                        <ChevronRight size={18} className="shrink-0 text-text-3" />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </PageBody>
    </>
  )
}
