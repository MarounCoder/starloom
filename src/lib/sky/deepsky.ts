import { gauss, hash2, mulberry32 } from '../rng'

/** Deep-sky objects live in large square regions, one optional object per region and layer. */
export const REGION = 2400

export type NebulaKind = 'emission' | 'reflection' | 'planetary'

export interface Nebula {
  type: 'nebula'
  id: string
  name: string
  kind: NebulaKind
  x: number
  y: number
  r: number
  blobs: { dx: number; dy: number; r: number; color: string; a: number }[]
}

export interface Cluster {
  type: 'cluster'
  id: string
  name: string
  x: number
  y: number
  r: number
  stars: { dx: number; dy: number; b: number }[]
}

export interface Galaxy {
  type: 'galaxy'
  id: string
  name: string
  x: number
  y: number
  r: number
  tilt: number
  rot: number
  arms: number
  hue: string
}

export type DeepSkyObject = Nebula | Cluster | Galaxy

/** Which layer each object type lives on: galaxies far, nebulae in between, clusters with the stars you place. */
export const DEEP_LAYER = { galaxy: 0, nebula: 1, cluster: 2 } as const

const PALETTES: Record<NebulaKind, string[]> = {
  emission: ['255,86,140', '255,132,118', '255,170,120', '110,200,215'],
  reflection: ['100,140,255', '140,185,255', '190,205,255'],
  planetary: ['90,220,210', '255,160,90', '150,120,255'],
}

const catalogue = (rand: () => number, prefix: string) => `${prefix} ${1000 + Math.floor(rand() * 8999)}`

function nebula(rand: () => number, id: string, x: number, y: number, kind: NebulaKind, name?: string): Nebula {
  const r = 220 + rand() * 320
  const colors = PALETTES[kind]
  const blobs: Nebula['blobs'] = []
  if (kind === 'planetary') {
    const ring = r * 0.35
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2
      blobs.push({ dx: Math.cos(a) * ring, dy: Math.sin(a) * ring * 0.8, r: ring * 0.55, color: colors[0], a: 0.12 })
    }
    blobs.push({ dx: 0, dy: 0, r: ring * 0.9, color: colors[1], a: 0.12 })
    blobs.push({ dx: 0, dy: 0, r: ring * 1.8, color: colors[2], a: 0.06 })
  } else {
    const n = 34 + Math.floor(rand() * 22)
    // Blobs cluster along a few curved filaments rather than a single round cloud.
    const strands = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      const s = i % strands
      const t = gauss(rand) * 1.2
      const bend = (s - strands / 2) * 0.6 + rand() * 0.3
      blobs.push({
        dx: t * r * 0.6 + Math.sin(t * 2 + s) * r * 0.15,
        dy: (bend + t * t * 0.25) * r * 0.35 + gauss(rand) * r * 0.12,
        r: r * (0.12 + rand() * 0.4),
        color: colors[Math.floor(rand() * colors.length)],
        a: 0.08 + rand() * 0.16,
      })
    }
    blobs.push({ dx: 0, dy: 0, r: r * 0.35, color: '255,235,220', a: 0.22 })
  }
  return { type: 'nebula', id, name: name ?? catalogue(rand, 'SL'), kind, x, y, r, blobs }
}

function cluster(rand: () => number, id: string, x: number, y: number, name?: string): Cluster {
  const r = 90 + rand() * 90
  const n = 40 + Math.floor(rand() * 70)
  const stars = Array.from({ length: n }, () => ({ dx: gauss(rand) * r * 0.6, dy: gauss(rand) * r * 0.6, b: 0.3 + rand() * 0.7 }))
  return { type: 'cluster', id, name: name ?? catalogue(rand, 'Cl'), x, y, r, stars }
}

function galaxy(rand: () => number, id: string, x: number, y: number, name?: string): Galaxy {
  return {
    type: 'galaxy',
    id,
    name: name ?? catalogue(rand, 'Gx'),
    x,
    y,
    r: 70 + rand() * 120,
    tilt: 0.3 + rand() * 0.6,
    rot: rand() * Math.PI,
    arms: 2 + Math.floor(rand() * 3),
    hue: rand() < 0.5 ? '200,210,255' : '255,225,190',
  }
}

/** Hand-placed objects near home, so the first view always has something to find. */
const LANDMARKS: Record<string, (rand: () => number) => DeepSkyObject> = {
  'galaxy:0:0': rand => galaxy(rand, 'home-galaxy', -620, 300, 'The Pinwheel Drift'),
  'nebula:0:0': rand => nebula(rand, 'home-nebula', 720, -260, 'emission', 'The Loom Nebula'),
  'cluster:-1:0': rand => cluster(rand, 'home-cluster', -1050, 420, 'The Seven Lanterns'),
}

const memo = new Map<string, DeepSkyObject | null>()

/** The deep-sky object (if any) in a region, deterministic for a given region and type. */
export function getRegionObject(type: DeepSkyObject['type'], rx: number, ry: number): DeepSkyObject | null {
  const key = `${type}:${rx}:${ry}`
  if (memo.has(key)) return memo.get(key)!
  if (memo.size > 4000) memo.clear()
  const obj = makeRegionObject(type, rx, ry)
  memo.set(key, obj)
  return obj
}

function makeRegionObject(type: DeepSkyObject['type'], rx: number, ry: number): DeepSkyObject | null {
  const seed = { galaxy: 71, nebula: 73, cluster: 79 }[type]
  const rand = mulberry32(hash2(rx, ry, seed))
  const landmark = LANDMARKS[`${type}:${rx}:${ry}`]
  if (landmark) return landmark(rand)
  const chance = { galaxy: 0.3, nebula: 0.42, cluster: 0.32 }[type]
  if (rand() > chance) return null
  const id = `${type}:${rx}:${ry}`
  const x = (rx + 0.15 + rand() * 0.7) * REGION
  const y = (ry + 0.15 + rand() * 0.7) * REGION
  if (type === 'galaxy') return galaxy(rand, id, x, y)
  if (type === 'cluster') return cluster(rand, id, x, y)
  const k = rand()
  return nebula(rand, id, x, y, k < 0.55 ? 'emission' : k < 0.85 ? 'reflection' : 'planetary')
}
