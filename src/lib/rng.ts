/** Deterministic 32-bit hash of an integer grid cell and a seed. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** Small, fast seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t)
const cell = (x: number, y: number, seed: number) => hash2(x, y, seed) / 4294967296

/** Smooth 2D value noise in [0, 1]. One unit = one lattice cell. */
export function noise2(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const a = cell(x0, y0, seed)
  const b = cell(x0 + 1, y0, seed)
  const c = cell(x0, y0 + 1, seed)
  const d = cell(x0 + 1, y0 + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Approximately normal sample (mean 0, sd ~0.5) from a uniform source. */
export function gauss(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) / 1.15
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
