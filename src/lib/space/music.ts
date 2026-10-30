import { clamp } from '../rng'
import { ANCHOR_DEGREE, MAX_DEGREE } from '../music/scales'
import { eclipticLatDeg } from './frames'
import { dot, norm, sub, type V3 } from './vec'

const BREAK = -1

/** Degrees of ecliptic latitude per scale step. */
export const STEP_DEG = 2

/** Scale degree of a star from how high it appears above the first star, measured from where you are. */
export function degreeForLat(latDeg: number, anchorLatDeg: number): number {
  return clamp(Math.round((latDeg - anchorLatDeg) / STEP_DEG) + ANCHOR_DEGREE, 0, MAX_DEGREE)
}

/** Milliseconds to the next note: stars far apart on the sky are further apart in time. */
export const noteGap = (angSepDeg: number) => clamp(170 + angSepDeg * 29, 190, 760)
export const REST_MS = 420
export const LOOP_PAUSE_MS = 1000

/** Brighter stars play louder. */
export const velocityForMag = (m: number) => clamp(1 - (m + 1.5) / 12, 0.4, 1)

/**
 * The order to play a real constellation's figure: depth-first from its brightest star, every line once.
 * Going back up to a branch is a rest followed by the branch star; separate parts are separated by a rest.
 */
export function walkFigure(segs: [number, number][], mags: Map<number, number>): number[] {
  const adj = new Map<number, number[]>()
  const link = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, [])
    adj.get(a)!.push(b)
  }
  for (const [a, b] of segs) {
    link(a, b)
    link(b, a)
  }
  const bright = (i: number) => mags.get(i) ?? 99
  for (const list of adj.values()) list.sort((x, y) => bright(x) - bright(y))
  const used = new Set<string>()
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const out: number[] = []

  const dfs = (u: number) => {
    let first = true
    for (const v of adj.get(u)!) {
      const k = key(u, v)
      if (used.has(k)) continue
      used.add(k)
      if (!first) out.push(BREAK, u)
      out.push(v)
      dfs(v)
      first = false
    }
  }

  for (;;) {
    const open = [...adj.keys()].filter(u => adj.get(u)!.some(v => !used.has(key(u, v))))
    if (!open.length) break
    const start = open.sort((a, b) => bright(a) - bright(b))[0]
    if (out.length) out.push(BREAK)
    out.push(start)
    dfs(start)
  }
  return out
}

export interface Note {
  /** Position in the sequence. */
  k: number
  rest: boolean
  /** Index into the star list (−1 for a rest). */
  idx: number
  degree: number
  /** Milliseconds until the next step. */
  gapMs: number
  velocity: number
}

/**
 * A constellation's melody as heard from a point in space: pitch from each star's ecliptic latitude
 * relative to the first, rhythm from the angle to the next star, loudness from apparent brightness.
 */
export function melody(starsKm: V3[], seq: number[], camKm: V3, mags: number[]): Note[] {
  const dir = (i: number) => norm(sub(starsKm[i], camKm))
  const first = seq.find(i => i !== BREAK)
  const anchor = first === undefined ? 0 : eclipticLatDeg(dir(first))
  return seq.map((i, k) => {
    if (i === BREAK || !starsKm[i]) return { k, rest: true, idx: -1, degree: 0, gapMs: REST_MS, velocity: 0 }
    const next = seq[k + 1]
    const sep = next !== undefined && next !== BREAK && starsKm[next] ? (Math.acos(clamp(dot(dir(i), dir(next)), -1, 1)) * 180) / Math.PI : null
    return {
      k,
      rest: false,
      idx: i,
      degree: degreeForLat(eclipticLatDeg(dir(i)), anchor),
      gapMs: sep === null ? REST_MS : noteGap(sep),
      velocity: velocityForMag(mags[i] ?? 3),
    }
  })
}
