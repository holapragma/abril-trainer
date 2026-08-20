/**
 * «Hoy» según la zona horaria de la entrenadora, no la del servidor.
 *
 * Vercel corre en UTC y Abril está en UTC−3. Entre las 21:00 y medianoche hora
 * argentina, `new Date()` en el servidor ya devuelve el día siguiente. Sin esto,
 * pasar lista después de la clase de las 19:00 archivaría la asistencia con la
 * fecha de mañana, y el listado de clases mostraría el día equivocado.
 *
 * En SQL el equivalente es abril_trainer_app_today() (migración 0012). Las dos caras tienen
 * que coincidir o los estados calculados en el cliente y en la base divergen.
 */

export const APP_TZ = 'America/Argentina/Buenos_Aires'

/** La fecha de hoy como 'YYYY-MM-DD' en la zona de la app. */
export function todayISO(): string {
  // en-CA formatea como YYYY-MM-DD, que es justo lo que guarda Postgres.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Día ISO de la semana de hoy en la zona de la app: 1 = lunes … 7 = domingo. */
export function todayWeekday(): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: APP_TZ, weekday: 'short' }).format(
    new Date(),
  )
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return map[name] ?? 1
}

/** Día ISO de la semana de una fecha 'YYYY-MM-DD', sin que la zona la corra un día. */
export function weekdayOf(iso: string): number {
  const d = new Date(`${iso}T12:00:00`)
  const js = d.getDay()
  return js === 0 ? 7 : js
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** true si la fecha 'YYYY-MM-DD' es hoy en la zona de la app. */
export function isToday(iso: string): boolean {
  return iso === todayISO()
}
