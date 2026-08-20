'use client'

import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { JumpRope, Kettlebell } from '@/components/gym-icons'
import { cn } from '@/lib/cn'

const ICONS = [JumpRope, Dumbbell, Kettlebell]
const STEP_MS = 900
const HOLD_MS = 2500
const FADE_MS = 380

/**
 * Bienvenida animada antes del formulario de login: un ícono grande que va
 * cambiando, con la fila de abajo marcando cuál es el activo. Puramente
 * decorativa — el formulario ya está montado detrás, así que si algo falla acá
 * (JS lento, reduced-motion) igual se puede entrar sin esperar nada.
 */
export function LoginSplash() {
  const [visible, setVisible] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduceMotion ? 900 : HOLD_MS

    const step = reduceMotion
      ? undefined
      : setInterval(() => setIndex((i) => (i + 1) % ICONS.length), STEP_MS)
    const leave = setTimeout(() => setLeaving(true), hold)
    const hide = setTimeout(() => setVisible(false), hold + FADE_MS)

    return () => {
      if (step) clearInterval(step)
      clearTimeout(leave)
      clearTimeout(hide)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-text transition-opacity ease-[cubic-bezier(.22,.61,.36,1)]',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex flex-1 items-center justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-modal border border-bg/20">
          {ICONS.map((Icon, i) => (
            <Icon
              key={i}
              size={56}
              strokeWidth={1.6}
              className={cn(
                'absolute text-accent transition-all duration-500 ease-[cubic-bezier(.22,.61,.36,1)]',
                i === index ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 bg-bg py-8">
        {ICONS.map((Icon, i) => (
          <Icon
            key={i}
            size={26}
            strokeWidth={1.6}
            className={cn(
              'transition-colors duration-300',
              i === index ? 'text-accent' : 'text-text-3/50',
            )}
          />
        ))}
      </div>
    </div>
  )
}
