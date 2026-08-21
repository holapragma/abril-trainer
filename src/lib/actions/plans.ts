'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { fieldErrorsOf, membershipSchema, planSchema } from '@/lib/schemas'
import { todayISO } from '@/lib/today'
import { fail, ok, type ActionResult } from '@/types/domain'

export async function createPlan(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abril_trainer_plans')
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
  const { error } = await supabase.from('abril_trainer_plans').update(parsed.data).eq('id', id)

  if (error) {
    console.error('updatePlan:', error.message)
    return fail('No se pudo guardar el plan')
  }

  revalidatePath('/planes')
  return ok(undefined)
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_plans').delete().eq('id', id)

  if (error) {
    // abril_trainer_memberships.plan_id es on delete restrict: si el plan está en uso, no se
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
 *
 * Va por RPC y no por dos escrituras seguidas: cerrar la membresía anterior y
 * abrir la nueva tienen que pasar juntas o no pasar. Antes, si el alta fallaba,
 * el alumno se quedaba sin plan y el mensaje de error no lo decía.
 */
export async function assignPlan(input: unknown): Promise<ActionResult> {
  const parsed = membershipSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { student_id, plan_id, price, starts_on } = parsed.data

  const { error } = await supabase.rpc('abril_trainer_assign_plan', {
    p_student_id: student_id,
    p_plan_id: plan_id,
    p_price: price,
    p_starts_on: starts_on,
  })

  if (error) {
    console.error('assignPlan:', error.message)
    return fail('No se pudo asignar el plan. El plan anterior sigue vigente.')
  }

  revalidatePath(`/alumnos/${student_id}`)
  revalidatePath('/')
  return ok(undefined)
}

export async function endMembership(studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_memberships')
    .update({ status: 'finalizada', ends_on: todayISO() })
    .eq('student_id', studentId)
    .eq('status', 'activa')

  if (error) {
    console.error('endMembership:', error.message)
    return fail('No se pudo finalizar el plan')
  }

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/')
  return ok(undefined)
}
