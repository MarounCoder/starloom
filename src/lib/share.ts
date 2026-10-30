import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { BREAK, HUES, newId, withoutStars, type Constellation } from './constellations'
import { SCALES, type ScaleId } from './music/scales'
import { INSTRUMENTS, type InstrumentId } from './music/instruments'
import { BODIES, type BodyId } from './space/bodies'
import { IAU } from './space/iau'
import { parseStarId } from './space/starId'
import type { V3 } from './space/vec'

export type SharedTarget =
  | { kind: 'body'; id: BodyId }
  | { kind: 'star'; id: string }
  | { kind: 'figure'; abbr: string }
  | { kind: 'galaxy'; id: string }

export interface SharedSky {
  constellations: Constellation[]
  instrument: InstrumentId
  scale: ScaleId
  camera: { pos: V3; yaw: number; pitch: number } | null
  target: SharedTarget | null
}

export const HASH_KEY = 'sky='
const MAX_CONSTELLATIONS = 300
const MAX_STARS = 600

const targetKey = (t: SharedTarget) => (t.kind === 'body' ? `body:${t.id}` : t.kind === 'star' ? `star:${t.id}` : t.kind === 'figure' ? `fig:${t.abbr}` : `gal:${t.id}`)

function parseTarget(k: unknown): SharedTarget | null {
  if (typeof k !== 'string') return null
  const at = k.indexOf(':')
  const [kind, id] = [k.slice(0, at), k.slice(at + 1)]
  if (kind === 'body' && id in BODIES) return { kind: 'body', id: id as BodyId }
  if (kind === 'star' && parseStarId(id)) return { kind: 'star', id }
  if (kind === 'fig' && IAU.some(c => c.abbr === id)) return { kind: 'figure', abbr: id }
  if (kind === 'gal' && /^(mw|-?\d+,-?\d+,-?\d+\.\d+)$/.test(id)) return { kind: 'galaxy', id }
  return null
}

/** Pack a sky into a URL-safe string: positions to the kilometre, angles to 1e-4 rad. */
export function encodeSky(sky: SharedSky): string {
  const cam = sky.camera
  const payload = {
    v: 2,
    i: sky.instrument,
    s: sky.scale,
    cam: cam ? [...cam.pos.map(Math.round), Math.round(cam.yaw * 1e4) / 1e4, Math.round(cam.pitch * 1e4) / 1e4] : null,
    t: sky.target ? targetKey(sky.target) : null,
    c: sky.constellations.filter(c => c.stars.length).map(c => [c.name, c.hue, c.stars, c.seq]),
  }
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Unpack a shared sky. Anything malformed returns null; a star id that makes no sense is dropped on its own. */
export function decodeSky(str: string): SharedSky | null {
  try {
    const json = decompressFromEncodedURIComponent(str)
    if (!json) return null
    const d = JSON.parse(json)
    if (!d || d.v !== 2 || !Array.isArray(d.c) || d.c.length > MAX_CONSTELLATIONS) return null
    const instrument: InstrumentId = d.i in INSTRUMENTS ? d.i : 'chimes'
    const scale: ScaleId = d.s in SCALES ? d.s : 'pentatonic'
    let camera: SharedSky['camera'] = null
    if (Array.isArray(d.cam) && d.cam.length === 5 && d.cam.every(isNum)) {
      camera = { pos: [d.cam[0], d.cam[1], d.cam[2]], yaw: d.cam[3], pitch: Math.max(-1.55, Math.min(1.55, d.cam[4])) }
    }
    const constellations: Constellation[] = []
    for (const row of d.c) {
      if (!Array.isArray(row) || row.length !== 4) return null
      const [name, hue, stars, seq] = row
      if (typeof name !== 'string' || !isNum(hue) || !Array.isArray(stars) || !Array.isArray(seq)) return null
      if (stars.length > MAX_STARS || !stars.every(s => typeof s === 'string')) return null
      if (!seq.every(k => k === BREAK || (Number.isInteger(k) && k >= 0 && k < stars.length))) return null
      const c: Constellation = { id: newId(), name: name.slice(0, 60), hue: Math.abs(Math.floor(hue)) % HUES.length, stars, seq }
      const bad = new Set<number>()
      stars.forEach((s: string, i: number) => !parseStarId(s) && bad.add(i))
      const clean = withoutStars(c, bad)
      if (clean.stars.length) constellations.push(clean)
    }
    return { constellations, instrument, scale, camera, target: parseTarget(d.t) }
  } catch {
    return null
  }
}

/** The shared sky in a location hash like `#sky=...`, if there is one. */
export function readHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  return h.startsWith(HASH_KEY) ? h.slice(HASH_KEY.length) : null
}
