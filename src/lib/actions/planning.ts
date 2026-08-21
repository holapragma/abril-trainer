'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { blockSchema, fieldErrorsOf, sessionExerciseSchema, sessionSchema } from '@/lib/schemas'
import { SESSION_LABELS } from '@/lib/constants'
import { fail, ok, type ActionResult } from '@/types/domain'

// ── Bloques ──────────────────────────────────────────────────────────────────

/**
 * Crea el bloque y, con él, las sesiones de la primera semana.
 *
 * Antes se entraba a un bloque nuevo y lo que había era una lista de semanas
 * vacías: la primera media docena de toques no era planificar, era construir
 * la estructura a mano. El número sale de sessions_per_week del plan del
 * alumno, que ya estaba cargado y no se usaba para nada.
 */
export async function createBlock(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = blockSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { sessions_per_week, ...block } = parsed.data
  const { data, error } = await supabase
    .from('abril_trainer_training_blocks')
    .insert({ ...block, status: 'activo' })
    .select('id')
    .single()

  if (error) {
    console.error('createBlock:', error.message)
    return fail('No se pudo crear el bloque')
  }

  if (sessions_per_week && sessions_per_week > 0) {
    const rows = SESSION_LABELS.slice(0, sessions_per_week).map((day_label, i) => ({
      block_id: data.id,
      week_number: 1,
      day_label,
      order_index: i,
    }))

    // Si esto falla, el bloque igual sirve: se agregan las sesiones a mano. No
    // vale la pena tirar abajo la creación entera por las etiquetas.
    const { error: sessErr } = await supabase.from('abril_trainer_training_sessions').insert(rows)
    if (sessErr) console.error('createBlock/sessions:', sessErr.message)
  }

  revalidatePath(`/alumnos/${parsed.data.student_id}`)
  revalidatePath('/')
  return ok({ id: data.id })
}

/**
 * Crea el bloque copiando otro: semanas, sesiones, ejercicios y prescripciones.
 * Lo que NO viaja: asistencia, pagos ni nada personal del alumno de origen.
 */
export async function copyBlock(input: {
  block_id: string
  student_id: string
  name?: string
  starts_on?: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_copy_block', {
    p_block_id: input.block_id,
    p_student_id: input.student_id,
    p_name: input.name ?? undefined,
    p_starts_on: input.starts_on ?? undefined,
  })

  if (error) {
    console.error('copyBlock:', error.message)
    return fail('No se pudo copiar la planificación')
  }
  if (!data) return fail('No se pudo copiar la planificación')

  revalidatePath(`/alumnos/${input.student_id}`)
  revalidatePath(`/alumnos/${input.student_id}/entrenamiento`)
  revalidatePath('/')
  return ok({ id: data })
}

export async function updateBlock(
  id: string,
  studentId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_training_blocks')
    .update({
      name: parsed.data.name,
      goal: parsed.data.goal,
      starts_on: parsed.data.starts_on,
      total_weeks: parsed.data.total_weeks,
    })
    .eq('id', id)

  if (error) {
    console.error('updateBlock:', error.message)
    return fail('No se pudo guardar el bloque')
  }

  revalidatePath(`/alumnos/${studentId}/entrenamiento`)
  return ok(undefined)
}

export async function finishBlock(id: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_training_blocks')
    .update({ status: 'terminado' })
    .eq('id', id)

  if (error) {
    console.error('finishBlock:', error.message)
    return fail('No se pudo cerrar el bloque')
  }

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/')
  return ok(undefined)
}

export async function deleteBlock(id: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_training_blocks').delete().eq('id', id)

  if (error) {
    console.error('deleteBlock:', error.message)
    return fail('No se pudo eliminar el bloque')
  }

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/')
  return ok(undefined)
}

// ── Sesiones ─────────────────────────────────────────────────────────────────

export async function createSession(
  input: unknown,
  studentId: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()

  // El orden es el siguiente hueco dentro de la semana.
  const { data: existing } = await supabase
    .from('abril_trainer_training_sessions')
    .select('order_index')
    .eq('block_id', parsed.data.block_id)
    .eq('week_number', parsed.data.week_number)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('abril_trainer_training_sessions')
    .insert({ ...parsed.data, order_index: nextOrder })
    .select('id')
    .single()

  if (error) {
    console.error('createSession:', error.message)
    return fail('No se pudo crear la sesión')
  }

  revalidatePath(`/alumnos/${studentId}/entrenamiento/${parsed.data.block_id}`)
  return ok({ id: data.id })
}

