'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './button'

/**
 * Panel inferior deslizante. Es el patrón móvil por defecto de esta app:
 * editar algo sin perder de vista el contexto que lo rodea.
 *
 * Sobre <dialog> nativo, que ya trae atrapado de foco, cierre con Escape y
 * capa inerte de fondo — sin librería de accesibilidad de por medio.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Bloquea el scroll del fondo mientras el panel está abierto.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Clic en el fondo (fuera del panel) cierra.
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'w-full max-w-lg rounded-t-modal bg-surface p-0 text-text sm:rounded-modal',
        'mt-auto mb-0 sm:my-auto',
        'backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        'open:animate-in max-h-[90dvh] overflow-hidden',
        className,
      )}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-start gap-3 border-b border-border px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg leading-tight font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-2">
            <X size={20} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

        {footer && (
          <footer className="safe-bottom border-t border-border bg-surface px-4 py-3">{footer}</footer>
        )}
      </div>
    </dialog>
  )
}
