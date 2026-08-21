'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { ErrorNote } from '@/components/ui/states'
import { deleteExercise, uploadExerciseMedia } from '@/lib/actions/exercises'
import type { Exercise } from '@/types/domain'

export function OwnExerciseActions({ exercise }: { exercise: Exercise }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3 border-t border-border pt-5">
      {error && <ErrorNote>{error}</ErrorNote>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const fd = new FormData()
          fd.set('media', file)
          setError(null)
          startTransition(async () => {
            const res = await uploadExerciseMedia(exercise.id, fd)
            if (res.ok) router.refresh()
            else setError(res.error)
            if (fileRef.current) fileRef.current.value = ''
          })
        }}
      />

      <ButtonLink href={`/ejercicios/${exercise.id}/editar`} variant="secondary" full>
        <Pencil size={18} />
        Editar
      </ButtonLink>

      <Button variant="secondary" full disabled={pending} onClick={() => fileRef.current?.click()}>
        <Upload size={18} />
        {pending ? 'Subiendo…' : exercise.media_url ? 'Cambiar vídeo o foto' : 'Subir vídeo o foto'}
      </Button>

      <Button
        variant="ghost"
        full
        className="text-danger"
        onClick={() => setConfirming(true)}
        disabled={pending}
      >
        <Trash2 size={18} />
        Eliminar ejercicio
      </Button>

      <Confirm
        open={confirming}
        title={`¿Eliminar «${exercise.name}»?`}
        body="Si está en alguna planificación no se podrá borrar."
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteExercise(exercise.id)
            setConfirming(false)
            if (res.ok) {
              router.push('/ejercicios')
              router.refresh()
            } else setError(res.error)
          })
        }
      />
    </div>
  )
}