export async function updateSession(
  id: string,
  path: string,
  input: { day_label?: string; name?: string | null; notes?: string | null },
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_training_sessions').update(input).eq('id', id)

  if (error) {
    console.error('updateSession:', error.message)
    return fail('No se pudo guardar la sesión')
  }

  revalidatePath(path)
  return ok(undefined)
}

export async function deleteSession(id: string, path: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_training_sessions').delete().eq('id', id)

  if (error) {
    console.error('deleteSession:', error.message)
    return fail('No se pudo eliminar la sesión')
  }

  revalidatePath(path)
  return ok(undefined)
}

/**
 * Duplica una semana entera vía RPC.
 *
 * Es la operación que convierte «armar 6 semanas» en «armar 1 y ajustar 5».
 * La función es security invoker, así que la RLS sigue aplicando y solo se
 * pueden duplicar semanas de bloques propios.
 */
export async function duplicateWeek(
  blockId: string,
  fromWeek: number,
  path: string,
  toWeek?: number,
): Promise<ActionResult<{ copied: number }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('abril_trainer_duplicate_week', {
    p_block_id: blockId,
    p_from_week: fromWeek,
    p_to_week: toWeek,
  })

  if (error) {
    console.error('duplicateWeek:', error.message)
    if (error.message.includes('ya tiene sesiones')) {
      return fail('Esa semana ya tiene sesiones. Vaciala primero o elegí otra.')
    }
    return fail('No se pudo duplicar la semana')
  }

  if (!data) return fail('La semana de origen no tiene sesiones para copiar')

  revalidatePath(path)
  return ok({ copied: data })
}

// ── Ejercicios de una sesión ─────────────────────────────────────────────────

export async function addExercisesToSession(
  sessionId: string,
  exerciseIds: string[],
  path: string,
): Promise<ActionResult<{ added: number }>> {
  if (exerciseIds.length === 0) return ok({ added: 0 })

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('abril_trainer_session_exercises')
    .select('order_index')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: false })
    .limit(1)

  let order = (existing?.[0]?.order_index ?? -1) + 1

  const rows = exerciseIds.map((exercise_id) => ({
    session_id: sessionId,
    exercise_id,
    order_index: order++,
    sets: 3,
    reps: '10',
    rest_seconds: 90,
  }))

  const { error } = await supabase.from('abril_trainer_session_exercises').insert(rows)

  if (error) {
    console.error('addExercisesToSession:', error.message)
    return fail('No se pudieron agregar los ejercicios')
  }

  revalidatePath(path)
  return ok({ added: rows.length })
}

export async function updateSessionExercise(
  id: string,
  input: unknown,
  path: string,
): Promise<ActionResult> {
  const parsed = sessionExerciseSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { session_id: _sid, exercise_id: _eid, ...fields } = parsed.data

  const { error } = await supabase.from('abril_trainer_session_exercises').update(fields).eq('id', id)

  if (error) {
    console.error('updateSessionExercise:', error.message)
    return fail('No se pudo guardar el ejercicio')
  }

  revalidatePath(path)
  return ok(undefined)
}

export async function removeSessionExercise(id: string, path: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_session_exercises').delete().eq('id', id)

  if (error) {
    console.error('removeSessionExercise:', error.message)
    return fail('No se pudo quitar el ejercicio')
  }

  revalidatePath(path)
  return ok(undefined)
}

/**
 * Reordena intercambiando el order_index de dos filas.
 *
 * Con flechas arriba/abajo en vez de arrastre: arrastrar dentro de una lista
 * que hace scroll, en un navegador móvil, es frágil y poco accesible. Las
 * flechas siempre funcionan.
 */
export async function swapSessionExercises(
  a: { id: string; order_index: number },
  b: { id: string; order_index: number },
  path: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const [r1, r2] = await Promise.all([
    supabase.from('abril_trainer_session_exercises').update({ order_index: b.order_index }).eq('id', a.id),
    supabase.from('abril_trainer_session_exercises').update({ order_index: a.order_index }).eq('id', b.id),
  ])

  if (r1.error || r2.error) {
    console.error('swapSessionExercises:', r1.error?.message ?? r2.error?.message)
    return fail('No se pudo reordenar')
  }

  revalidatePath(path)
  return ok(undefined)
}
