'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf, paymentSchema } from '@/lib/schemas'
import { fail, ok, type ActionResult } from '@/types/domain'

/** Todas las pantallas donde un pago cambia algo. */
function revalidatePayments(studentId?: string) {
  revalidatePath('/pagos')
  revalidatePath('/')
  if (studentId) revalidatePath(`/alumnos/${studentId}/pagos`)
}

export async function createPayment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { paid, ...rest } = parsed.data

  const { data, error } = await supabase
    .from('abril_trainer_payments')
    .insert({ ...rest, paid_at: paid ? new Date().toISOString() : null })
    .select('id')
    .single()

  if (error) {
    console.error('createPayment:', error.message)
    return fail('No se pudo registrar el pago')
  }

  revalidatePayments(parsed.data.student_id)
  return ok({ id: data.id })
}

/**
 * Marca un pago como pagado o pendiente.
 *
 * Al cobrar, la RPC abre el cobro del ciclo siguiente con el precio congelado
 * de la membresía: así el mes que viene ya está esperando sin que nadie tenga
 * que acordarse, y sin un cron que se rompa. Devuelve si encadenó, para poder
 * decírselo a Abril.
 *
 * Desmarcar no borra el siguiente a propósito — sería tirar una fila que quizá
 * ya editó.
 */
export async function togglePaid(
  id: string,
  paid: boolean,
): Promise<ActionResult<{ chained: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_settle_payment', {
    p_payment_id: id,
    p_paid: paid,
  })

  if (error) {
    console.error('togglePaid:', error.message)
    return fail('No se pudo actualizar el pago')
  }

  revalidatePayments()
  return ok({ chained: data !== null })
}

/**
 * Abre los cobros del mes que falten, uno por membresía activa.
 *
 * Es idempotente: tocarlo dos veces no duplica nada, porque la RPC salta las
 * membresías que ya tienen cobro en ese mes.
 */
export async function generateMonthlyCharges(): Promise<ActionResult<{ created: number }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_generate_monthly_charges', {})

  if (error) {
    console.error('generateMonthlyCharges:', error.message)
    return fail('No se pudieron generar los cobros')
  }

  revalidatePayments()
  return ok({ created: data ?? 0 })
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_payments').delete().eq('id', id)

  if (error) {
    console.error('deletePayment:', error.message)
    return fail('No se pudo eliminar el pago')
  }

  revalidatePayments()
  return ok(undefined)
}
