import type { Tables } from './database.types'

/**
 * Resultado de una Server Action.
 *
 * Las escrituras devuelven un resultado en vez de lanzar: un error al guardar
 * tiene que aparecer junto al botón, no en una pantalla de error que le borre a
 * Abril lo que acababa de escribir. Las lecturas sí lanzan, porque ahí el
 * error.tsx del segmento es la respuesta correcta.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
})

// ── Tipos compuestos ─────────────────────────────────────────────────────────

export type Student = Tables<'abril_trainer_students'>
export type Plan = Tables<'abril_trainer_plans'>
export type Exercise = Tables<'abril_trainer_exercises'>
export type TrainingBlock = Tables<'abril_trainer_training_blocks'>
export type TrainingSession = Tables<'abril_trainer_training_sessions'>
export type SessionExercise = Tables<'abril_trainer_session_exercises'>
export type Klass = Tables<'abril_trainer_classes'>
export type Attendance = Tables<'abril_trainer_attendance'>
export type Payment = Tables<'abril_trainer_payments'>

export type PaymentWithStatus = Payment & { status: 'pagado' | 'pendiente' | 'vencido' }

export type StudentListItem = Pick<
  Student,
  'id' | 'first_name' | 'last_name' | 'photo_url' | 'modality' | 'status' | 'joined_at'
>

export type MembershipWithPlan = Tables<'abril_trainer_memberships'> & {
  plan: Pick<Plan, 'id' | 'name' | 'modality' | 'sessions_per_week'> | null
}

export type SessionExerciseWithExercise = SessionExercise & {
  exercise: Pick<Exercise, 'id' | 'name' | 'primary_muscle' | 'media_url' | 'equipment'> | null
}

export type SessionWithExercises = TrainingSession & {
  session_exercises: SessionExerciseWithExercise[]
}

export type ClassWithCount = Klass & { enrolled: number }

export type AttendanceRow = {
  student_id: string
  first_name: string
  last_name: string
  photo_url: string | null
  status: Attendance['status'] | null
}

/** Forma de lo que devuelve la RPC abril_trainer_dashboard_summary(). */
export type DashboardSummary = {
  alumnos: { total: number; activos: number; nuevos: number }
  pagos: { cobrado_mes: number; pendientes: number; vencidos: number; adeudado: number }
  /** Los cinco cobros sin saldar más atrasados, para tocarlos desde el inicio. */
  cobros_pendientes: {
    id: string
    amount: number
    due_date: string
    student_id: string
    first_name: string
    last_name: string
  }[]
  /** Cuántas membresías activas no tienen todavía el cobro de este mes. */
  cobros_por_generar: number
  clases_hoy: {
    id: string
    nombre: string
    hora: string
    cupo: number
    inscritos: number
    asistencia_tomada: boolean
  }[]
  planificacion: {
    sin_rutina: number
    por_vencer: number
    /** Los primeros cinco, para poder tocarlos desde el inicio y no solo contarlos. */
    sin_rutina_lista: Pick<Student, 'id' | 'first_name' | 'last_name' | 'photo_url'>[]
  }
}
