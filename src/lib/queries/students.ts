import { createClient } from '@/lib/supabase/server'
import { withStatus } from '@/lib/payment-status'
import type { Enums } from '@/types/database.types'
import type {
  MembershipWithPlan,
  Student,
  StudentListItem,
} from '@/types/domain'

/**
 * Nunca se filtra por trainer_id acá: lo hace RLS. Si aparece un
 * .eq('trainer_id', …) en una query es señal de que falta una política.
 */

export async function getStudents(filters?: {
  q?: string
  status?: Enums<'student_status'>
  modality?: Enums<'modality'>
}): Promise<StudentListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, photo_url, modality, status, joined_at')
    .order('first_name')

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.modality) query = query.eq('modality', filters.modality)

  if (filters?.q) {
    // Escapado de comas y paréntesis: rompen la sintaxis del filtro `or` de PostgREST.
    const q = filters.q.replace(/[,()]/g, ' ').trim()
    if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getActiveMembership(studentId: string): Promise<MembershipWithPlan | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('*, plan:plans(id, name, modality, sessions_per_week)')
    .eq('student_id', studentId)
    .eq('status', 'activa')
    .maybeSingle()

  if (error) throw error
  return data as MembershipWithPlan | null
}

/** Contadores de la ficha, en una sola tanda de consultas. */
export async function getStudentOverview(studentId: string) {
  const supabase = await createClient()

  const [membership, blocks, payments, attendance] = await Promise.all([
    getActiveMembership(studentId),
    supabase
      .from('training_blocks')
      .select('id, name, starts_on, total_weeks, status')
      .eq('student_id', studentId)
      .eq('status', 'activo')
      .order('starts_on', { ascending: false })
      .limit(1),
    supabase
      .from('payments')
      .select('id, amount, due_date, paid_at')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })
      .limit(5),
    supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('date', new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)),
  ])

  if (blocks.error) throw blocks.error
  if (payments.error) throw payments.error
  if (attendance.error) throw attendance.error

  const asistencias = attendance.data ?? []

  return {
    membership,
    activeBlock: blocks.data?.[0] ?? null,
    payments: (payments.data ?? []).map(withStatus),
    attendance30d: {
      presente: asistencias.filter((a) => a.status === 'presente').length,
      total: asistencias.length,
    },
  }
}
