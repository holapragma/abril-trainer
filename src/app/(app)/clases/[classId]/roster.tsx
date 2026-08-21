'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserMinus, Users } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { FilterInput } from '@/components/ui/misc'
import { EmptyState, ErrorNote } from '@/components/ui/states'
import { enrollStudent, unenrollStudent } from '@/lib/actions/classes'
import { fullName, initials } from '@/lib/format'
import { STUDENT_STATUS } from '@/lib/constants'
import type { AttendanceRow, StudentListItem } from '@/types/domain'

type RosterRow = AttendanceRow & { avatarUrl: string | null }

export function Roster({
  classId,
  capacity,
  roster,
  candidates,
}: {
  classId: string
  capacity: number
  roster: RosterRow[]
  candidates: StudentListItem[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const full = roster.length >= capacity

  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}

      <h2 className="text-xs font-semibold tracking-wide text-text-2 uppercase">Alumnos</h2>

      {roster.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="Nadie inscrito"
          body="Sumá a los alumnos que vienen a esta clase."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {roster.map((r) => (
            <li key={r.student_id} className="flex items-center gap-3 p-3">
              <Avatar src={r.avatarUrl} initials={initials(r)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{fullName(r)}</span>
                {r.student_status !== 'activo' && (
                  <Badge tone={r.student_status === 'baja' ? 'danger' : 'warn'}>
                    {STUDENT_STATUS[r.student_status]}
                  </Badge>
                )}
              </span>
              <IconButton
                label={`Quitar a ${r.first_name}`}
                className="hover:text-danger"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await unenrollStudent(classId, r.student_id)
                    if (res.ok) router.refresh()
                    else setError(res.error)
                  })
                }
              >
                <UserMinus size={17} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" full onClick={() => setAdding(true)} disabled={full}>
        <Plus size={18} />
        {full ? `Cupo completo (${capacity})` : 'Inscribir alumno'}
      </Button>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Inscribir alumno"
        description={`Quedan ${capacity - roster.length} lugares`}
      >
        {candidates.length > 6 && (
          <div className="mb-3">
            <FilterInput value={q} onChange={setQ} placeholder="Buscar alumno…" />
          </div>
        )}

        {candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-2">
            Todos los alumnos activos ya están en esta clase.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {candidates
              .filter((s) => fullName(s).toLowerCase().includes(q.trim().toLowerCase()))
              .map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await enrollStudent(classId, s.id)
                      setAdding(false)
                      if (res.ok) router.refresh()
                      else setError(res.error)
                    })
                  }
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  <Avatar initials={initials(s)} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{fullName(s)}</span>
                  <Plus size={17} className="shrink-0 text-text-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
