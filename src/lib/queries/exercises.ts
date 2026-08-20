import { createClient, requireUser } from '@/lib/supabase/server'
import { MUSCLE_GROUPS } from '@/lib/constants'
import type { Exercise } from '@/types/domain'

export async function getExercises(filters?: {
  q?: string
  group?: string
  mineOnly?: boolean
  limit?: number
}): Promise<Exercise[]> {
  const supabase = await createClient()

  let query = supabase.from('exercises').select('*').order('name').limit(filters?.limit ?? 100)

  if (filters?.q?.trim()) query = query.ilike('name', `%${filters.q.trim()}%`)
  if (filters?.mineOnly) query = query.not('owner_id', 'is', null)

  if (filters?.group) {
    const muscles = MUSCLE_GROUPS[filters.group]?.muscles
    if (muscles) query = query.in('primary_muscle', [...muscles])
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('exercises').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('exercise_favorites').select('exercise_id')
  if (error) throw error
  return new Set((data ?? []).map((f) => f.exercise_id))
}

/** Cuenta cuántos ejercicios hay en total y cuántos son propios. */
export async function getLibraryCounts(): Promise<{ total: number; propios: number }> {
  const user = await requireUser()
  const supabase = await createClient()

  const [total, propios] = await Promise.all([
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
  ])

  return { total: total.count ?? 0, propios: propios.count ?? 0 }
}
