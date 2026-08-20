/**
 * Sube la media del catálogo a Supabase Storage.
 *
 * Corre UNA vez, desde tu máquina, después de `catalog:extract` y
 * `catalog:media`. Usa la service_role porque el bucket solo acepta escritura
 * en la carpeta del propio usuario y `catalog/` no pertenece a nadie.
 *
 * La service_role SALTA TODA LA RLS: solo va en .env.local, nunca en Vercel.
 *
 * Uso:
 *   node --experimental-strip-types --env-file=.env.local scripts/upload-media.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA_DIR = join(ROOT, 'media/catalog')
const BUCKET = 'abril_trainer_exercise-media'
const CONCURRENCY = 8

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  console.error('  Corré con: node --experimental-strip-types --env-file=.env.local scripts/upload-media.ts')
  process.exit(1)
}

if (!existsSync(MEDIA_DIR)) {
  console.error(`✗ No existe ${MEDIA_DIR}. Corré antes: npm run catalog:media`)
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const files = readdirSync(MEDIA_DIR).filter((f) => /\.(mp4|webm|gif|jpg|png)$/i.test(f))

if (files.length === 0) {
  console.error(`✗ No hay archivos en ${MEDIA_DIR}`)
  process.exit(1)
}

const contentTypeOf = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase()
  return (
    {
      mp4: 'video/mp4',
      webm: 'video/webm',
      gif: 'image/gif',
      jpg: 'image/jpeg',
      png: 'image/png',
    }[ext ?? ''] ?? 'application/octet-stream'
  )
}

console.log(`Subiendo ${files.length} archivos a ${BUCKET}/catalog/ …\n`)

let done = 0
let failed = 0
const errors: string[] = []

async function uploadOne(name: string) {
  const body = readFileSync(join(MEDIA_DIR, name))
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`catalog/${name}`, body, { upsert: true, contentType: contentTypeOf(name) })

  if (error) {
    failed++
    errors.push(`${name}: ${error.message}`)
  } else {
    done++
  }

  const total = done + failed
  if (total % 25 === 0 || total === files.length) {
    process.stdout.write(`\r  ${total}/${files.length}`)
  }
}

// Tandas de CONCURRENCY: más rápido que en serie, sin saturar la API.
for (let i = 0; i < files.length; i += CONCURRENCY) {
  await Promise.all(files.slice(i, i + CONCURRENCY).map(uploadOne))
}

console.log('\n')
console.log(`✓ Subidos: ${done}`)
if (failed > 0) {
  console.error(`✗ Fallaron: ${failed}`)
  for (const e of errors.slice(0, 10)) console.error(`  - ${e}`)
  process.exit(1)
}

const sample = files[0]
if (sample) {
  console.log(`\nComprobá una: ${url}/storage/v1/object/public/${BUCKET}/catalog/${sample}`)
}
