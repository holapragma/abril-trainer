import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types/domain'

export async function getPlans(onlyActive = false): Promise<Plan[]> {
  const supabase = await createClient()
  let query = supabase.from('plans').select('*').order('name')
  if (onlyActive) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPlan(id: string): Promise<Plan | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('plans').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/** Cuántos alumnos tiene cada plan, para la lista de planes. */
export async function getPlanUsage(): Promise<Map<string, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('plan_id')
    .eq('status', 'activa')

  if (error) throw error

  const out = new Map<string, number>()
  for (const row of data ?? []) {
    out.set(row.plan_id, (out.get(row.plan_id) ?? 0) + 1)
  }
  return out
}
