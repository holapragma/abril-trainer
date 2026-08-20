'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf, paymentSchema } from '@/lib/schemas'
import { fail, ok, type ActionResult } from '@/types/domain'

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

  revalidatePath('/pagos')
  revalidatePath(`/alumnos/${parsed.data.student_id}/pagos`)
  revalidatePath('/')
  return ok({ id: data.id })
}

/** Alterna entre pagado y pendiente. paid_at es el único dato real. */
export async function togglePaid(id: string, paid: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_payments')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) {
    console.error('togglePaid:', error.message)
    return fail('No se pudo actualizar el pago')
  }

  revalidatePath('/pagos')
  revalidatePath('/')
  return ok(undefined)
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_payments').delete().eq('id', id)

  if (error) {
    console.error('deletePayment:', error.message)
    return fail('No se pudo eliminar el pago')
  }

  revalidatePath('/pagos')
  revalidatePath('/')
  return ok(undefined)
}
