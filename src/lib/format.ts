import { differenceInYears, format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { daysBetween, todayISO } from '@/lib/today'

// ── Dinero ───────────────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return money.format(amount)
}

/** Compacto para tarjetas del dashboard: $1,2 M en vez de $1.200.000. */
export function formatMoneyShort(amount: number | null | undefined): string {
  if (amount == null) return '—'
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1).replace('.', ',')} M`
  }
  if (Math.abs(amount) >= 10_000) {
    return `$${Math.round(amount / 1000)}k`
  }
  return money.format(amount)
}

// ── Fechas ───────────────────────────────────────────────────────────────────

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d 'de' MMMM", { locale: es }) : '—'
}

export function formatDateFull(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'
}

export function formatDateInput(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'yyyy-MM-dd') : ''
}

/** 'YYYY-MM-DD' → 'sáb 8 ago', sin que la zona corra un día. */
export function formatDateShortEs(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return isValid(d) ? format(d, 'EEE d MMM', { locale: es }) : iso
}

/** '18:00:00' → '18:00' */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 5)
}

export function age(birthdate: string | null | undefined): number | null {
  const d = toDate(birthdate)
  // «Hoy» en la zona de Abril, no la del servidor: si no, entre las 21:00 y
  // medianoche alguien cumple años un día antes de tiempo.
  return d ? differenceInYears(new Date(`${todayISO()}T12:00:00`), d) : null
}

/**
 * Días hasta una fecha 'YYYY-MM-DD'. Negativo = ya pasó.
 *
 * Se compara contra el «hoy» de la zona de Abril: con la medianoche local del
 * servidor, un pago que vence mañana decía «vence hoy» desde las 21:00.
 */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const iso = typeof value === 'string' ? value.slice(0, 10) : value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  return daysBetween(iso)
}

/** 'vence en 3 días' / 'venció hace 2 días' / 'vence hoy' */
export function dueLabel(value: string | null | undefined): string {
  const n = daysUntil(value)
  if (n === null) return '—'
  if (n === 0) return 'vence hoy'
  if (n === 1) return 'vence mañana'
  if (n === -1) return 'venció ayer'
  if (n > 0) return `vence en ${n} días`
  return `venció hace ${Math.abs(n)} días`
}

// ── Personas ─────────────────────────────────────────────────────────────────

export function fullName(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`.trim()
}

export function initials(p: { first_name: string; last_name: string }): string {
  return `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase()
}

// ── Prescripción ─────────────────────────────────────────────────────────────

/** '4 × 8-10 · 60kg · 90s' — la línea que resume un ejercicio de una sesión. */
export function prescription(e: {
  sets: number | null
  reps: string | null
  load: string | null
  time_seconds: number | null
  rest_seconds: number | null
}): string {
  const parts: string[] = []

  if (e.sets && e.reps) parts.push(`${e.sets} × ${e.reps}`)
  else if (e.sets) parts.push(`${e.sets} series`)
  else if (e.reps) parts.push(e.reps)

  if (e.time_seconds) parts.push(formatDuration(e.time_seconds))
  if (e.load) parts.push(e.load)
  if (e.rest_seconds) parts.push(`${e.rest_seconds}s desc.`)

  return parts.join(' · ')
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')}`
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
