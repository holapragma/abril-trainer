import { z } from 'zod'

/**
 * Esquemas de validación. Se comparten entre el formulario (react-hook-form) y
 * la Server Action, así que las reglas se escriben una sola vez y el servidor
 * nunca confía en que el cliente ya validó.
 */

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)
const trimmed = z.string().trim()

// ── Alumnos ──────────────────────────────────────────────────────────────────

export const studentSchema = z.object({
  first_name: trimmed.min(1, 'Falta el nombre').max(60),
  last_name: trimmed.min(1, 'Falta el apellido').max(60),
  modality: z.enum(['presencial', 'virtual']),
  status: z.enum(['activo', 'pausa', 'baja']).default('activo'),
  phone: z.preprocess(emptyToNull, trimmed.max(30).nullable()),
  email: z.preprocess(emptyToNull, z.email('Email inválido').nullable()),
  birthdate: z.preprocess(emptyToNull, z.iso.date('Fecha inválida').nullable()),
  goal: z.preprocess(emptyToNull, trimmed.max(200).nullable()),
  notes: z.preprocess(emptyToNull, trimmed.max(2000).nullable()),
  joined_at: z.preprocess(emptyToNull, z.iso.date().nullable()),
})

// ── Planes ───────────────────────────────────────────────────────────────────

export const planSchema = z.object({
  name: trimmed.min(1, 'Falta el nombre').max(80),
  description: z.preprocess(emptyToNull, trimmed.max(500).nullable()),
  modality: z.preprocess(emptyToNull, z.enum(['presencial', 'virtual']).nullable()),
  sessions_per_week: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(14).nullable(),
  ),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  duration_weeks: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(104).nullable()),
  active: z.boolean().default(true),
})

// ── Membresías ───────────────────────────────────────────────────────────────

export const membershipSchema = z.object({
  student_id: z.uuid(),
  plan_id: z.uuid('Elegí un plan'),
  starts_on: z.iso.date(),
  price: z.coerce.number().min(0),
})

// ── Planificación ────────────────────────────────────────────────────────────

export const blockSchema = z.object({
  student_id: z.uuid(),
  name: trimmed.min(1, 'Poné un nombre al bloque').max(80),
  goal: z.preprocess(emptyToNull, trimmed.max(200).nullable()),
  starts_on: z.iso.date(),
  total_weeks: z.coerce.number().int().min(1, 'Mínimo 1 semana').max(52, 'Máximo 52 semanas'),
})

export const sessionSchema = z.object({
  block_id: z.uuid(),
  week_number: z.coerce.number().int().min(1),
  day_label: trimmed.min(1, 'Poné una etiqueta').max(24),
  name: z.preprocess(emptyToNull, trimmed.max(80).nullable()),
})

/**
 * reps y load son texto: esto es una prescripción, no un registro. Abril
 * escribe «8-10», «AMRAP», «al 70%», «RPE 8», «peso corporal». Un número la
 * obligaría a pelear con el formulario todos los días.
 */
export const sessionExerciseSchema = z.object({
  session_id: z.uuid(),
  exercise_id: z.string().min(1),
  sets: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(50).nullable()),
  reps: z.preprocess(emptyToNull, trimmed.max(24).nullable()),
  load: z.preprocess(emptyToNull, trimmed.max(24).nullable()),
  rest_seconds: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(3600).nullable()),
  time_seconds: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(7200).nullable()),
  tempo: z.preprocess(emptyToNull, trimmed.max(16).nullable()),
  notes: z.preprocess(emptyToNull, trimmed.max(500).nullable()),
})

// ── Ejercicios propios ───────────────────────────────────────────────────────

export const exerciseSchema = z.object({
  name: trimmed.min(1, 'Falta el nombre').max(120),
  primary_muscle: z.string().min(1, 'Elegí un músculo'),
  equipment: z.string().min(1),
  difficulty: z.string().min(1),
  steps: z.array(trimmed.max(500)).max(12).default([]),
})

// ── Clases ───────────────────────────────────────────────────────────────────

export const classSchema = z.object({
  name: trimmed.min(1, 'Falta el nombre').max(80),
  weekday: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  duration_minutes: z.coerce.number().int().min(15).max(300),
  capacity: z.coerce.number().int().min(1, 'Mínimo 1').max(50),
  active: z.boolean().default(true),
})

// ── Pagos ────────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  student_id: z.uuid(),
  amount: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  due_date: z.iso.date('Fecha inválida'),
  membership_id: z.preprocess(emptyToNull, z.uuid().nullable()),
  method: z.preprocess(emptyToNull, trimmed.max(40).nullable()),
  note: z.preprocess(emptyToNull, trimmed.max(300).nullable()),
  paid: z.boolean().default(false),
})

// ── Utilidad ─────────────────────────────────────────────────────────────────

/** Convierte los issues de zod en un mapa campo → primer mensaje. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !out[key]) out[key] = issue.message
  }
  return out
}
