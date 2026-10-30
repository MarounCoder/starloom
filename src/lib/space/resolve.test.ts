import { describe, expect, it } from 'vitest'
import { BREAK, type Constellation } from '../constellations'
import { MILKY_WAY } from './galaxy'
import { genChunk } from './octree'
import { resolveSky } from './resolve'
import { KM_PER_PC } from './units'
import type { StarCatalog } from './catalog'

const emptyCatalog = { count: 0, pos: new Float32Array(0), byHyg: new Map(), byHip: new Map() } as unknown as StarCatalog

const s3 = 200 * KM_PER_PC
const idx = MILKY_WAY.center.map(c => Math.round(-c / 2 / s3)) as [number, number, number]
const gen = `g${genChunk(MILKY_WAY, 3, ...idx).key}/0`

describe('resolveSky', () => {
  it('drops stars that no longer exist and says how many', () => {
    const c: Constellation = { id: 'a', name: 'x', hue: 0, stars: [gen, 'h999999999', 'gmw/3/0,0,0/99999'], seq: [0, 1, 2, 0] }
    const { constellations, dropped } = resolveSky([c], emptyCatalog)
    expect(dropped).toBe(2)
    expect(constellations[0].stars).toEqual([gen])
    expect(constellations[0].seq.filter(i => i !== BREAK)).toEqual([0, 0])
  })
  it('leaves real stars alone until the catalogue has loaded', () => {
    const c: Constellation = { id: 'c', name: 'z', hue: 0, stars: ['h32263'], seq: [0] }
    expect(resolveSky([c], null)).toEqual({ constellations: [c], dropped: 0 })
  })
  it('removes constellations left empty', () => {
    const c: Constellation = { id: 'b', name: 'y', hue: 0, stars: ['h999999999'], seq: [0] }
    expect(resolveSky([c], emptyCatalog).constellations).toEqual([])
  })
})
