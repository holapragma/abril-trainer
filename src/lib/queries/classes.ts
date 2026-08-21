import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { addDays, todayISO, weekdayOf } from '@/lib/today'
import type { AttendanceRow, ClassException, ClassWithCount, Klass, Occurrence } from '@/types/domain'

export async function getClasses(): Promise<ClassWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_classes')
    .select('*, class_enrollments:abril_trainer_class_enrollments(id)')
    .order('weekday')
    .order('start_time')

  if (error) throw error

  return (data ?? []).map((c) => {
    const { class_enrollments, ...klass } = c as Klass & { class_enrollments: { id: string }[] }
    return { ...klass, enrolled: class_enrollments?.length ?? 0 }
  })
}

export const getClass = cache(async (id: string): Promise<Klass | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('abril_trainer_classes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
})

/** Alumnos inscritos en una clase, con su asistencia en la fecha dada. */
export async function getClassRoster(classId: string, date: string): Promise<AttendanceRow[]> {
  const supabase = await createClient()

  const [enrollments, attendance] = await Promise.all([
    supabase
      .from('abril_trainer_class_enrollments')
      .select('student:abril_trainer_students(id, first_name, last_name, photo_url, status)')
      .eq('class_id', classId),
    supabase.from('abril_trainer_attendance').select('student_id, status').eq('class_id', classId).eq('date', date),
  ])

  if (enrollments.error) throw enrollments.error
  if (attendance.error) throw attendance.error

  const marks = new Map((attendance.data ?? []).map((a) => [a.student_id, a.status]))

  const rows: AttendanceRow[] = []
  for (const row of enrollments.data ?? []) {
    const s = row.student as unknown as {
      id: string
      first_name: string
      last_name: string
      photo_url: string | null
      status: AttendanceRow['student_status']
    } | null
    if (!s) continue
    rows.push({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      photo_url: s.photo_url,
      status: marks.get(s.id) ?? null,
      student_status: s.status,
    })
  }

  return rows.sort((a, b) => a.first_name.localeCompare(b.first_name, 'es'))
}

export async function getEnrolledIds(classId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_class_enrollments')
    .select('student_id')
    .eq('class_id', classId)

  if (error) throw error
  return new Set((data ?? []).map((e) => e.student_id))
}

/**
 * La excepción de una clase en una fecha, si la hay: suspendida o movida.
 *
 * No hay tabla de ocurrencias —eso sigue igual—: solo existen filas para lo que
 * se salió de la norma, que en un año son un puñado.
 */
export async function getClassException(
  classId: string,
  date: string,
): Promise<ClassException | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_class_exceptions')
    .select('*')
    .eq('class_id', classId)
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Las excepciones futuras y recientes de una clase, para mostrarlas en su ficha. */
export async function getClassExceptions(classId: string): Promise<ClassException[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_class_exceptions')
    .select('*')
    .eq('class_id', classId)
    .gte('date', addDays(todayISO(), -30))
    .order('date')

  if (error) throw error
  return data ?? []
}

/**
 * La excepción que afecta a una fecha, mirándola por los dos lados: la de la
 * ocurrencia original y la de una clase que se movió HASTA acá.
 *
 * Hace falta porque pasar lista ocurre en el día en que la clase realmente se
 * dio, y ese día puede no ser el del weekday de la clase.
 */
export async function getExceptionFor(
  classId: string,
  date: string,
): Promise<ClassException | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_class_exceptions')
    .select('*')
    .eq('class_id', classId)
    .or(`date.eq.${date},new_date.eq.${date}`)
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

/** La ocurrencia de una fecha, resuelta contra su excepción. */
export async function getOccurrence(
  classId: string,
  date: string,
): Promise<Occurrence> {
  const exception = await getClassException(classId, date)
  return {
    date,
    effectiveDate: exception?.kind === 'movida' && exception.new_date ? exception.new_date : date,
    startTime: exception?.new_start_time ?? null,
    exception,
  }
}

/** Historial de asistencia de un alumno. */
export async function getStudentAttendance(studentId: string, limit = 40) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_attendance')
    .select('id, date, status, class:abril_trainer_classes(id, name, start_time)')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/**
 * Fecha de la ocurrencia más reciente (hoy incluido) de una clase semanal.
 *
 * No existe tabla de ocurrencias: se calculan desde weekday. Materializarlas
 * obligaría a un job que genere filas futuras, para grupos de 4-6 personas.
 *
 * Se apoya en todayISO()/todayWeekday(), que van por la zona de la entrenadora.
 * Con `new Date()` a secas, un servidor en UTC devolvía la ocurrencia de la
 * semana anterior cada noche a partir de las 21:00 hora argentina.
 */
export function lastOccurrence(weekday: number, today = todayISO()): string {
  const diff = (weekdayOf(today) - weekday + 7) % 7
  return addDays(today, -diff)
}
