'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { ErrorNote } from '@/components/ui/states'
import { deleteClass } from '@/lib/actions/classes'

export function DeleteClass({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div>
        <h2 className="font-display font-semibold">Eliminar clase</h2>
        <p className="mt-1 text-sm text-text-2">
          Se borran las inscripciones y el historial de asistencia. Si solo dejó de dictarse,
          desactivala en lugar de borrarla.
        </p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 size={18} />
        Eliminar
      </Button>

      <Confirm
        open={open}
        title={`¿Eliminar «${name}»?`}
        body="Se borran las inscripciones y todo su historial de asistencia."
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteClass(id)
            if (res.ok) {
              router.push('/clases')
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
