import { createClient, requireUser } from '@/lib/supabase/server'
import { MUSCLE_GROUPS } from '@/lib/constants'
import type { Exercise } from '@/types/domain'

/** Cuántos ejercicios trae cada tanda de «cargar más». */
export const EXERCISES_PAGE = 60

/**
 * Minúsculas y sin acentos, igual que la columna generada name_norm
 * (abril_trainer_unaccent en la migración 0014). Las dos caras tienen que
 * normalizar igual o la búsqueda deja de encontrar lo que hay.
 *
 * NFD separa la letra de su tilde y el rango \u0300-\u036f borra las tildes:
 * 'Tríceps' → 'triceps', que es lo mismo que guarda name_norm.
 */
export function normalizeSearch(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function getExercises(filters?: {
  q?: string
  group?: string
  mineOnly?: boolean
  /** Cuántas tandas mostrar. La biblioteca tiene 361: sin esto solo se veían las primeras 100. */
  pages?: number
}): Promise<{ items: Exercise[]; hasMore: boolean }> {
  const supabase = await createClient()

  // Se pide uno de más para saber si queda algo detrás, sin un count aparte.
  const take = EXERCISES_PAGE * Math.max(1, filters?.pages ?? 1)

  let query = supabase.from('abril_trainer_exercises').select('*').order('name').limit(take + 1)

  const q = normalizeSearch(filters?.q ?? '')
  if (q) query = query.like('name_norm', `%${q}%`)
  if (filters?.mineOnly) query = query.not('owner_id', 'is', null)

  if (filters?.group) {
    const muscles = MUSCLE_GROUPS[filters.group]?.muscles
    if (muscles) query = query.in('primary_muscle', [...muscles])
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  return { items: rows.slice(0, take), hasMore: rows.length > take }
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('abril_trainer_exercises').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('abril_trainer_exercise_favorites').select('exercise_id')
  if (error) throw error
  return new Set((data ?? []).map((f) => f.exercise_id))
}

/** Cuenta cuántos ejercicios hay en total y cuántos son propios. */
export async function getLibraryCounts(): Promise<{ total: number; propios: number }> {
  const user = await requireUser()
  const supabase = await createClient()

  const [total, propios] = await Promise.all([
    supabase.from('abril_trainer_exercises').select('*', { count: 'exact', head: true }),
    supabase.from('abril_trainer_exercises').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
  ])

  return { total: total.count ?? 0, propios: propios.count ?? 0 }
}
