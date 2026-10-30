import { mulberry32, normal } from '../lib/rng'
import { armStrength, densityAt, type Galaxy } from '../lib/space/galaxy'
import { KM_PER_PC } from '../lib/space/units'
import { add, cross, scale, type V3 } from '../lib/space/vec'

export interface Impostor {
  /** Parsecs from the galaxy centre. */
  pos: Float32Array
  color: Float32Array
  /** Sprite diameter, parsecs. */
  size: Float32Array
  count: number
}

/**
 * A galaxy seen from outside: a few thousand soft glows sampled from the same density the stars use,
 * so the spiral you see from afar is the one you fly into. Cores are warm, arms are blue.
 */
export function buildImpostor(g: Galaxy, n = 5000): Impostor {
  const rand = mulberry32(g.seed ^ 0x1a9)
  const R = g.radiusPc
  const e2 = cross(g.normal, g.e1)
  const pos: number[] = []
  const color: number[] = []
  const size: number[] = []
  const flat = g.kind === 'spiral' ? 0.04 : g.kind === 'elliptical' ? 0.5 : 0.25
  let dmax = 0
  for (let i = 0; i < 64; i++) dmax = Math.max(dmax, densityAt(g, add(g.center, scale(g.e1, (i / 64) * R * KM_PER_PC))))
  for (let tries = 0; pos.length < n * 3 && tries < n * 40; tries++) {
    const r = R * 1.1 * Math.sqrt(rand())
    const a = rand() * Math.PI * 2
    const h = normal(rand) * R * flat * (g.kind === 'spiral' ? 1 + 3 * Math.exp(-r / (0.1 * R)) : 1)
    const p = add(add(scale(g.e1, Math.cos(a) * r), scale(e2, Math.sin(a) * r)), scale(g.normal, h))
    const at = add(g.center, scale(p, KM_PER_PC))
    const d = densityAt(g, at)
    // A softened density so the outer disc gets its share of glows, then a strong pull onto the arms.
    const arm = r > 0.12 * R ? 0.12 + 0.88 * Math.pow(armStrength(g, at), 0.6) : 1
    if (rand() > Math.pow(Math.min(d, 30) / Math.min(dmax, 30), 0.5) * arm) continue
    pos.push(p[0], p[1], p[2])
    const core = Math.exp(-r / (0.15 * R))
    const c: V3 = g.kind === 'elliptical' ? [1, 0.85, 0.66] : [0.62 + 0.38 * core, 0.72 + 0.16 * core, 1 - 0.38 * core]
    const k = 0.75 + rand() * 0.5
    color.push(c[0] * k, c[1] * k, c[2] * k)
    size.push(R * (0.014 + rand() * 0.024) * (1 + core))
  }
  return { pos: Float32Array.from(pos), color: Float32Array.from(color), size: Float32Array.from(size), count: size.length }
}
