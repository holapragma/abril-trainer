'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { classSchema, fieldErrorsOf } from '@/lib/schemas'
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
 * Marca la asistencia de un alumno en una fecha.
 *
 * Upsert sobre (class_id, student_id, date), que es la clave única: tocar dos
 * veces al mismo alumno corrige la marca en vez de fallar.
 */
export async function markAttendance(
  classId: string,
  studentId: string,
  date: string,
  status: Enums<'abril_trainer_attendance_status'> | null,
): Promise<ActionResult> {
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
