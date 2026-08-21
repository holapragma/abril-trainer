import { createClient } from '@/lib/supabase/server'
import type { DashboardSummary } from '@/types/domain'

const EMPTY: DashboardSummary = {
  alumnos: { total: 0, activos: 0, nuevos: 0 },
  pagos: { cobrado_mes: 0, pendientes: 0, vencidos: 0 },
  clases_hoy: [],
  planificacion: { sin_rutina: 0, por_vencer: 0, sin_rutina_lista: [] },
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
    planificacion: {
      ...EMPTY.planificacion,
      ...(raw.planificacion ?? {}),
    },
  }
}
