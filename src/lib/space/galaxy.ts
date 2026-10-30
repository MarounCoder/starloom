import { noise3 } from '../rng'
import { raDecToVec } from './frames'
import { KM_PER_PC } from './units'
import { cross, dot, len, norm, scale, sub, type V3 } from './vec'

export type GalaxyKind = 'spiral' | 'elliptical' | 'irregular'

export interface Galaxy {
  /** "mw", or "<cx>,<cy>,<cz>.<n>" for a generated galaxy: part of every star id inside it. */
  key: string
  name: string
  /** km, equatorial J2000. */
  center: V3
  radiusPc: number
  kind: GalaxyKind
  /** Unit normal of the disc. */
  normal: V3
  /** In-plane reference direction (angle 0 for the spiral arms). */
  e1: V3
  arms: number
  twist: number
  seed: number
  real: boolean
  /** Raw density that counts as 1 (the solar neighbourhood for the Milky Way). */
  norm: number
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** How much a point (pc from the centre, in the disc plane) sits on a spiral arm, 0..1. */
function armAt(g: Pick<Galaxy, 'normal' | 'e1' | 'arms' | 'twist' | 'radiusPc'>, ip: V3, r: number): number {
  const e2 = cross(g.normal, g.e1)
  const theta = Math.atan2(dot(ip, e2), dot(ip, g.e1))
  const phase = g.arms * (theta - g.twist * Math.log(1 + r / (0.08 * g.radiusPc)))
  return Math.pow(0.5 + 0.5 * Math.cos(phase), 4)
}

/** Spiral-arm strength at a point (km), 0..1; 1 for galaxies without arms. */
export function armStrength(g: Galaxy, posKm: V3): number {
  if (g.kind !== 'spiral') return 1
  const rel = scale(sub(posKm, g.center), 1 / KM_PER_PC)
  const ip = sub(rel, scale(g.normal, dot(rel, g.normal)))
  return armAt(g, ip, len(ip))
}

/** Unnormalised star density at a point (km). */
function raw(g: Pick<Galaxy, 'center' | 'radiusPc' | 'kind' | 'normal' | 'e1' | 'arms' | 'twist' | 'seed'>, posKm: V3, armAverage = false): number {
  const rel = scale(sub(posKm, g.center), 1 / KM_PER_PC)
  const R = g.radiusPc
  const h = dot(rel, g.normal)
  const ip = sub(rel, scale(g.normal, h))
  const r = len(ip)
  if (g.kind === 'spiral') {
    const disc = Math.exp(-r / (0.17 * R) - Math.abs(h) / (0.02 * R)) * smoothstep(1.2 * R, 0.85 * R, r)
    const arm = armAverage ? 1.06 : 0.35 + 2.6 * armAt(g, ip, r)
    const d = len(rel)
    return disc * arm + 6 * Math.exp(-Math.pow(d / (0.06 * R), 2))
  }
  if (g.kind === 'elliptical') {
    const d = Math.max(0.02, Math.hypot(r, h / 0.7) / (0.25 * R))
    return Math.exp(-7.67 * (Math.pow(d, 0.25) - 1)) * smoothstep(1.3 * R, 0.9 * R, Math.hypot(r, h))
  }
  const d = len(rel) / (0.3 * R)
  const k = 1 / (0.15 * R)
  return Math.exp(-d) * (0.3 + 1.4 * noise3(rel[0] * k, rel[1] * k, rel[2] * k, g.seed)) * smoothstep(1.3 * R, 0.8 * R, len(rel))
}

/** Star density relative to the galaxy's reference neighbourhood (1 = like around the Sun). */
export function densityAt(g: Galaxy, posKm: V3): number {
  return raw(g, posKm) / g.norm
}

/** A reference direction in the plane of a disc. */
export function inPlane(normal: V3): V3 {
  const ref: V3 = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  return norm(cross(ref, normal))
}

/** Fill in the normalisation: density 1 at 0.55 radii from the centre, in the plane, arms averaged. */
export function finishGalaxy(g: Omit<Galaxy, 'norm'>): Galaxy {
  const at = g.center.map((c, i) => c + g.e1[i] * 0.55 * g.radiusPc * KM_PER_PC) as V3
  return { ...g, norm: raw(g, at, true) }
}

const GC = raDecToVec(266.405, -28.936, 8200 * KM_PER_PC)
const GNP = raDecToVec(192.859, 27.128)

/** Our galaxy: centre 8.2 kpc toward Sagittarius, disc facing the galactic north pole, normalised to 1 at the Sun. */
export const MILKY_WAY: Galaxy = (() => {
  const toSun = sub([0, 0, 0], GC)
  const e1 = norm(sub(toSun, scale(GNP, dot(toSun, GNP))))
  const g = { key: 'mw', name: 'The Milky Way', center: GC, radiusPc: 15000, kind: 'spiral' as const, normal: GNP, e1, arms: 4, twist: 1.6, seed: 0x5eed, real: true }
  return { ...g, norm: raw(g, [0, 0, 0]) }
})()
