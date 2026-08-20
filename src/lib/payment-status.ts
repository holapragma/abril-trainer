import { todayISO } from '@/lib/today'
import type { PaymentStatus } from '@/lib/constants'

/**
 * Estado de un pago, derivado de paid_at y due_date.
 *
 * La misma regla vive en la vista SQL `abril_trainer_payments_with_status` (útil
 * para consultas manuales y para la RPC del dashboard), pero la app la calcula
 * acá a propósito.
 *
 * El motivo: para listar pagos con el nombre del alumno hace falta un embed
 * (`student:abril_trainer_students(...)`), y PostgREST no garantiza detectar
 * relaciones a través de una vista. Consultando la tabla `abril_trainer_payments`,
 * que sí tiene la clave foránea, el embed siempre funciona — y el estado es una
 * función pura de dos columnas, trivial de calcular y de testear.
 */
export function paymentStatus(p: {
  paid_at: string | null
  due_date: string
}): PaymentStatus {
  if (p.paid_at) return 'pagado'

  // Comparación de cadenas 'YYYY-MM-DD': ordenan igual que las fechas y evitan
  // que la zona del servidor corra un día el vencimiento.
  return p.due_date < todayISO() ? 'vencido' : 'pendiente'
}

export function withStatus<T extends { paid_at: string | null; due_date: string }>(
  p: T,
): T & { status: PaymentStatus } {
  return { ...p, status: paymentStatus(p) }
}
