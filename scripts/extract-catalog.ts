/**
 * Extrae la biblioteca de ejercicios de GymMane (Flutter/Dart) y genera el
 * seed SQL de Abril Trainer.
 *
 * Entradas (repo GymMane):
 *   lib/catalog/exercise_catalog.dart   361 Exercise(...) const
 *   lib/l10n/catalog_es.dart            kExerciseNameEs + kExerciseStepsEs
 *
 * Salida:
 *   supabase/seed/exercises.sql         361 upserts, idempotente
 *
 * El español manda: el inglés solo se usa como respaldo si faltara una
 * traducción. Los ids del catálogo se conservan como clave primaria porque ya
 * son estables y coinciden con el nombre del archivo de media.
 *
 * Uso:
 *   node --experimental-strip-types scripts/extract-catalog.ts [ruta-a-GymMane]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GYMMANE = process.argv[2] ?? join(ROOT, '..', 'GymMane')

const CATALOG = join(GYMMANE, 'lib/catalog/exercise_catalog.dart')
const CATALOG_ES = join(GYMMANE, 'lib/l10n/catalog_es.dart')
const GIFS = join(GYMMANE, 'assets/gifs')
const OUT = join(ROOT, 'supabase/seed/exercises.sql')

// El equipamiento y la dificultad se guardan ya en español: son etiquetas que
// se muestran tal cual. Los músculos se guardan con su id canónico en inglés
// porque son claves de filtrado; la UI los traduce vía src/lib/constants.ts.
const EQUIPMENT: Record<string, string> = {
  Barbell: 'Barra',
  Dumbbell: 'Mancuernas',
  Cable: 'Polea',
  Machine: 'Máquina',
  Bodyweight: 'Peso corporal',
  Weighted: 'Con lastre',
  Band: 'Banda elástica',
  Kettlebell: 'Kettlebell',
  Other: 'Otro',
}

const DIFFICULTY: Record<string, string> = {
  Beginner: 'Principiante',
  Intermediate: 'Intermedio',
  Advanced: 'Avanzado',
}

const MUSCLES = new Set([
  'chest', 'shoulders', 'biceps', 'abdomen', 'obliques', 'quads', 'forearm',
  'trapezius', 'back', 'triceps', 'glutes', 'hamstrings', 'calves',
])

type Exercise = {
  id: string
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: string
  difficulty: string
  steps: string[]
}

/** Desescapa un literal de string de Dart en comillas simples. */
function unescapeDart(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\n/g, '\n')
}

/** Extrae todos los literales de string de una lista Dart `['a', 'b']`. */
function parseList(raw: string): string[] {
  const out: string[] = []
  const re = /'((?:[^'\\]|\\.)*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) out.push(unescapeDart(m[1]))
  return out
}

/** Corta el archivo en bloques `Exercise( ... )` balanceando paréntesis. */
function splitExerciseBlocks(src: string): string[] {
  const blocks: string[] = []
  const marker = 'Exercise('
  let i = 0
  while ((i = src.indexOf(marker, i)) !== -1) {
    let depth = 0
    let j = i + marker.length - 1
    let inString = false
    for (; j < src.length; j++) {
      const c = src[j]
      if (inString) {
        if (c === '\\') j++
        else if (c === "'") inString = false
        continue
      }
      if (c === "'") inString = true
      else if (c === '(') depth++
      else if (c === ')') {
        depth--
        if (depth === 0) break
      }
    }
    blocks.push(src.slice(i + marker.length, j))
    i = j
  }
  return blocks
}

