import { hash2, hash3, mulberry32, normal } from '../rng'
import { DEEP_SIDE_PC, clusterStars, deepSkyIn } from './deepsky'
import { densityAt, type Galaxy } from './galaxy'
import { apparentMag, STAR_MAG_LIMIT } from './photometry'
import { KM_PER_PC } from './units'
import type { V3 } from './vec'

/**
 * Generated stars live in a nested grid per galaxy. Level k has cubes of 25·2^k pc, anchored on the
 * galaxy centre, and holds only stars in one brightness band: the bigger the cube, the brighter its
 * stars. Each level is loaded only near the camera, so the screen always has about the same number of stars.
 */
export const LEVELS = 10
export const BASE_SIDE_PC = 25
/**
 * Generation constants are frozen: star ids name stars by their index in a chunk, so changing any of
 * these would silently move every generated star in every saved sky and shared link.
 * Phones draw fewer of the stars (see renderTier in lib/tier.ts); they never generate fewer.
 */
export const STARS_PER_CHUNK = 220
const BAND_RADIUS = 0.8
const MAX_CROWD = 6
/** Chunks are loaded when their box is within this many sides of the camera. */
export const LOAD_RADIUS = 0.8

export const sidePc = (k: number) => BASE_SIDE_PC * 2 ** k

/** Faintest absolute magnitude for level k: such a star looks magnitude 6.5 at the load radius. */
const faintAt = (k: number) => 11.5 - 5 * Math.log10(BAND_RADIUS * sidePc(k))

/** [brightest, faintest] absolute magnitude stored at level k. */
export function magBand(k: number): [number, number] {
  const bright = k === LEVELS - 1 ? faintAt(k) - 1.5 : faintAt(k + 1)
  const faint = k === 0 ? 9 : faintAt(k)
  return [bright, faint]
}

export interface GenChunk {
  key: string
  galaxy: string
  level: number
  ix: number
  iy: number
  iz: number
  /** Chunk centre, km. */
  origin: V3
  /** Parsecs from the origin; 3 per star. */
  pos: Float32Array
  absMag: Float32Array
  ci: Float32Array
  count: number
}

const lru = new Map<string, GenChunk>()
const MAX_CHUNKS = 600

export function clearChunkCache() {
  lru.clear()
}

function poisson(lambda: number, rand: () => number): number {
  if (lambda <= 0) return 0
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(rand)))
  const l = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rand()
  } while (p > l)
  return k - 1
}

/** A plausible colour for a generated star: hotter when brighter, with some red giants among the bright ones. */
function colourFor(absMag: number, rand: () => number): number {
  if (absMag > -3 && absMag < 2 && rand() < 0.18) return 1.0 + rand() * 0.6
  return Math.max(-0.3, Math.min(1.9, 0.12 * absMag + 0.07 + normal(rand) * 0.1))
}

export interface GenOptions {
  cache?: boolean
  /** Drop Milky Way stars that would show up in Earth's sky (the real catalogue owns that sky). Default true. */
  home?: boolean
}

const inChunk = (pc: number, i: number, side: number) => Math.round(pc / side) === i

