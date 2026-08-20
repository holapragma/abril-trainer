type ClassValue = string | number | false | null | undefined | ClassValue[]

/**
 * Concatena clases. Hace lo justo que necesita este proyecto: no vale la pena
 * una dependencia para esto, y no hay conflictos de Tailwind que resolver
 * porque los componentes controlan sus propias clases base.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const i of inputs) {
    if (!i) continue
    if (Array.isArray(i)) {
      const nested = cn(...i)
      if (nested) out.push(nested)
    } else {
      out.push(String(i))
    }
  }
  return out.join(' ')
}