function field(block: string, name: string): string | null {
  const m = new RegExp(`\\b${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(block)
  return m ? unescapeDart(m[1]) : null
}

function listField(block: string, name: string): string[] {
  const start = new RegExp(`\\b${name}:\\s*\\[`).exec(block)
  if (!start) return []
  let depth = 0
  let inString = false
  let i = start.index + start[0].length - 1
  const from = i
  for (; i < block.length; i++) {
    const c = block[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === "'") inString = false
      continue
    }
    if (c === "'") inString = true
    else if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) break
    }
  }
  return parseList(block.slice(from, i + 1))
}

/** Parsea `const Map<String, String> kExerciseNameEs = { 'id': 'valor', ... }`. */
function parseNameMap(src: string, varName: string): Map<string, string> {
  const out = new Map<string, string>()
  const start = src.indexOf(varName)
  if (start === -1) return out
  const body = src.slice(start)
  const re = /^\s{2}'([^']+)':\s*'((?:[^'\\]|\\.)*)',$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (out.has(m[1])) break // ya entramos en el siguiente mapa
    out.set(m[1], unescapeDart(m[2]))
  }
  return out
}

/** Parsea `const Map<String, List<String>> kExerciseStepsEs = { 'id': [...] }`. */
function parseStepsMap(src: string, varName: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const start = src.indexOf(varName)
  if (start === -1) return out
  const body = src.slice(start)
  const re = /^ {2}'([^']+)':\s*\[$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    const from = body.indexOf('[', m.index)
    let depth = 0
    let inString = false
    let i = from
    for (; i < body.length; i++) {
      const c = body[i]
      if (inString) {
        if (c === '\\') i++
        else if (c === "'") inString = false
        continue
      }
      if (c === "'") inString = true
      else if (c === '[') depth++
      else if (c === ']') {
        depth--
        if (depth === 0) break
      }
    }
    out.set(m[1], parseList(body.slice(from, i + 1)))
  }
  return out
}

const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`
const sqlArr = (xs: string[]) =>
  xs.length === 0 ? `'{}'` : `array[${xs.map(sqlStr).join(', ')}]::text[]`

// ─────────────────────────────────────────────────────────────────────────────

function main() {
  for (const p of [CATALOG, CATALOG_ES, GIFS]) {
    if (!existsSync(p)) {
      console.error(`✗ No se encuentra: ${p}`)
      console.error(`  Pasá la ruta de GymMane como argumento.`)
      process.exit(1)
    }
  }

  const src = readFileSync(CATALOG, 'utf8')
  const srcEs = readFileSync(CATALOG_ES, 'utf8')

  const namesEs = parseNameMap(srcEs, 'kExerciseNameEs')
  const stepsEs = parseStepsMap(srcEs, 'kExerciseStepsEs')

  const exercises: Exercise[] = []
  for (const block of splitExerciseBlocks(src)) {
    const id = field(block, 'id')
    const nameEn = field(block, 'name')
    const primary = field(block, 'primary')
    if (!id || !nameEn || !primary) continue

    exercises.push({
      id,
      name: namesEs.get(id) ?? nameEn,
      primaryMuscle: primary,
      secondaryMuscles: listField(block, 'secondary'),
      equipment: EQUIPMENT[field(block, 'equipment') ?? 'Other'] ?? 'Otro',
      difficulty: DIFFICULTY[field(block, 'difficulty') ?? 'Beginner'] ?? 'Principiante',
      steps: stepsEs.get(id) ?? listField(block, 'steps'),
    })
  }

  // ── Verificación ───────────────────────────────────────────────────────────
  const problems: string[] = []
  const gifFiles = new Set(
    readdirSync(GIFS).filter((f) => f.endsWith('.gif')).map((f) => f.replace(/\.gif$/, '')),
  )

  if (exercises.length !== 361) problems.push(`Se esperaban 361 ejercicios, salieron ${exercises.length}`)

  const ids = new Set(exercises.map((e) => e.id))
  if (ids.size !== exercises.length) problems.push('Hay ids duplicados')

  const sinTraduccion = exercises.filter((e) => !namesEs.has(e.id))
  if (sinTraduccion.length) problems.push(`${sinTraduccion.length} sin nombre en español: ${sinTraduccion.slice(0, 5).map((e) => e.id).join(', ')}`)

  const sinPasos = exercises.filter((e) => e.steps.length === 0)
  if (sinPasos.length) problems.push(`${sinPasos.length} sin pasos: ${sinPasos.slice(0, 5).map((e) => e.id).join(', ')}`)

  const sinMedia = exercises.filter((e) => !gifFiles.has(e.id))
  if (sinMedia.length) problems.push(`${sinMedia.length} sin archivo de media: ${sinMedia.slice(0, 5).map((e) => e.id).join(', ')}`)

  const huerfanos = [...gifFiles].filter((g) => !ids.has(g))
  if (huerfanos.length) problems.push(`${huerfanos.length} archivos de media sin ejercicio: ${huerfanos.slice(0, 5).join(', ')}`)

  const musculoRaro = exercises.filter((e) => !MUSCLES.has(e.primaryMuscle))
  if (musculoRaro.length) problems.push(`Músculos fuera del vocabulario: ${[...new Set(musculoRaro.map((e) => e.primaryMuscle))].join(', ')}`)

  // ── Salida ─────────────────────────────────────────────────────────────────
  const lines: string[] = [
    '-- exercises.sql — catálogo global de Abril Trainer',
    '-- GENERADO por scripts/extract-catalog.ts. No editar a mano.',
    `-- ${exercises.length} ejercicios extraídos de GymMane (GPL-3.0), en español.`,
    '--',
    '-- owner_id NULL = catálogo global, visible para todas las entrenadoras.',
    '-- Idempotente: se puede volver a correr sin duplicar nada.',
    '',
    'insert into abril_trainer_exercises (id, owner_id, name, primary_muscle, secondary_muscles, equipment, difficulty, media_url, steps) values',
  ]

  const values = exercises.map((e) => {
    const media = `catalog/${e.id}.mp4`
    return `  (${sqlStr(e.id)}, null, ${sqlStr(e.name)}, ${sqlStr(e.primaryMuscle)}, ` +
      `${sqlArr(e.secondaryMuscles)}, ${sqlStr(e.equipment)}, ${sqlStr(e.difficulty)}, ` +
      `${sqlStr(media)}, ${sqlArr(e.steps)})`
  })

  lines.push(values.join(',\n'))
  lines.push('on conflict (id) do update set')
  lines.push('  name              = excluded.name,')
  lines.push('  primary_muscle    = excluded.primary_muscle,')
  lines.push('  secondary_muscles = excluded.secondary_muscles,')
  lines.push('  equipment         = excluded.equipment,')
  lines.push('  difficulty        = excluded.difficulty,')
  lines.push('  media_url         = excluded.media_url,')
  lines.push('  steps             = excluded.steps;')
  lines.push('')

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, lines.join('\n'), 'utf8')

  // ── Informe ────────────────────────────────────────────────────────────────
  console.log(`\nEjercicios extraídos: ${exercises.length}`)
  console.log(`Con nombre en español: ${exercises.filter((e) => namesEs.has(e.id)).length}`)
  console.log(`Con pasos en español:  ${exercises.filter((e) => stepsEs.has(e.id)).length}`)
  console.log(`Con archivo de media:  ${exercises.filter((e) => gifFiles.has(e.id)).length}`)

  const porMusculo = new Map<string, number>()
  for (const e of exercises) porMusculo.set(e.primaryMuscle, (porMusculo.get(e.primaryMuscle) ?? 0) + 1)
  console.log('\nPor músculo principal:')
  for (const [m, n] of [...porMusculo].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m.padEnd(12)} ${n}`)
  }

  const porEquipo = new Map<string, number>()
  for (const e of exercises) porEquipo.set(e.equipment, (porEquipo.get(e.equipment) ?? 0) + 1)
  console.log('\nPor equipamiento:')
  for (const [q, n] of [...porEquipo].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${q.padEnd(14)} ${n}`)
  }

  if (problems.length) {
    console.error('\n✗ PROBLEMAS:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }

  console.log(`\n✓ Verificación completa. Escrito: ${OUT}`)
  console.log('\nMuestra:')
  for (const e of exercises.slice(0, 3)) {
    console.log(`  ${e.id}  ${e.name}  [${e.primaryMuscle}/${e.equipment}/${e.difficulty}]  ${e.steps.length} pasos`)
  }
}

main()