export function genChunk(g: Galaxy, k: number, ix: number, iy: number, iz: number, opts: GenOptions = {}): GenChunk {
  const { cache = true, home = true } = opts
  const key = `${g.key}/${k}/${ix},${iy},${iz}`
  if (cache && home) {
    const hit = lru.get(key)
    if (hit) {
      lru.delete(key)
      lru.set(key, hit)
      return hit
    }
  }
  const s = sidePc(k)
  const sKm = s * KM_PER_PC
  const origin: V3 = [g.center[0] + ix * sKm, g.center[1] + iy * sKm, g.center[2] + iz * sKm]
  const rand = mulberry32(hash3(ix, iy, iz, hash2(k, g.seed)))
  const [bright, faint] = magBand(k)
  const filterHome = home && g.key === 'mw'
  const originPc: V3 = [origin[0] / KM_PER_PC, origin[1] / KM_PER_PC, origin[2] / KM_PER_PC]

  // Rejection sampling against the density, with the bound taken from the centre and corners.
  let dmax = densityAt(g, origin)
  for (const cx of [-0.5, 0.5]) for (const cy of [-0.5, 0.5]) for (const cz of [-0.5, 0.5]) dmax = Math.max(dmax, densityAt(g, [origin[0] + cx * sKm, origin[1] + cy * sKm, origin[2] + cz * sKm]))
  dmax *= 1.15

  const pos: number[] = []
  const mags: number[] = []
  const cis: number[] = []
  const keep = (x: number, y: number, z: number, m: number, ci: number) => {
    if (filterHome && apparentMag(m, Math.hypot(originPc[0] + x, originPc[1] + y, originPc[2] + z)) < STAR_MAG_LIMIT) return
    pos.push(x, y, z)
    mags.push(m)
    cis.push(ci)
  }

  // Crowded cores are capped at MAX_CROWD times the solar density, keeping their shape but not their cost.
  const n = poisson(STARS_PER_CHUNK * Math.min(dmax, MAX_CROWD), rand)
  for (let i = 0; i < n; i++) {
    const x = (rand() - 0.5) * s
    const y = (rand() - 0.5) * s
    const z = (rand() - 0.5) * s
    const accept = rand() * dmax < densityAt(g, [origin[0] + x * KM_PER_PC, origin[1] + y * KM_PER_PC, origin[2] + z * KM_PER_PC])
    const m = bright + rand() * (faint - bright)
    const ci = colourFor(m, rand)
    if (accept) keep(x, y, z, m, ci)
  }

  // Star clusters: each of their stars belongs to the one chunk of its level that contains it.
  if (k <= 4 && g.kind !== 'elliptical') {
    const relPc: V3 = [ix * s, iy * s, iz * s]
    const dx = Math.round(relPc[0] / DEEP_SIDE_PC)
    const dy = Math.round(relPc[1] / DEEP_SIDE_PC)
    const dz = Math.round(relPc[2] / DEEP_SIDE_PC)
    for (let ax = -1; ax <= 1; ax++)
      for (let ay = -1; ay <= 1; ay++)
        for (let az = -1; az <= 1; az++)
          for (const c of deepSkyIn(g, dx + ax, dy + ay, dz + az).clusters) {
            const cp = [(c.pos[0] - g.center[0]) / KM_PER_PC, (c.pos[1] - g.center[1]) / KM_PER_PC, (c.pos[2] - g.center[2]) / KM_PER_PC]
            const reach = c.radiusPc * 4 + s
            if (Math.abs(cp[0] - relPc[0]) > reach || Math.abs(cp[1] - relPc[1]) > reach || Math.abs(cp[2] - relPc[2]) > reach) continue
            for (const st of clusterStars(c)) {
              if (st.absMag < bright || st.absMag >= faint) continue
              const px = (st.pos[0] - g.center[0]) / KM_PER_PC
              const py = (st.pos[1] - g.center[1]) / KM_PER_PC
              const pz = (st.pos[2] - g.center[2]) / KM_PER_PC
              if (!inChunk(px, ix, s) || !inChunk(py, iy, s) || !inChunk(pz, iz, s)) continue
              keep(px - relPc[0], py - relPc[1], pz - relPc[2], st.absMag, st.ci)
            }
          }
  }

  const chunk: GenChunk = {
    key,
    galaxy: g.key,
    level: k,
    ix,
    iy,
    iz,
    origin,
    pos: Float32Array.from(pos),
    absMag: Float32Array.from(mags),
    ci: Float32Array.from(cis),
    count: mags.length,
  }
  if (cache && home) {
    lru.set(key, chunk)
    if (lru.size > MAX_CHUNKS) lru.delete(lru.keys().next().value!)
  }
  return chunk
}

export interface ChunkRef {
  key: string
  k: number
  ix: number
  iy: number
  iz: number
  /** Distance from the camera to the chunk box, in sides. */
  dist: number
}

/** The chunks of every level whose box is within LOAD_RADIUS sides of the camera, nearest first. */
export function chunksAround(g: Galaxy, camKm: V3): ChunkRef[] {
  const out: ChunkRef[] = []
  const gr = g.radiusPc * 1.3
  for (let k = 0; k < LEVELS; k++) {
    const s = sidePc(k)
    const c = [(camKm[0] - g.center[0]) / KM_PER_PC / s, (camKm[1] - g.center[1]) / KM_PER_PC / s, (camKm[2] - g.center[2]) / KM_PER_PC / s]
    const r = [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]
    for (let ix = r[0] - 2; ix <= r[0] + 2; ix++)
      for (let iy = r[1] - 2; iy <= r[1] + 2; iy++)
        for (let iz = r[2] - 2; iz <= r[2] + 2; iz++) {
          const d = Math.hypot(Math.max(0, Math.abs(c[0] - ix) - 0.5), Math.max(0, Math.abs(c[1] - iy) - 0.5), Math.max(0, Math.abs(c[2] - iz) - 0.5))
          if (d > LOAD_RADIUS) continue
          if (Math.hypot(ix, iy, iz) * s - s > gr) continue
          out.push({ key: `${g.key}/${k}/${ix},${iy},${iz}`, k, ix, iy, iz, dist: d })
        }
  }
  return out.sort((a, b) => a.dist - b.dist || b.k - a.k)
}
