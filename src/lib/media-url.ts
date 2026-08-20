import { STORAGE } from '@/lib/constants'

/**
 * URL pública de la media de un ejercicio.
 *
 * Vive aparte de storage.ts a propósito: aquel importa el cliente de servidor de
 * Supabase, y esta función se usa también desde componentes 'use client'.
 * El bucket es público, así que se arma sin firmar y el CDN la cachea.
 */
export function exerciseMediaPublicUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null

  return `${base}/storage/v1/object/public/${STORAGE.media}/${path}`
}
