import { createClient, requireUser } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'

/**
 * Perfil de la entrenadora.
 *
 * Normalmente la fila la crea el trigger on_auth_user_created. Pero si el
 * usuario se creó en el panel de Supabase ANTES de aplicar el esquema, el
 * trigger no existía y la fila falta — y entonces la app entera reventaría en el
 * primer render sin pista de por qué. Es un orden de pasos perfectamente
 * plausible, así que acá se repara sola.
 */
export async function getProfile(): Promise<Tables<'abril_trainer_profiles'>> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abril_trainer_profiles')
    .select('id, role, full_name, photo_url, phone, business_name, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Entrenadora'

  const { data: created, error: insertError } = await supabase
    .from('abril_trainer_profiles')
    .insert({ id: user.id, full_name: fallbackName, role: 'trainer' })
    .select('id, role, full_name, photo_url, phone, business_name, created_at')
    .single()

  if (insertError) {
    console.error('getProfile/repair:', insertError.message)
    throw insertError
  }

  return created
}
