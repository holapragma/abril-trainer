import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

/**
 * Cliente para Server Components y Server Actions.
 * Lee la sesión de las cookies, así que el servidor sabe quién es el usuario
 * sin un viaje al navegador.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Los Server Components no pueden escribir cookies. No pasa nada:
            // el middleware ya refrescó la sesión en esta misma petición.
          }
        },
      },
    },
  )
}

/**
 * El usuario autenticado, o null.
 *
 * getUser() y NUNCA getSession() en el servidor: getSession lee la cookie y
 * confía en ella; getUser valida el token contra Supabase. En el servidor la
 * cookie es entrada no confiable.
 */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * El usuario autenticado. Lanza si no hay sesión.
 *
 * Solo para LECTURAS: ahí el error.tsx del segmento es la respuesta correcta.
 * En una Server Action usá currentUserId(), que no lanza — un token vencido a
 * mitad de un formulario tiene que dar un mensaje, no borrar lo escrito.
 */
export async function requireUser() {
  const user = await getUser()
  if (!user) throw new Error('No hay sesión activa')
  return user
}

/** El id del usuario, o null. Para Server Actions, que no deben lanzar. */
export async function currentUserId(): Promise<string | null> {
  const user = await getUser()
  return user?.id ?? null
}
