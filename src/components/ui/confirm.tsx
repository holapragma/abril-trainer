'use client'

import { useEffect, useRef } from 'react'
import { Button } from './button'

/**
 * Confirmación para acciones destructivas. El único uso legítimo de un modal
 * centrado en esta app: todo lo demás va en Sheet.
 */
export function Confirm({
  open,
  title,
  body,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-modal bg-surface p-0 text-text backdrop:bg-black/40"
    >
      <div className="p-5">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {body && <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" full onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" full onClick={onConfirm} disabled={pending}>
            {pending ? 'Eliminando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
