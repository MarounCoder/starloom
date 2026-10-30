import { galaxiesNear } from '../lib/space/cosmos'
import { DEEP_SIDE_PC, deepSkyIn, type Nebula } from '../lib/space/deepsky'
import type { Galaxy } from '../lib/space/galaxy'
import { chunksAround, genChunk, type ChunkRef, type GenChunk } from '../lib/space/octree'
import { KM_PER_PC } from '../lib/space/units'
import { dist, len, type V3 } from '../lib/space/vec'
import { cam } from './camera'

/**
 * Streams the generated universe around the camera: which galaxies are near, which of their star
 * chunks are wanted, and generating the missing ones a few milliseconds per frame, nearest first.
 */
interface UniverseState {
  near: Galaxy[]
  /** Galaxies the camera is inside (within 1.5 radii): their star chunks are streamed. */
  active: Galaxy[]
  loaded: Map<string, GenChunk>
  nebulae: Nebula[]
  /** Bumped whenever the loaded set changes. */
  version: number
}

export const universe: UniverseState = { near: [], active: [], loaded: new Map(), nebulae: [], version: 0 }

let wanted: (ChunkRef & { g: Galaxy })[] = []
let lastPlan: V3 = [Infinity, 0, 0]
let frame = 0
const BUDGET_MS = 4
const HOME_CLEAR_KM = 1500 * KM_PER_PC

const pcDist = (g: Galaxy) => dist(cam.pos, g.center) / KM_PER_PC

/** Re-plan which chunks we want when the camera has moved a meaningful step. */
function plan() {
  universe.near = galaxiesNear(cam.pos, 1)
  universe.active = universe.near.filter(g => pcDist(g) < g.radiusPc * 1.5)
  wanted = universe.active.flatMap(g => chunksAround(g, cam.pos).map(c => ({ ...c, g })))
  const keep = new Set(wanted.map(w => w.key))
  let changed = false
  for (const key of universe.loaded.keys())
    if (!keep.has(key)) {
      universe.loaded.delete(key)
      changed = true
    }
  // Nebulae in the 27 deep-sky cells around the camera.
  const neb: Nebula[] = []
  for (const g of universe.active) {
    const s = DEEP_SIDE_PC * KM_PER_PC
    const c = [Math.round((cam.pos[0] - g.center[0]) / s), Math.round((cam.pos[1] - g.center[1]) / s), Math.round((cam.pos[2] - g.center[2]) / s)]
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++)
          for (const n of deepSkyIn(g, c[0] + x, c[1] + y, c[2] + z).nebulae)
            // No made-up nebulae in the real neighbourhood: Earth's sky stays real.
            if (g.key !== 'mw' || len(n.pos) > HOME_CLEAR_KM) neb.push(n)
  }
  universe.nebulae = neb
  if (changed) universe.version++
}

/** Called every frame: plan when needed, then generate missing chunks within the time budget. */
export function stepUniverse() {
  // The smallest chunks are 25 pc; re-plan after moving a fifth of that, or every 30 frames.
  if (dist(cam.pos, lastPlan) > 5 * KM_PER_PC || frame++ % 30 === 0) {
    lastPlan = [...cam.pos]
    plan()
  }
  const t0 = performance.now()
  let added = false
  for (const w of wanted) {
    if (universe.loaded.has(w.key)) continue
    if (performance.now() - t0 > BUDGET_MS) break
    universe.loaded.set(w.key, genChunk(w.g, w.k, w.ix, w.iy, w.iz))
    added = true
  }
  if (added) universe.version++
}

let nearGen: V3[] = []
let nearFrame = 0

/** The nearest loaded generated stars (km), refreshed every 15 frames. */
export function nearestGenStarsKm(n = 64): V3[] {
  if (nearFrame++ % 15 !== 0) return nearGen
  const best: [number, V3][] = []
  for (const ch of universe.loaded.values()) {
    if (ch.level > 3) continue
    for (let i = 0; i < ch.count; i++) {
      const p: V3 = [ch.origin[0] + ch.pos[i * 3] * KM_PER_PC, ch.origin[1] + ch.pos[i * 3 + 1] * KM_PER_PC, ch.origin[2] + ch.pos[i * 3 + 2] * KM_PER_PC]
      best.push([dist(p, cam.pos), p])
    }
  }
  best.sort((a, b) => a[0] - b[0])
  nearGen = best.slice(0, n).map(b => b[1])
  return nearGen
}

/** Distance (km) to the edge of the nearest galaxy we are outside of (inside one, its stars set the pace). */
export function nearestGalaxyKm(): number {
  let best = Infinity
  for (const g of universe.near) {
    const d = pcDist(g) - g.radiusPc
    if (d > 0) best = Math.min(best, d * KM_PER_PC)
  }
  return best
}
