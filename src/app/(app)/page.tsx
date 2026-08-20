import Link from 'next/link'
import { Suspense } from 'react'
import { AlertTriangle, ClipboardCheck, Settings, UserPlus } from 'lucide-react'
import { PageBody } from '@/components/layout/page-header'
import { Card, CardList } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatTile } from '@/components/ui/stat'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/states'
import { getDashboard, getStudentsWithoutPlan } from '@/lib/queries/dashboard'
import { getProfile } from '@/lib/queries/profile'
import { formatMoneyShort, formatTime, fullName, initials, pluralize } from '@/lib/format'

export default function InicioPage() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Greeting />
      </Suspense>
      <PageBody className="space-y-6">
        <Suspense fallback={<BodySkeleton />}>
          <Dashboard />
        </Suspense>
      </PageBody>
    </>
  )
}

async function Greeting() {
  const profile = await getProfile()
  const hour = new Date().getHours()
  const saludo = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = profile.full_name.split(' ')[0]

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-sm text-text-2">{saludo}</p>
          <h1 className="font-display truncate text-2xl font-bold">{nombre}</h1>
        </div>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text"
        >
          <Settings size={20} />
        </Link>
      </div>
    </header>
  )
}

async function Dashboard() {
  const [data, sinPlan] = await Promise.all([getDashboard(), getStudentsWithoutPlan()])

  return (
    <>
      {/* Hoy */}
      <section>
        <h2 className="font-display mb-2.5 text-lg font-semibold">Hoy</h2>
        {data.clases_hoy.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-text-2">No tenés clases hoy.</p>
          </Card>
        ) : (
          <CardList>
            {data.clases_hoy.map((c) => (
              <Link
                key={c.id}
                href={`/clases/${c.id}/asistencia`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
              >
                <span className="tabular font-display w-14 shrink-0 text-lg font-bold">
                  {formatTime(c.hora)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nombre}</p>
                  <p className="tabular text-sm text-text-2">
                    {c.inscritos}/{c.cupo} alumnos
                  </p>
                </div>
                {c.asistencia_tomada ? (
                  <Badge tone="ok">Lista tomada</Badge>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                    <ClipboardCheck size={16} />
                    Pasar lista
                  </span>
                )}
              </Link>
            ))}
          </CardList>
        )}
      </section>

      {/* Alumnos */}
      <section>
        <h2 className="font-display mb-2.5 text-lg font-semibold">Alumnos</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="Activos" value={data.alumnos.activos} href="/alumnos?estado=activo" />
          <StatTile label="Total" value={data.alumnos.total} href="/alumnos" />
          <StatTile label="Nuevos" value={data.alumnos.nuevos} hint="30 días" />
        </div>
      </section>

      {/* Pagos */}
      <section>
        <h2 className="font-display mb-2.5 text-lg font-semibold">Pagos</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile
            label="Cobrado"
            value={formatMoneyShort(data.pagos.cobrado_mes)}
            hint="este mes"
            tone="ok"
            href="/pagos?estado=pagado"
          />
          <StatTile
            label="Pendientes"
            value={data.pagos.pendientes}
            tone="warn"
            href="/pagos?estado=pendiente"
          />
          <StatTile
            label="Vencidos"
            value={data.pagos.vencidos}
            tone={data.pagos.vencidos > 0 ? 'danger' : 'neutral'}
            href="/pagos?estado=vencido"
          />
        </div>
      </section>

      {/* Planificación: solo aparece si hay algo que hacer */}
      {(sinPlan.length > 0 || data.planificacion.por_vencer > 0) && (
        <section>
          <h2 className="font-display mb-2.5 text-lg font-semibold">Requiere atención</h2>
          <div className="space-y-2">
            {data.planificacion.por_vencer > 0 && (
              <Card className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
                  <AlertTriangle size={18} />
                </span>
                <p className="text-sm">
                  <span className="font-medium">
                    {pluralize(data.planificacion.por_vencer, 'planificación vence', 'planificaciones vencen')}
                  </span>{' '}
                  <span className="text-text-2">esta semana</span>
                </p>
              </Card>
            )}

            {sinPlan.length > 0 && (
              <CardList>
                {sinPlan.map((s) => (
                  <Link
                    key={s.id}
                    href={`/alumnos/${s.id}/entrenamiento`}
                    className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-2"
                  >
                    <Avatar initials={initials(s)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{fullName(s)}</p>
                      <p className="text-sm text-text-2">Sin planificación activa</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-accent">Armar</span>
                  </Link>
                ))}
              </CardList>
            )}
          </div>
        </section>
      )}

      <Link
        href="/alumnos/nuevo"
        className="flex items-center justify-center gap-2 rounded-card border border-dashed border-border-strong p-4 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <UserPlus size={18} />
        Nuevo alumno
      </Link>
    </>
  )
}

function HeaderSkeleton() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-2xl space-y-2 px-4 py-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-36" />
      </div>
    </header>
  )
}

function BodySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  )
}
