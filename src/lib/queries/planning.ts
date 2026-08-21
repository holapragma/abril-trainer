import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { SessionWithExercises, TrainingBlock, TrainingSession } from '@/types/domain'

export async function getBlocks(studentId: string): Promise<TrainingBlock[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_training_blocks')
    .select('*')
    .eq('student_id', studentId)
    .order('starts_on', { ascending: false })

  if (error) throw error
  return data ?? []
}

export const getBlock = cache(async (blockId: string): Promise<TrainingBlock | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_training_blocks')
    .select('*')
    .eq('id', blockId)
    .maybeSingle()

  if (error) throw error
  return data
})

/**
 * Todas las sesiones de un bloque, con cuántos ejercicios tiene cada una.
 * Es la consulta de la pantalla de semanas: una sola ida y vuelta para todo.
 */
export async function getBlockSessions(
  blockId: string,
): Promise<(TrainingSession & { exerciseCount: number })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_training_sessions')
    .select('*, session_exercises:abril_trainer_session_exercises(id)')
    .eq('block_id', blockId)
    .order('week_number')
    .order('order_index')

  if (error) throw error

  return (data ?? []).map((s) => {
    const { session_exercises, ...session } = s as TrainingSession & {
      session_exercises: { id: string }[]
    }
    return { ...session, exerciseCount: session_exercises?.length ?? 0 }
  })
}

/**
 * Todos los bloques de la entrenadora, con a qué alumno pertenecen y cuántas
 * sesiones tienen: es el listado de «copiar de…».
 *
 * No hay tabla de plantillas a propósito — una plantilla es un bloque que ya
 * existe. Dos conceptos serían dos cosas que mantener sincronizadas.
 */
export async function getCopyableBlocks(excludeStudentId?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_training_blocks')
    .select(
      'id, name, total_weeks, starts_on, student:abril_trainer_students(id, first_name, last_name), sessions:abril_trainer_training_sessions(id)',
    )
    .order('starts_on', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? [])
    .map((b) => {
      const student = b.student as unknown as {
        id: string
        first_name: string
        last_name: string
      } | null
      const sessions = (b.sessions ?? []) as { id: string }[]
      return {
        id: b.id,
        name: b.name,
        total_weeks: b.total_weeks,
        sessionCount: sessions.length,
        student,
      }
    })
    // Un bloque vacío no sirve de base para nada.
    .filter((b) => b.sessionCount > 0 && b.student?.id !== excludeStudentId)
}

export async function getSession(sessionId: string): Promise<SessionWithExercises | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abril_trainer_training_sessions')
    .select(
      '*, session_exercises:abril_trainer_session_exercises(*, exercise:abril_trainer_exercises(id, name, primary_muscle, media_url, equipment))',
    )
    .eq('id', sessionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const session = data as unknown as SessionWithExercises
  session.session_exercises.sort((a, b) => a.order_index - b.order_index)
  return session
}

/** Agrupa las sesiones por número de semana, dejando huecos para las vacías. */
export function groupByWeek<T extends { week_number: number }>(
  sessions: T[],
  totalWeeks: number,
): { week: number; sessions: T[] }[] {
  const maxWeek = Math.max(totalWeeks, ...sessions.map((s) => s.week_number), 1)
  return Array.from({ length: maxWeek }, (_, i) => ({
    week: i + 1,
    sessions: sessions.filter((s) => s.week_number === i + 1),
  }))
}
