import { createClient } from '@/lib/supabase/server'
import type { DashboardSummary } from '@/types/domain'

const EMPTY: DashboardSummary = {
  alumnos: { total: 0, activos: 0, nuevos: 0 },
  pagos: { cobrado_mes: 0, pendientes: 0, vencidos: 0 },
  clases_hoy: [],
  planificacion: { sin_rutina: 0, por_vencer: 0 },
}

/**
 * Los ocho agregados del dashboard en una sola llamada.
 *
 * Van en SQL, no en el cliente: traerse todos los alumnos y todos los pagos para
 * contarlos en JavaScript funciona con 20 alumnos y se degrada solo.
 */
export async function getDashboard(): Promise<DashboardSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_dashboard_summary')

  if (error) throw error
  if (!data) return EMPTY

  const raw = data as Partial<DashboardSummary>
  return {
    alumnos: raw.alumnos ?? EMPTY.alumnos,
    pagos: raw.pagos ?? EMPTY.pagos,
    clases_hoy: raw.clases_hoy ?? [],
    planificacion: raw.planificacion ?? EMPTY.planificacion,
  }
}

/** Alumnos activos sin bloque de entrenamiento activo. */
export async function getStudentsWithoutPlan(limit = 5) {
  const supabase = await createClient()

  const [students, blocks] = await Promise.all([
    supabase
      .from('abril_trainer_students')
      .select('id, first_name, last_name, photo_url')
      .eq('status', 'activo'),
    supabase.from('abril_trainer_training_blocks').select('student_id').eq('status', 'activo'),
  ])

  if (students.error) throw students.error
  if (blocks.error) throw blocks.error

  const withPlan = new Set((blocks.data ?? []).map((b) => b.student_id))
  return (students.data ?? []).filter((s) => !withPlan.has(s.id)).slice(0, limit)
}
