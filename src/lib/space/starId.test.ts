import { describe, expect, it } from 'vitest'
import { MILKY_WAY } from './galaxy'
import { clearChunkCache, genChunk } from './octree'
import { parseStarId, resolveStar } from './starId'
import { KM_PER_PC } from './units'
import { galaxiesInCell } from './cosmos'

describe('star ids', () => {
  it('resolve every generated star back to where it was made', () => {
    // A level-3 chunk halfway between the Sun and the galactic centre, in the disc.
    const s3 = 200 * KM_PER_PC
    const idx = MILKY_WAY.center.map(c => Math.round(-c / 2 / s3)) as [number, number, number]
    const ch = genChunk(MILKY_WAY, 3, ...idx)
    expect(ch.count).toBeGreaterThan(0)
    for (let i = 0; i < ch.count; i++) {
      const r = resolveStar(`g${ch.key}/${i}`, null)!
      expect(r.generated).toBe(true)
      for (let k = 0; k < 3; k++) expect(Math.abs(r.posKm[k] - (ch.origin[k] + ch.pos[i * 3 + k] * KM_PER_PC))).toBeLessThan(1)
    }
  })

  it('resolve the same from a cold cache as after loading the neighbourhood', () => {
    const id = `g${genChunk(MILKY_WAY, 1, -5, 9, 0).key}/3`
    clearChunkCache()
    const cold = resolveStar(id, null)
    for (let x = -3; x < 2; x++) for (let y = 5; y < 10; y++) for (let z = -2; z < 2; z++) genChunk(MILKY_WAY, 1, x, y, z)
    const warm = resolveStar(id, null)
    expect(warm).toEqual(cold)
  })

  it('work in other galaxies too', () => {
    const g = galaxiesInCell(2, 0, -1)[0]
    if (!g) return
    const ch = genChunk(g, 4, 0, 0, 0)
    if (!ch.count) return
    const r = resolveStar(`g${ch.key}/0`, null)
    expect(r?.galaxy).toBe(g.name)
  })

  it('reject malformed and impossible ids', () => {
    for (const bad of ['g mw/x', 'gmw/99/0,0,0/0', 'gmw/0/0,0,0/99999', 'h999999999', '', 'gmw/0/0,0/1', 'g1,2.5/0/0,0,0/0', 'gmw/0/0,0,0/-1'])
      expect(resolveStar(bad, null), bad).toBeNull()
    expect(parseStarId('gmw/2/1,-3,4/17')).toEqual({ kind: 'gen', galaxy: 'mw', k: 2, ix: 1, iy: -3, iz: 4, i: 17 })
    expect(parseStarId('h32263')).toEqual({ kind: 'real', hyg: 32263 })
    expect(parseStarId('nope')).toBeNull()
  })
})
