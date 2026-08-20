import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getStudent } from '@/lib/queries/students'
import { signedAvatarUrl } from '@/lib/storage'
import { MODALITY, STUDENT_STATUS } from '@/lib/constants'
import { age, fullName, initials } from '@/lib/format'
import { StudentTabs } from './student-tabs'

/**
 * Cabecera con pestañas de la ficha del alumno.
 *
 * Es un componente y no un layout.tsx a propósito: un layout se aplica a TODOS
 * los descendientes, y estas pestañas solo valen para las cuatro secciones de la
 * ficha. Con un layout, el editor de bloque, el de sesión, el alta de plan y la
 * edición del alumno terminaban con dos cabeceras apiladas y unas pestañas que
 * no correspondían a la pantalla.
 */
export async function StudentHeader({ id }: { id: string }) {
  const student = await getStudent(id)
  if (!student) notFound()

  const avatar = await signedAvatarUrl(student.photo_url)
  const years = age(student.birthdate)

  return (
    <>
      <PageHeader
        title={fullName(student)}
        back="/alumnos"
        action={
          <Link
            href={`/alumnos/${id}/editar`}
            aria-label="Editar alumno"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text"
          >
            <Pencil size={18} />
          </Link>
        }
      />

      <div className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-3.5 px-4 py-4">
          <Avatar src={avatar} initials={initials(student)} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="accent">{MODALITY[student.modality]}</Badge>
              {student.status !== 'activo' && (
                <Badge tone={student.status === 'baja' ? 'danger' : 'warn'}>
                  {STUDENT_STATUS[student.status]}
                </Badge>
              )}
            </div>
            {student.goal && <p className="truncate text-sm text-text-2">{student.goal}</p>}
            {years !== null && <p className="text-sm text-text-3">{years} años</p>}
          </div>
        </div>

        <StudentTabs id={id} />
      </div>
    </>
  )
}
