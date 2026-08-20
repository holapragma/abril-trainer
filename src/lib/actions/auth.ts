'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { fail, ok, type ActionResult } from '@/types/domain'

const loginSchema = z.object({
  email: z.email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return fail('Revisá los datos', fieldErrors)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Mensaje genérico a propósito: distinguir «email inexistente» de
    // «contraseña incorrecta» le regala a un atacante la mitad del trabajo.
    console.error('login:', error.message)
    return fail('Email o contraseña incorrectos')
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'El nombre no puede estar vacío').max(80),
  business_name: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos')

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { error } = await supabase
    .from('abril_trainer_profiles')
    .update({
      full_name: parsed.data.full_name,
      business_name: parsed.data.business_name || null,
      phone: parsed.data.phone || null,
    })
    .eq('id', userId)

  if (error) {
    console.error('updateProfile:', error.message)
    return fail('No se pudo guardar el perfil')
  }

  revalidatePath('/ajustes')
  return ok(undefined)
}
