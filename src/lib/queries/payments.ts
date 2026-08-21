import { createClient } from '@/lib/supabase/server'
import { withStatus } from '@/lib/payment-status'
import { addMonths, todayISO } from '@/lib/today'
import type { PaymentStatus } from '@/lib/constants'
import type { PaymentWithStatus } from '@/types/domain'

export type PaymentWithStudent = PaymentWithStatus & {
  student: { id: string; first_name: string; last_name: string; photo_url: string | null } | null
}

/** Cuántos pagos trae cada tanda de «cargar más». */
export const PAYMENTS_PAGE = 50

/**
 * Se consulta la tabla `abril_trainer_payments`, no la vista `abril_trainer_payments_with_status`.
 *
 * La vista existe y es correcta, pero para traer el nombre del alumno hace falta
 * un embed, y PostgREST no garantiza detectar relaciones a través de una vista.
 * La tabla sí tiene la clave foránea, así que el embed siempre funciona; el
 * estado lo calcula paymentStatus(), que es una función pura de dos columnas.
 *
 * El filtro por estado baja a SQL en vez de recortarse en memoria: antes se
 * traían 200 filas y se filtraban acá, así que con más de 200 pagos el chip
 * «vencido» mostraba un subconjunto sin decirlo.
 */
export async function getPayments(
  status?: PaymentStatus,
  pages = 1,
): Promise<{ items: PaymentWithStudent[]; hasMore: boolean }> {
  const supabase = await createClient()
  const take = PAYMENTS_PAGE * Math.max(1, pages)
  const hoy = todayISO()

  let query = supabase
    .from('abril_trainer_payments')
    .select('*, student:abril_trainer_students(id, first_name, last_name, photo_url)')
    .order('due_date', { ascending: false })
    .limit(take + 1)

  // Las tres condiciones son las mismas que paymentStatus(), en SQL.
  if (status === 'pagado') query = query.not('paid_at', 'is', null)
  if (status === 'pendiente') query = query.is('paid_at', null).gte('due_date', hoy)
  if (status === 'vencido') query = query.is('paid_at', null).lt('due_date', hoy)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []).map((p) => withStatus(p)) as unknown as PaymentWithStudent[]
  return { items: rows.slice(0, take), hasMore: rows.length > take }
}

export async function getStudentPayments(studentId: string): Promise<PaymentWithStatus[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_payments')
    .select('*')
    .eq('student_id', studentId)
    .order('due_date', { ascending: false })

  if (error) throw error
  return (data ?? []).map((p) => withStatus(p))
}

/**
 * Lo que el alta de un cobro suelto puede precargar de la membresía activa:
 * importe pactado, próximo vencimiento del ciclo y a qué membresía imputarlo.
 * Devuelve null si el alumno no tiene plan — ahí no hay nada que sugerir.
 */
export async function getMembershipHint(studentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abril_trainer_memberships')
    .select('id, price, starts_on, plan:abril_trainer_plans(name)')
    .eq('student_id', studentId)
    .eq('status', 'activa')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // El último vencimiento de esa membresía marca dónde va el ciclo; si no hay
  // ninguno todavía, el ciclo arranca en el inicio de la membresía.
  const { data: last } = await supabase
    .from('abril_trainer_payments')
    .select('due_date')
    .eq('membership_id', data.id)
    .order('due_date', { ascending: false })
    .limit(1)

  const base = last?.[0]?.due_date ?? data.starts_on
  const plan = data.plan as unknown as { name: string } | null

  return {
    membership_id: data.id,
    amount: Number(data.price),
    due_date: last?.[0] ? addMonths(base, 1) : base,
    plan_name: plan?.name ?? null,
  }
}

/**
 * Los totales salen de la RPC, no de contar filas acá.
 *
 * Antes /pagos los calculaba en TypeScript sobre las filas que había traído y
 * el dashboard los calculaba en SQL: dos implementaciones de la misma regla,
 * que en el cambio de mes podían mostrar números distintos.
 */
export async function getPaymentTotals() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_payment_totals')
  if (error) throw error

  const raw = (data ?? {}) as Partial<{
    cobrado_mes: number
    pendientes: number
    vencidos: number
    adeudado: number
  }>

  return {
    cobradoMes: Number(raw.cobrado_mes ?? 0),
    pendientes: Number(raw.pendientes ?? 0),
    vencidos: Number(raw.vencidos ?? 0),
    montoPendiente: Number(raw.adeudado ?? 0),
  }
}
