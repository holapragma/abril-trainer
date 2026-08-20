'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { ErrorNote } from '@/components/ui/states'
import { deleteStudent } from '@/lib/actions/students'

export function DeleteStudent({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div>
        <h2 className="font-display font-semibold">Eliminar alumno</h2>
        <p className="mt-1 text-sm text-text-2">
          Se borra su planificación, asistencia y pagos. No se puede deshacer.
        </p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 size={18} />
        Eliminar
      </Button>

      <Confirm
        open={open}
        title={`¿Eliminar a ${name}?`}
        body="Se borran también su planificación, su asistencia y su historial de pagos. Si solo dejó de entrenar, mejor ponelo en estado «Baja»."
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteStudent(id)
            if (res.ok) {
              router.push('/alumnos')
              router.refresh()
            } else {
              setError(res.error)
              setOpen(false)
            }
          })
        }
      />
    </div>
  )
}
