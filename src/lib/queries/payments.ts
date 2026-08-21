import { createClient } from '@/lib/supabase/server'
import { withStatus } from '@/lib/payment-status'
import { appDateOf, startOfMonthISO } from '@/lib/today'
import type { PaymentStatus } from '@/lib/constants'
import type { PaymentWithStatus } from '@/types/domain'

export type PaymentWithStudent = PaymentWithStatus & {
  student: { id: string; first_name: string; last_name: string; photo_url: string | null } | null
}

/**
 * Se consulta la tabla `abril_trainer_payments`, no la vista `abril_trainer_payments_with_status`.
 *
 * La vista existe y es correcta, pero para traer el nombre del alumno hace falta
 * un embed, y PostgREST no garantiza detectar relaciones a través de una vista.
 * La tabla sí tiene la clave foránea, así que el embed siempre funciona; el
 * estado lo calcula paymentStatus(), que es una función pura de dos columnas.
 */
export async function getPayments(status?: PaymentStatus): Promise<PaymentWithStudent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abril_trainer_payments')
    .select('*, student:abril_trainer_students(id, first_name, last_name, photo_url)')
    .order('due_date', { ascending: false })
    .limit(200)

  if (error) throw error

  const rows = (data ?? []).map((p) => withStatus(p)) as unknown as PaymentWithStudent[]
  return status ? rows.filter((p) => p.status === status) : rows
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

export async function getPaymentTotals() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('abril_trainer_payments').select('amount, paid_at, due_date')

  if (error) throw error

  const rows = (data ?? []).map((p) => withStatus(p))

  // El mes arranca en la zona de Abril, igual que en abril_trainer_app_today():
  // con la fecha del servidor, este total y el del dashboard se contradicen
  // durante las primeras horas del día 1.
  const desde = startOfMonthISO()

  return {
    cobradoMes: rows
      .filter((p) => p.paid_at && appDateOf(p.paid_at) >= desde)
      .reduce((sum, p) => sum + Number(p.amount), 0),
    pendientes: rows.filter((p) => p.status === 'pendiente').length,
    vencidos: rows.filter((p) => p.status === 'vencido').length,
    montoPendiente: rows
      .filter((p) => p.status !== 'pagado')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  }
}
