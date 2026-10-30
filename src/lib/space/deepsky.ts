import { hash3, mulberry32, normal } from '../rng'
import { densityAt, type Galaxy } from './galaxy'
import { KM_PER_PC } from './units'
import type { V3 } from './vec'

/** Clusters and nebulae are placed per level-6 cell (1.6 kpc) of a spiral galaxy. */
export const DEEP_LEVEL = 6
export const DEEP_SIDE_PC = 25 * 2 ** DEEP_LEVEL

export interface Nebula {
  key: string
  pos: V3
  radiusPc: number
  /** 0..1 around the colour wheel: reds, pinks, teals. */
  hue: number
  seed: number
}

export interface Cluster {
  key: string
  pos: V3
  radiusPc: number
  count: number
  seed: number
}

export interface ClusterStar {
  pos: V3
  absMag: number
  ci: number
}

const cache = new Map<string, { nebulae: Nebula[]; clusters: Cluster[] }>()

/** The nebulae and open clusters in one 1.6 kpc cell of a galaxy (spirals only; ellipticals are old and clean). */
export function deepSkyIn(g: Galaxy, ix: number, iy: number, iz: number): { nebulae: Nebula[]; clusters: Cluster[] } {
  const key = `${g.key}/${ix},${iy},${iz}`
  const hit = cache.get(key)
  if (hit) return hit
  const out = { nebulae: [] as Nebula[], clusters: [] as Cluster[] }
  if (g.kind !== 'irregular' && g.kind !== 'spiral') {
    cache.set(key, out)
    return out
  }
  const s = DEEP_SIDE_PC * KM_PER_PC
  const centre: V3 = [g.center[0] + ix * s, g.center[1] + iy * s, g.center[2] + iz * s]
  const rand = mulberry32(hash3(ix, iy, iz, g.seed ^ 0xdee9))
  const dense = densityAt(g, centre)
  const place = (): V3 => [centre[0] + (rand() - 0.5) * s, centre[1] + (rand() - 0.5) * s, centre[2] + (rand() - 0.5) * s]
  const nNeb = dense > 0.3 ? Math.floor(rand() * 3) : 0
  for (let j = 0; j < nNeb; j++) {
    const pos = place()
    if (densityAt(g, pos) < 0.2) continue
    out.nebulae.push({ key: `${key}/n${j}`, pos, radiusPc: 20 + rand() * 100, hue: rand(), seed: hash3(ix, iy, iz, j + 77) })
  }
  const nCl = dense > 0.3 ? Math.floor(rand() * 3) : 0
  for (let j = 0; j < nCl; j++) {
    const pos = place()
    if (densityAt(g, pos) < 0.2) continue
    out.clusters.push({ key: `${key}/c${j}`, pos, radiusPc: 2 + rand() * 6, count: 40 + Math.floor(rand() * 160), seed: hash3(ix, iy, iz, j + 991) })
  }
  if (cache.size > 2048) cache.delete(cache.keys().next().value!)
  cache.set(key, out)
  return out
}

/** Every star of a cluster: a Gaussian ball of young, mostly blue-white stars. */
export function clusterStars(c: Cluster): ClusterStar[] {
  const rand = mulberry32(c.seed)
  const out: ClusterStar[] = []
  const r = c.radiusPc * KM_PER_PC
  for (let i = 0; i < c.count; i++) {
    const absMag = -1.5 + 9 * Math.sqrt(rand())
    out.push({
      pos: [c.pos[0] + normal(rand) * r, c.pos[1] + normal(rand) * r, c.pos[2] + normal(rand) * r],
      absMag,
      ci: Math.max(-0.3, Math.min(1.6, 0.1 * absMag - 0.1 + normal(rand) * 0.08)),
    })
  }
  return out
}
