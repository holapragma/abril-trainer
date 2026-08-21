import type { Enums } from '@/types/database.types'

/**
 * Vocabulario canónico del dominio.
 *
 * Los músculos se guardan en la base con su id en inglés (son claves de
 * filtrado, heredadas del catálogo de GymMane) y se muestran en español desde
 * acá. Equipamiento y dificultad ya se guardan traducidos: son etiquetas.
 */

export const MUSCLES = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazo',
  trapezius: 'Trapecio',
  abdomen: 'Abdomen',
  obliques: 'Oblicuos',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
} as const

export type MuscleId = keyof typeof MUSCLES

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[]

export function muscleLabel(id: string): string {
  return MUSCLES[id as MuscleId] ?? id
}

/** Agrupación para los filtros: 13 músculos son demasiados chips en un móvil. */
export const MUSCLE_GROUPS: Record<string, { label: string; muscles: MuscleId[] }> = {
  torso: { label: 'Torso', muscles: ['chest', 'back', 'shoulders', 'trapezius'] },
  brazos: { label: 'Brazos', muscles: ['biceps', 'triceps', 'forearm'] },
  piernas: { label: 'Piernas', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  core: { label: 'Core', muscles: ['abdomen', 'obliques'] },
}

export const EQUIPMENT = [
  'Barra',
  'Mancuernas',
  'Polea',
  'Máquina',
  'Peso corporal',
  'Con lastre',
  'Banda elástica',
  'Kettlebell',
  'Otro',
] as const

export const DIFFICULTIES = ['Principiante', 'Intermedio', 'Avanzado'] as const

// ── Etiquetas de los enums de la base ────────────────────────────────────────

export const MODALITY: Record<Enums<'abril_trainer_modality'>, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
}

export const STUDENT_STATUS: Record<Enums<'abril_trainer_student_status'>, string> = {
  activo: 'Activo',
  pausa: 'En pausa',
  baja: 'Baja',
}

export const ATTENDANCE_STATUS: Record<Enums<'abril_trainer_attendance_status'>, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
}

export const BLOCK_STATUS: Record<Enums<'abril_trainer_block_status'>, string> = {
  activo: 'Activo',
  terminado: 'Terminado',
}

export const PAYMENT_STATUS = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
} as const

export type PaymentStatus = keyof typeof PAYMENT_STATUS

// ── Días de la semana (ISO: 1 = lunes) ───────────────────────────────────────

/**
 * Métodos de cobro. Texto libre daba cinco escrituras distintas de
 * «transferencia» y ningún corte posible. La columna sigue siendo text: los
 * valores viejos se muestran tal cual.
 */
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Otro'] as const

export const WEEKDAYS = [
  { value: 1, label: 'Lunes', short: 'Lun', initial: 'L' },
  { value: 2, label: 'Martes', short: 'Mar', initial: 'M' },
  { value: 3, label: 'Miércoles', short: 'Mié', initial: 'M' },
  { value: 4, label: 'Jueves', short: 'Jue', initial: 'J' },
  { value: 5, label: 'Viernes', short: 'Vie', initial: 'V' },
  { value: 6, label: 'Sábado', short: 'Sáb', initial: 'S' },
  { value: 7, label: 'Domingo', short: 'Dom', initial: 'D' },
] as const

export function weekdayLabel(n: number): string {
  return WEEKDAYS.find((d) => d.value === n)?.label ?? '—'
}

/** Etiquetas sugeridas para las sesiones de una semana. */
export const SESSION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

export const STORAGE = {
  avatars: 'abril_trainer_avatars',
  media: 'abril_trainer_exercise-media',
} as const
