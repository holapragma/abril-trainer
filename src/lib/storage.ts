import { createClient } from '@/lib/supabase/server'
import { STORAGE } from '@/lib/constants'

/**
 * URL firmada para un objeto del bucket privado de avatares.
 * Una hora alcanza de sobra para una sesión de trabajo y no deja enlaces
 * eternos dando vueltas.
 */
export async function signedAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const supabase = await createClient()
  const { data } = await supabase.storage.from(STORAGE.avatars).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/** Firma varias rutas de una vez: evita N peticiones en una lista. */
export async function signedAvatarUrls(
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const clean = [...new Set(paths.filter((p): p is string => !!p))]
  const out = new Map<string, string>()
  if (clean.length === 0) return out

  const supabase = await createClient()
  const { data } = await supabase.storage.from(STORAGE.avatars).createSignedUrls(clean, 3600)

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl)
  }
  return out
}

// La URL pública de la media vive en lib/media-url.ts, que no importa nada del
// servidor y por eso también sirve en componentes 'use client'.
export { exerciseMediaPublicUrl } from '@/lib/media-url'
