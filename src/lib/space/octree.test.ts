import { describe, expect, it } from 'vitest'
import { MILKY_WAY } from './galaxy'
import { LEVELS, STARS_PER_CHUNK, chunksAround, genChunk, magBand } from './octree'
import { apparentMag, STAR_MAG_LIMIT } from './photometry'
import { KM_PER_PC } from './units'

describe('octree chunks', () => {
  it('are deterministic', () => {
    const a = genChunk(MILKY_WAY, 2, 13, -4, 2)
    const b = genChunk(MILKY_WAY, 2, 13, -4, 2, { cache: false })
    expect(b.count).toBe(a.count)
    expect([...b.pos]).toEqual([...a.pos])
    expect([...b.absMag]).toEqual([...a.absMag])
  })

  it('hold about STARS_PER_CHUNK stars at the solar density', () => {
    // The Sun sits near chunk (-1..0) of a grid anchored at the galactic centre; find its chunk at level 0.
    const s = 25 * KM_PER_PC
    const c = MILKY_WAY.center
    const sx = Math.round(-c[0] / s)
    const sy = Math.round(-c[1] / s)
    const sz = Math.round(-c[2] / s)
    let total = 0
    let n = 0
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++)
        for (let dz = 0; dz <= 1; dz++) {
          total += genChunk(MILKY_WAY, 0, sx + dx, sy + dy, sz + dz, { home: false }).count
          n++
        }
    expect(total / n).toBeGreaterThan(STARS_PER_CHUNK * 0.75)
    expect(total / n).toBeLessThan(STARS_PER_CHUNK * 1.25)
  })

  it('split brightness into contiguous bands that get brighter with level', () => {
    for (let k = 0; k < LEVELS - 1; k++) {
      const [bright, faint] = magBand(k)
      expect(bright).toBeLessThan(faint)
      expect(magBand(k + 1)[1]).toBeCloseTo(bright)
    }
  })

  it('never put a fake star in the sky as seen from Earth', () => {
    for (const ch of chunksAround(MILKY_WAY, [0, 0, 0])) {
      const g = genChunk(MILKY_WAY, ch.k, ch.ix, ch.iy, ch.iz)
      for (let i = 0; i < g.count; i++) {
        const x = g.origin[0] / KM_PER_PC + g.pos[i * 3]
        const y = g.origin[1] / KM_PER_PC + g.pos[i * 3 + 1]
        const z = g.origin[2] / KM_PER_PC + g.pos[i * 3 + 2]
        expect(apparentMag(g.absMag[i], Math.hypot(x, y, z))).toBeGreaterThanOrEqual(STAR_MAG_LIMIT)
      }
    }
  })

  it('stay light even in the crowded galactic centre', () => {
    for (let k = 0; k < 4; k++) expect(genChunk(MILKY_WAY, k, 0, 0, 0).count).toBeLessThanOrEqual(STARS_PER_CHUNK * 6.5)
  })

  it('load a bounded number of chunks around the camera', () => {
    const list = chunksAround(MILKY_WAY, [0, 0, 0])
    expect(list.length).toBeGreaterThan(20)
    expect(list.length).toBeLessThanOrEqual(300)
  })
})
