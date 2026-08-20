import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Dumbbell, LogOut, Tags } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/layout/page-header'
import { Card, CardList } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getProfile } from '@/lib/queries/profile'
import { logout } from '@/lib/actions/auth'
import { ProfileForm } from './profile-form'
import { ThemeToggle } from './theme-toggle'

export const metadata: Metadata = { title: 'Ajustes · Abril Trainer' }

export default async function AjustesPage() {
  const profile = await getProfile()

  return (
    <>
      <PageHeader title="Ajustes" />
      <PageBody className="space-y-6">
        <section>
          <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-text-2 uppercase">Perfil</h2>
          <Card className="p-4">
            <ProfileForm profile={profile} />
          </Card>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-text-2 uppercase">
            Configuración
          </h2>
          <CardList>
            <NavRow href="/planes" icon={<Tags size={18} />} label="Planes" hint="Fuerza, running, virtual…" />
            <NavRow
              href="/ejercicios"
              icon={<Dumbbell size={18} />}
              label="Biblioteca de ejercicios"
              hint="361 ejercicios y los tuyos"
            />
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-text-2">Claro, oscuro o el del sistema</p>
              </div>
              <ThemeToggle />
            </div>
          </CardList>
        </section>

        <form action={logout}>
          <Button type="submit" variant="secondary" full className="text-danger">
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </form>

        <p className="text-center text-xs text-text-3">Abril Trainer · v0.1.0</p>
      </PageBody>
    </>
  )
}

function NavRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-2">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="truncate text-sm text-text-2">{hint}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-text-3" />
    </Link>
  )
}
