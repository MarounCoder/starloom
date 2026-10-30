import type { StarCatalog } from './catalog'
import { galaxyByKey } from './cosmos'
import { LEVELS, genChunk } from './octree'
import { KM_PER_PC } from './units'
import type { V3 } from './vec'

/**
 * A star's stable id. Real stars: "h<hygId>". Generated stars: "g<galaxy>/<level>/<ix>,<iy>,<iz>/<index>",
 * where galaxy is "mw" or "<cx>,<cy>,<cz>.<n>". Generation is deterministic, so ids stay valid forever.
 */
export type StarId = string

export type ParsedStarId =
  | { kind: 'real'; hyg: number }
  | { kind: 'gen'; galaxy: string; k: number; ix: number; iy: number; iz: number; i: number }

const INT = /^-?\d+$/
const GALAXY = /^(mw|-?\d+,-?\d+,-?\d+\.\d+)$/

export function parseStarId(id: string): ParsedStarId | null {
  if (/^h\d+$/.test(id)) return { kind: 'real', hyg: Number(id.slice(1)) }
  if (!id.startsWith('g')) return null
  const parts = id.slice(1).split('/')
  if (parts.length !== 4) return null
  const [galaxy, k, coords, i] = parts
  const xyz = coords.split(',')
  if (!GALAXY.test(galaxy) || !INT.test(k) || !/^\d+$/.test(i) || xyz.length !== 3 || !xyz.every(c => INT.test(c))) return null
  const level = Number(k)
  if (level < 0 || level >= LEVELS) return null
  return { kind: 'gen', galaxy, k: level, ix: Number(xyz[0]), iy: Number(xyz[1]), iz: Number(xyz[2]), i: Number(i) }
}

export interface ResolvedStar {
  posKm: V3
  absMag: number
  ci: number
  generated: boolean
  /** Galaxy name ("The Milky Way" for real stars). */
  galaxy: string
}

export function resolveStar(id: string, catalog: StarCatalog | null): ResolvedStar | null {
  const p = parseStarId(id)
  if (!p) return null
  if (p.kind === 'real') {
    const i = catalog?.byHyg.get(p.hyg)
    if (!catalog || i === undefined) return null
    return {
      posKm: [catalog.pos[i * 3] * KM_PER_PC, catalog.pos[i * 3 + 1] * KM_PER_PC, catalog.pos[i * 3 + 2] * KM_PER_PC],
      absMag: catalog.absMag[i],
      ci: catalog.ci[i],
      generated: false,
      galaxy: 'The Milky Way',
    }
  }
  const g = galaxyByKey(p.galaxy)
  if (!g) return null
  const ch = genChunk(g, p.k, p.ix, p.iy, p.iz)
  if (p.i >= ch.count) return null
  return {
    posKm: [ch.origin[0] + ch.pos[p.i * 3] * KM_PER_PC, ch.origin[1] + ch.pos[p.i * 3 + 1] * KM_PER_PC, ch.origin[2] + ch.pos[p.i * 3 + 2] * KM_PER_PC],
    absMag: ch.absMag[p.i],
    ci: ch.ci[p.i],
    generated: true,
    galaxy: g.name,
  }
}
