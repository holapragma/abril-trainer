import { createClient } from '@/lib/supabase/server'
import type { SessionWithExercises, TrainingBlock, TrainingSession } from '@/types/domain'

export async function getBlocks(studentId: string): Promise<TrainingBlock[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('student_id', studentId)
    .order('starts_on', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getBlock(blockId: string): Promise<TrainingBlock | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('id', blockId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Todas las sesiones de un bloque, con cuántos ejercicios tiene cada una.
 * Es la consulta de la pantalla de semanas: una sola ida y vuelta para todo.
 */
export async function getBlockSessions(
  blockId: string,
): Promise<(TrainingSession & { exerciseCount: number })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*, session_exercises(id)')
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

export async function getSession(sessionId: string): Promise<SessionWithExercises | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_sessions')
    .select(
      '*, session_exercises(*, exercise:exercises(id, name, primary_muscle, media_url, equipment))',
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
