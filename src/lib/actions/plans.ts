'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { fieldErrorsOf, membershipSchema, planSchema } from '@/lib/schemas'
import { fail, ok, type ActionResult } from '@/types/domain'

export async function createPlan(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .insert({ ...parsed.data, trainer_id: userId })
    .select('id')
    .single()

  if (error) {
    console.error('createPlan:', error.message)
    return fail('No se pudo crear el plan')
  }

  revalidatePath('/planes')
  return ok({ id: data.id })
}

export async function updatePlan(id: string, input: unknown): Promise<ActionResult> {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { error } = await supabase.from('plans').update(parsed.data).eq('id', id)

  if (error) {
    console.error('updatePlan:', error.message)
    return fail('No se pudo guardar el plan')
  }

  revalidatePath('/planes')
  return ok(undefined)
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('plans').delete().eq('id', id)

  if (error) {
    // memberships.plan_id es on delete restrict: si el plan está en uso, no se
    // borra. Es deliberado — borrarlo descuadraría el histórico de pagos.
    if (error.code === '23503') {
      return fail('Este plan está asignado a algún alumno. Desactivalo en vez de borrarlo.')
    }
    console.error('deletePlan:', error.message)
    return fail('No se pudo eliminar el plan')
  }

  revalidatePath('/planes')
  return ok(undefined)
}

/**
 * Asigna un plan a un alumno.
 *
 * El precio se copia del plan pero queda congelado en la membresía: si Abril
 * sube la tarifa el año que viene, las membresías vigentes no cambian de importe
 * y el histórico sigue cuadrando.
 */
export async function assignPlan(input: unknown): Promise<ActionResult> {
  const parsed = membershipSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { student_id } = parsed.data

  // Solo puede haber una membresía activa por alumno (índice único parcial),
  // así que la anterior se finaliza antes de crear la nueva.
  const { error: closeErr } = await supabase
    .from('memberships')
    .update({ status: 'finalizada', ends_on: new Date().toISOString().slice(0, 10) })
    .eq('student_id', student_id)
    .eq('status', 'activa')

  if (closeErr) {
    console.error('assignPlan/close:', closeErr.message)
    return fail('No se pudo cerrar el plan anterior')
  }

  const { error } = await supabase.from('memberships').insert({ ...parsed.data, status: 'activa' })

  if (error) {
    console.error('assignPlan:', error.message)
    return fail('No se pudo asignar el plan')
  }

  revalidatePath(`/alumnos/${student_id}`)
  revalidatePath('/')
  return ok(undefined)
}

export async function endMembership(studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('memberships')
    .update({ status: 'finalizada', ends_on: new Date().toISOString().slice(0, 10) })
    .eq('student_id', studentId)
    .eq('status', 'activa')

  if (error) {
    console.error('endMembership:', error.message)
    return fail('No se pudo finalizar el plan')
  }

  revalidatePath(`/alumnos/${studentId}`)
  return ok(undefined)
}
