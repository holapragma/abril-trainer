/**
 * Genera los iconos PWA sin dependencias: un encoder PNG mínimo sobre zlib.
 *
 * Marca provisional — una barra estilizada sobre el terracota de la paleta.
 * Se reemplaza cuando haya identidad de marca (ver decisión abierta #2).
 *
 * Uso: node --experimental-strip-types scripts/make-icons.ts
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

type RGB = [number, number, number]
const ACCENT: RGB = [0xa8, 0x5b, 0x36]
const WHITE: RGB = [0xff, 0xff, 0xff]

function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Codifica RGB de 8 bits sin canal alfa. */
function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profundidad
  ihdr[9] = 2 // color: truecolor
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Dibuja la barra. `scale` encoge el glifo dentro del lienzo: los iconos
 * maskable necesitan margen porque Android los recorta en círculo.
 */
function drawIcon(size: number, glyphScale: number): Uint8Array {
  const px = new Uint8Array(size * size * 3)

  const set = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 3
    px[i] = c[0]
    px[i + 1] = c[1]
    px[i + 2] = c[2]
  }

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, ACCENT)

  const cx = size / 2
  const cy = size / 2
  const u = size * glyphScale // unidad del glifo

  const rect = (w: number, h: number, r: number) => {
    const x0 = cx - w / 2
    const y0 = cy - h / 2
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
        const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r))
        const dy = Math.max(y0 + r - y, 0, y - (y0 + h - r))
        if (dx * dx + dy * dy <= r * r) set(x, y, WHITE)
      }
    }
  }

  const rectAt = (ox: number, w: number, h: number, r: number) => {
    const x0 = cx + ox - w / 2
    const y0 = cy - h / 2
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
        const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r))
        const dy = Math.max(y0 + r - y, 0, y - (y0 + h - r))
        if (dx * dx + dy * dy <= r * r) set(x, y, WHITE)
      }
    }
  }

  rect(u * 0.62, u * 0.1, u * 0.05) // eje
  rectAt(-u * 0.34, u * 0.13, u * 0.44, u * 0.06) // disco interior izq.
  rectAt(u * 0.34, u * 0.13, u * 0.44, u * 0.06) // disco interior der.
  rectAt(-u * 0.5, u * 0.1, u * 0.26, u * 0.05) // disco exterior izq.
  rectAt(u * 0.5, u * 0.1, u * 0.26, u * 0.05) // disco exterior der.

  return px
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, scale: 0.78 },
  { file: 'public/icons/icon-512.png', size: 512, scale: 0.78 },
  { file: 'public/icons/icon-maskable.png', size: 512, scale: 0.52 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, scale: 0.72 },
  { file: 'public/favicon.png', size: 64, scale: 0.86 },
]

for (const t of targets) {
  const out = join(ROOT, t.file)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encodePng(t.size, t.size, drawIcon(t.size, t.scale)))
  console.log(`✓ ${t.file}  ${t.size}×${t.size}`)
}
