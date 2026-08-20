import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MODALITY, STUDENT_STATUS } from '@/lib/constants'
import { fullName, initials } from '@/lib/format'
import type { StudentListItem } from '@/types/domain'

export function StudentRow({
  student,
  avatarUrl,
}: {
  student: StudentListItem
  avatarUrl: string | null
}) {
  return (
    <Link
      href={`/alumnos/${student.id}`}
      className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-2"
    >
      <Avatar src={avatarUrl} initials={initials(student)} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fullName(student)}</p>
        <p className="truncate text-sm text-text-2">{MODALITY[student.modality]}</p>
      </div>
      {student.status !== 'activo' && (
        <Badge tone={student.status === 'baja' ? 'danger' : 'warn'}>
          {STUDENT_STATUS[student.status]}
        </Badge>
      )}
      <ChevronRight size={18} className="shrink-0 text-text-3" />
    </Link>
  )
}
