'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/ui/states'
import { uploadStudentPhoto } from '@/lib/actions/students'

/**
 * Foto del alumno.
 *
 * Existe para reconocer una cara al pasar lista, que es donde importa: en una
 * lista de seis personas, dos iniciales iguales no alcanzan.
 *
 * La vista previa sale del archivo local, así que se ve antes de que termine
 * la subida — con el wifi del gimnasio esa diferencia es de varios segundos.
 */
export function StudentPhoto({
  studentId,
  initials,
  currentUrl,
}: {
  studentId: string
  initials: string
  currentUrl: string | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // La URL del objeto local se libera al cambiarla o al desmontar: si no, cada
  // foto elegida queda ocupando memoria hasta que se recargue la página.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function choose(file: File) {
    setError(null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })

    const fd = new FormData()
    fd.set('photo', file)

    startTransition(async () => {
      const res = await uploadStudentPhoto(studentId, fd)
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error)
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex items-center gap-4">
        <Avatar src={preview ?? currentUrl} initials={initials} size="lg" />
        <div className="min-w-0 flex-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={17} />
            {pending ? 'Subiendo…' : currentUrl ? 'Cambiar foto' : 'Agregar foto'}
          </Button>
          <p className="mt-1.5 text-xs text-text-3">JPG o PNG, hasta 5 MB</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) choose(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
