import { hash2, mulberry32 } from '../rng'
import { bandDensity } from './milkyway'

export interface Layer {
  id: number
  /** Parallax factor: 1 moves with the world, smaller is farther away. */
  p: number
  chunk: number
  count: number
  size: number
}

export const LAYERS: Layer[] = [
  { id: 0, p: 0.3, chunk: 640, count: 80, size: 0.8 },
  { id: 1, p: 0.6, chunk: 640, count: 50, size: 1 },
  { id: 2, p: 1, chunk: 640, count: 28, size: 1.3 },
]

export interface BgStar {
  x: number
  y: number
  /** Brightness 0..1; chunks are sorted brightest first. */
  b: number
  size: number
  color: string
  /** Twinkle speed (radians per ms) and phase. */
  tw: number
  ph: number
}

export interface GlowBlob {
  x: number
  y: number
  r: number
  kind: 'haze' | 'core' | 'violet' | 'dust'
  a: number
}

export interface Chunk {
  stars: BgStar[]
  /** Milky Way glow, only on the far layer. */
  glow: GlowBlob[]
}

const STAR_COLORS = ['#aebfff', '#d6e0ff', '#f6f0e2', '#ffe0b0', '#ffb38a']
function starColor(r: number): string {
  if (r < 0.12) return STAR_COLORS[0]
  if (r < 0.3) return STAR_COLORS[1]
  if (r < 0.8) return STAR_COLORS[2]
  if (r < 0.94) return STAR_COLORS[3]
  return STAR_COLORS[4]
}

function makeStar(rand: () => number, x: number, y: number, layer: Layer, dust = false): BgStar {
  const b = dust ? 0.05 + rand() * 0.3 : Math.pow(rand(), 3)
  return {
    x,
    y,
    b,
    size: (dust ? 0.5 : 0.6 + b * 1.8) * layer.size,
    color: starColor(rand()),
    tw: 0.0006 + rand() * 0.0026,
    ph: rand() * Math.PI * 2,
  }
}

export function generateChunk(layer: Layer, cx: number, cy: number): Chunk {
  const rand = mulberry32(hash2(cx, cy, 1000 + layer.id))
  const s = layer.chunk
  const x0 = cx * s
  const y0 = cy * s
  const stars: BgStar[] = []
  const glow: GlowBlob[] = []

  for (let i = 0; i < layer.count; i++) stars.push(makeStar(rand, x0 + rand() * s, y0 + rand() * s, layer))

  if (layer.id === 0) {
    const centre = bandDensity(x0 + s / 2, y0 + s / 2)
    // Dust: faint stars that follow the band, placed by rejection sampling.
    const tries = Math.round(420 * Math.min(1, centre * 2.5))
    for (let i = 0; i < tries; i++) {
      const x = x0 + rand() * s
      const y = y0 + rand() * s
      if (rand() < bandDensity(x, y)) stars.push(makeStar(rand, x, y, layer, true))
    }
    if (centre > 0.03) {
      for (let i = 0; i < 7; i++) {
        const x = x0 + rand() * s
        const y = y0 + rand() * s
        const d = bandDensity(x, y)
        const k = rand()
        glow.push({
          x,
          y,
          r: 160 + rand() * 300,
          kind: k < 0.6 ? 'haze' : k < 0.8 ? 'core' : 'violet',
          a: 0.05 + d * 0.11,
        })
      }
      if (centre > 0.35) {
        for (let i = 0; i < 3; i++) {
          glow.push({ x: x0 + rand() * s, y: y0 + rand() * s, r: 90 + rand() * 160, kind: 'dust', a: 0.18 + centre * 0.25 })
        }
      }
    }
  }

  stars.sort((a, b) => b.b - a.b)
  return { stars, glow }
}

const cache = new Map<string, Chunk>()
const CACHE_LIMIT = 5000

/** Chunks are generated once and kept in a small LRU cache. */
export function getChunk(layer: Layer, cx: number, cy: number): Chunk {
  const key = `${layer.id}:${cx}:${cy}`
  let c = cache.get(key)
  if (c) {
    cache.delete(key)
    cache.set(key, c)
    return c
  }
  c = generateChunk(layer, cx, cy)
  cache.set(key, c)
  if (cache.size > CACHE_LIMIT) {
    let n = 500
    for (const k of cache.keys()) {
      cache.delete(k)
      if (--n === 0) break
    }
  }
  return c
}
