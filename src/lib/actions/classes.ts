'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { classSchema, fieldErrorsOf } from '@/lib/schemas'
import { todayISO } from '@/lib/today'
import { fail, ok, type ActionResult } from '@/types/domain'
import type { Enums } from '@/types/database.types'

export async function createClass(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abril_trainer_classes')
    .insert({ ...parsed.data, trainer_id: userId })
    .select('id')
    .single()

  if (error) {
    console.error('createClass:', error.message)
    return fail('No se pudo crear la clase')
  }

  revalidatePath('/clases')
  revalidatePath('/')
  return ok({ id: data.id })
}

export async function updateClass(id: string, input: unknown): Promise<ActionResult> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_classes').update(parsed.data).eq('id', id)

  if (error) {
    console.error('updateClass:', error.message)
    return fail('No se pudo guardar la clase')
  }

  revalidatePath('/clases')
  revalidatePath(`/clases/${id}`)
  revalidatePath('/')
  return ok(undefined)
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_classes').delete().eq('id', id)

  if (error) {
    console.error('deleteClass:', error.message)
    return fail('No se pudo eliminar la clase')
  }

  revalidatePath('/clases')
  revalidatePath('/')
  return ok(undefined)
}

export async function enrollStudent(classId: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_class_enrollments')
    .insert({ class_id: classId, student_id: studentId })

  if (error) {
    // El cupo lo hace cumplir un trigger en la base, no solo el formulario.
    if (error.message.includes('completa')) return fail(error.message)
    if (error.code === '23505') return fail('Ese alumno ya está en la clase')
    console.error('enrollStudent:', error.message)
    return fail('No se pudo inscribir al alumno')
  }

  revalidatePath(`/clases/${classId}`)
  revalidatePath('/clases')
  return ok(undefined)
}

export async function unenrollStudent(classId: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_class_enrollments')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)

  if (error) {
    console.error('unenrollStudent:', error.message)
    return fail('No se pudo quitar al alumno')
  }

  revalidatePath(`/clases/${classId}`)
  revalidatePath('/clases')
  return ok(undefined)
}

/**
 * Suspende o mueve una ocurrencia puntual de una clase.
 *
 * Hasta ahora un feriado se resolvía marcando a todos «justificado», que es
 * falsear la asistencia para representar algo que no pasó. La excepción dice lo
 * que realmente ocurrió: ese día no hubo clase, o fue otro día.
 */
export async function setClassException(input: {
  class_id: string
  date: string
  kind: 'cancelada' | 'movida'
  new_date?: string | null
  new_start_time?: string | null
  reason?: string | null
}): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return fail('Fecha inválida')
  if (input.kind === 'movida' && !input.new_date) {
    return fail('Elegí a qué día se mueve')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_class_exceptions').upsert(
    {
      class_id: input.class_id,
      date: input.date,
      kind: input.kind,
      new_date: input.kind === 'movida' ? input.new_date : null,
      new_start_time: input.kind === 'movida' ? (input.new_start_time ?? null) : null,
      reason: input.reason?.trim() || null,
    },
    { onConflict: 'class_id,date' },
  )

  if (error) {
    console.error('setClassException:', error.message)
    return fail('No se pudo guardar el cambio de la clase')
  }

  revalidatePath(`/clases/${input.class_id}`)
  revalidatePath(`/clases/${input.class_id}/asistencia`)
  revalidatePath('/clases')
  revalidatePath('/')
  return ok(undefined)
}

/** Vuelve atrás: la clase de esa fecha se dicta como siempre. */
export async function clearClassException(
  classId: string,
  date: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abril_trainer_class_exceptions')
    .delete()
    .eq('class_id', classId)
    .eq('date', date)

  if (error) {
    console.error('clearClassException:', error.message)
    return fail('No se pudo reactivar la clase')
  }

  revalidatePath(`/clases/${classId}`)
  revalidatePath(`/clases/${classId}/asistencia`)
  revalidatePath('/clases')
  revalidatePath('/')
  return ok(undefined)
}

/** Una fecha de asistencia tiene formato ISO y no está en el futuro. */
function invalidDate(date: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO()
}

/**
 * Marca la asistencia de un alumno en una fecha.
 *
 * Upsert sobre (class_id, student_id, date), que es la clave única: tocar dos
 * veces al mismo alumno corrige la marca en vez de fallar.
 *
 * La fecha llega de la URL: se valida acá además de en la base (trigger
 * abril_trainer_enforce_attendance_date), para dar un mensaje en español en vez
 * de un error de Postgres.
 */
export async function markAttendance(
  classId: string,
  studentId: string,
  date: string,
  status: Enums<'abril_trainer_attendance_status'> | null,
): Promise<ActionResult> {
  if (invalidDate(date)) return fail('Esa fecha no es válida para pasar lista')

  const supabase = await createClient()

  if (status === null) {
    const { error } = await supabase
      .from('abril_trainer_attendance')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('date', date)

    if (error) {
      console.error('markAttendance/delete:', error.message)
      return fail('No se pudo borrar la marca')
    }
  } else {
    const { error } = await supabase
      .from('abril_trainer_attendance')
      .upsert(
        { class_id: classId, student_id: studentId, date, status },
        { onConflict: 'class_id,student_id,date' },
      )

    if (error) {
      console.error('markAttendance:', error.message)
      return fail('No se pudo guardar la asistencia')
    }
  }

  revalidatePath(`/clases/${classId}/asistencia`)
  revalidatePath(`/alumnos/${studentId}/asistencia`)
  revalidatePath('/')
  return ok(undefined)
}

/** Marca presente a todo el que no tenga marca todavía. */
export async function markAllPresent(
  classId: string,
  studentIds: string[],
  date: string,
): Promise<ActionResult<{ marked: number }>> {
  if (studentIds.length === 0) return ok({ marked: 0 })
  if (invalidDate(date)) return fail('Esa fecha no es válida para pasar lista')

  const supabase = await createClient()
  const rows = studentIds.map((student_id) => ({
    class_id: classId,
    student_id,
    date,
    status: 'presente' as const,
  }))

  const { error } = await supabase
    .from('abril_trainer_attendance')
    .upsert(rows, { onConflict: 'class_id,student_id,date' })

  if (error) {
    console.error('markAllPresent:', error.message)
    return fail('No se pudo guardar la asistencia')
  }

  revalidatePath(`/clases/${classId}/asistencia`)
  revalidatePath('/')
  return ok({ marked: rows.length })
}
