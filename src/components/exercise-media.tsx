'use client'

import { useEffect, useRef, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Media de un ejercicio.
 *
 * El catálogo son MP4 cortos en bucle, no GIFs: mismo resultado visual, un
 * orden de magnitud menos de bytes. `playsInline` es imprescindible o iOS abre
 * el vídeo a pantalla completa al reproducirlo.
 */
export function ExerciseMedia({
  url,
  alt,
  className,
  autoPlay = true,
}: {
  url: string | null
  alt: string
  className?: string
  autoPlay?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const [inView, setInView] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = url ? /\.(mp4|webm|mov|m4v)$/i.test(url) : false

  // Reproduce solo cuando entra en viewport: en el grid de la biblioteca hay
  // decenas de vídeos a la vez, y reproducirlos todos de una gasta batería y
  // banda ancha sin que se vean. rootMargin adelanta el arranque un poco antes
  // de que el card sea visible, para que no se vea el primer frame en negro.
  useEffect(() => {
    if (!autoPlay || !isVideo) return
    const el = videoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin: '200px 0px', threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoPlay, isVideo])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (inView) {
      // El navegador puede rechazar el play() si el usuario ya navegó a otra
      // pantalla antes de que resuelva; no es un error real.
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [inView])

  const frame = cn(
    'flex items-center justify-center overflow-hidden rounded-card bg-surface-2',
    className,
  )

  if (!url || failed) {
    return (
      <div className={frame}>
        <Dumbbell className="text-text-3" size={40} />
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className={frame}>
        <video
          ref={videoRef}
          src={url}
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
