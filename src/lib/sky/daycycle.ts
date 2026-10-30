import { lerp } from '../rng'

export type RGB = [number, number, number]

export interface SkyTint {
  top: RGB
  mid: RGB
  bottom: RGB
  /** Horizon glow colour and strength. */
  glow: RGB
  glowA: number
  /** How visible background stars are, 0..1. */
  stars: number
  label: string
}

/** One full dusk → night → dawn loop. */
export const CYCLE_MS = 8 * 60 * 1000

const NIGHT: SkyTint = { top: [6, 10, 26], mid: [11, 19, 48], bottom: [27, 29, 69], glow: [150, 100, 150], glowA: 0.2, stars: 1, label: 'Night' }

const KEYS: { t: number; tint: SkyTint }[] = [
  { t: 0, tint: { top: [24, 26, 66], mid: [70, 52, 110], bottom: [220, 124, 96], glow: [255, 150, 90], glowA: 0.4, stars: 0.35, label: 'Dusk' } },
  { t: 0.12, tint: { top: [10, 14, 40], mid: [24, 28, 70], bottom: [74, 52, 104], glow: [170, 100, 150], glowA: 0.28, stars: 0.8, label: 'Dusk' } },
  { t: 0.22, tint: NIGHT },
  { t: 0.7, tint: NIGHT },
  { t: 0.8, tint: { top: [12, 20, 52], mid: [40, 50, 100], bottom: [150, 110, 140], glow: [255, 170, 150], glowA: 0.28, stars: 0.7, label: 'Dawn' } },
  { t: 0.9, tint: { top: [38, 66, 124], mid: [104, 124, 176], bottom: [255, 190, 140], glow: [255, 200, 140], glowA: 0.42, stars: 0.22, label: 'Dawn' } },
  { t: 1, tint: { top: [24, 26, 66], mid: [70, 52, 110], bottom: [220, 124, 96], glow: [255, 150, 90], glowA: 0.4, stars: 0.35, label: 'Dusk' } },
]

const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Sky colours at a point in the loop, `t` in [0, 1). */
export function skyAt(t: number): SkyTint {
  const u = ((t % 1) + 1) % 1
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const k = (u - a.t) / (b.t - a.t)
  const e = k * k * (3 - 2 * k)
  return {
    top: mix(a.tint.top, b.tint.top, e),
    mid: mix(a.tint.mid, b.tint.mid, e),
    bottom: mix(a.tint.bottom, b.tint.bottom, e),
    glow: mix(a.tint.glow, b.tint.glow, e),
    glowA: lerp(a.tint.glowA, b.tint.glowA, e),
    stars: lerp(a.tint.stars, b.tint.stars, e),
    label: e < 0.5 ? a.tint.label : b.tint.label,
  }
}

export const nightSky = (): SkyTint => NIGHT

/** Where the moon rides across the screen during the loop (fractions of width/height), or null when it has set. */
export function moonPath(t: number): { x: number; y: number } | null {
  const u = (((t % 1) + 1) % 1 - 0.04) / 0.84
  if (u < 0 || u > 1) return null
  return { x: lerp(0.08, 0.92, u), y: 0.7 - 0.55 * Math.sin(Math.PI * u) }
}
