import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { BREAK, HUES, newId, type Constellation } from './constellations'
import { SCALES, type ScaleId } from './music/scales'
import { INSTRUMENTS, type InstrumentId } from './music/instruments'
import { MAX_ZOOM, MIN_ZOOM, type Camera } from './camera'

export interface SharedSky {
  constellations: Constellation[]
  instrument: InstrumentId
  scale: ScaleId
  camera: Camera | null
}

export const HASH_KEY = 'sky='
const MAX_CONSTELLATIONS = 300
const MAX_STARS = 600

/** Pack a sky into a URL-safe string: positions rounded to whole world units. */
export function encodeSky(sky: SharedSky): string {
  const payload = {
    v: 1,
    i: sky.instrument,
    s: sky.scale,
    cam: sky.camera ? [Math.round(sky.camera.x), Math.round(sky.camera.y), Math.round(sky.camera.zoom * 1000) / 1000] : null,
    c: sky.constellations
      .filter(c => c.stars.length)
      .map(c => [c.name, c.hue, c.stars.flatMap(s => [Math.round(s.x), Math.round(s.y), Math.round(s.b * 100)]), c.seq, c.preset ?? 0]),
  }
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Unpack a shared sky; anything malformed returns null instead of throwing. */
export function decodeSky(str: string): SharedSky | null {
  try {
    const json = decompressFromEncodedURIComponent(str)
    if (!json) return null
    const d = JSON.parse(json)
    if (!d || d.v !== 1 || !Array.isArray(d.c) || d.c.length > MAX_CONSTELLATIONS) return null
    const instrument: InstrumentId = d.i in INSTRUMENTS ? d.i : 'chimes'
    const scale: ScaleId = d.s in SCALES ? d.s : 'pentatonic'
    let camera: Camera | null = null
    if (Array.isArray(d.cam) && d.cam.length === 3 && d.cam.every(isNum)) {
      camera = { x: d.cam[0], y: d.cam[1], zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, d.cam[2])) }
    }
    const constellations: Constellation[] = []
    for (const row of d.c) {
      if (!Array.isArray(row) || row.length < 4) return null
      const [name, hue, flat, seq, preset] = row
      if (typeof name !== 'string' || !isNum(hue) || !Array.isArray(flat) || !Array.isArray(seq)) return null
      if (flat.length % 3 || flat.length / 3 > MAX_STARS || !flat.every(isNum)) return null
      const stars = []
      for (let i = 0; i < flat.length; i += 3) stars.push({ x: flat[i], y: flat[i + 1], b: Math.min(1, Math.max(0, flat[i + 2] / 100)) })
      if (!seq.every(k => k === BREAK || (Number.isInteger(k) && k >= 0 && k < stars.length))) return null
      constellations.push({
        id: newId(),
        name: name.slice(0, 60),
        hue: Math.abs(Math.floor(hue)) % HUES.length,
        stars,
        seq,
        ...(typeof preset === 'string' ? { preset } : {}),
      })
    }
    return { constellations, instrument, scale, camera }
  } catch {
    return null
  }
}

/** The shared sky in a location hash like `#sky=...`, if there is one. */
export function readHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  return h.startsWith(HASH_KEY) ? h.slice(HASH_KEY.length) : null
}
