import { hash3, mulberry32, normal } from '../rng'
import { finishGalaxy, inPlane, MILKY_WAY, type Galaxy, type GalaxyKind } from './galaxy'
import { KM_PER_PC } from './units'
import { dist, norm, type V3 } from './vec'

/** The universe is cut into 1 Mpc cells, each holding a few generated galaxies. Cell 0,0,0 is centred on the Sun. */
export const CELL_PC = 1_000_000
const CELL_KM = CELL_PC * KM_PER_PC
const SEED = 0x51a7
const HOME_CLEAR_PC = 150_000

const cache = new Map<string, Galaxy[]>()

const pad = (n: number, w: number) => String(n).padStart(w, '0')

function galaxyName(h: number): string {
  return `SLG ${pad(h % 10000, 4)}${h & 1 ? '+' : '−'}${pad((h >>> 14) % 90, 2)} (generated)`
}

export function galaxiesInCell(cx: number, cy: number, cz: number): Galaxy[] {
  const ck = `${cx},${cy},${cz}`
  const hit = cache.get(ck)
  if (hit) return hit
  const rand = mulberry32(hash3(cx, cy, cz, SEED))
  const r0 = rand()
  const n = r0 < 0.12 ? 0 : r0 < 0.5 ? 1 : r0 < 0.82 ? 2 : 3
  const out: Galaxy[] = cx === 0 && cy === 0 && cz === 0 ? [MILKY_WAY] : []
  for (let j = 0; j < n; j++) {
    const center: V3 = [(cx + rand() - 0.5) * CELL_KM, (cy + rand() - 0.5) * CELL_KM, (cz + rand() - 0.5) * CELL_KM]
    const size = rand()
    const kr = rand()
    const kind: GalaxyKind = kr < 0.55 ? 'spiral' : kr < 0.8 ? 'elliptical' : 'irregular'
    const nrm = norm([normal(rand), normal(rand), normal(rand)])
    const arms = 2 + Math.floor(rand() * 3)
    const twist = 1.2 + rand() * 1.2
    const seed = hash3(cx, cy, cz, j + 1)
    if (out.length && out[0].key === 'mw' && dist(center, MILKY_WAY.center) < HOME_CLEAR_PC * KM_PER_PC) continue
    out.push(
      finishGalaxy({
        key: `${ck}.${j}`,
        name: galaxyName(seed),
        center,
        radiusPc: 3000 + 37000 * size * size,
        kind,
        normal: nrm,
        e1: inPlane(nrm),
        arms,
        twist,
        seed,
        real: false,
      }),
    )
  }
  if (cache.size > 4096) cache.delete(cache.keys().next().value!)
  cache.set(ck, out)
  return out
}

export const cellOf = (posKm: V3): V3 => [Math.round(posKm[0] / CELL_KM), Math.round(posKm[1] / CELL_KM), Math.round(posKm[2] / CELL_KM)]

/** Galaxies in the cells around a point. */
export function galaxiesNear(posKm: V3, cells = 1): Galaxy[] {
  const [x, y, z] = cellOf(posKm)
  const out: Galaxy[] = []
  for (let dx = -cells; dx <= cells; dx++)
    for (let dy = -cells; dy <= cells; dy++) for (let dz = -cells; dz <= cells; dz++) out.push(...galaxiesInCell(x + dx, y + dy, z + dz))
  return out
}

const KEY = /^(-?\d+),(-?\d+),(-?\d+)\.(\d+)$/

export function galaxyByKey(key: string): Galaxy | null {
  if (key === 'mw') return MILKY_WAY
  const m = KEY.exec(key)
  if (!m) return null
  return galaxiesInCell(+m[1], +m[2], +m[3]).find(g => g.key === key) ?? null
}
