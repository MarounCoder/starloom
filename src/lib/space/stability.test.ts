import { describe, expect, it } from 'vitest'
import { applyTier } from '../tier'
import { MILKY_WAY } from './galaxy'
import { clearChunkCache, genChunk } from './octree'
import { resolveStar } from './starId'
import { KM_PER_PC } from './units'

const s3 = 200 * KM_PER_PC
const disc = MILKY_WAY.center.map(c => Math.round(-c / 2 / s3)) as [number, number, number]

describe('generated star ids do not depend on the device', () => {
  it('resolve to the same star on a phone and a desktop', () => {
    applyTier('high')
    clearChunkCache()
    const ch = genChunk(MILKY_WAY, 3, ...disc)
    const ids = Array.from({ length: ch.count }, (_, i) => `g${ch.key}/${i}`)
    const desktop = ids.map(id => resolveStar(id, null))
    applyTier('low')
    clearChunkCache()
    const phone = ids.map(id => resolveStar(id, null))
    applyTier('high')
    expect(phone).toEqual(desktop)
  })
})

describe('the generator is frozen', () => {
  // Pinned output: if any of these move, every shared link with generated stars breaks.
  it('still makes the same stars', () => {
    clearChunkCache()
    const pin = (k: number, idx: [number, number, number], i: number) => {
      const r = resolveStar(`g${genChunk(MILKY_WAY, k, ...idx).key}/${i}`, null)!
      return [r.posKm.map(v => Math.round(v / 1e9)), Math.round(r.absMag * 1000), Math.round(r.ci * 1000)]
    }
    expect(JSON.stringify([pin(3, disc, 0), pin(3, disc, 5), pin(1, [disc[0] * 4, disc[1] * 4, disc[2] * 4], 2), pin(6, [0, 0, 0], 7)])).toMatchInlineSnapshot(`"[[[-6945944,-110014300,-61297282],296,90],[[-7706495,-108449992,-59952170],-796,-64],[[-7026300,-109367961,-60485686],2152,196],[[-33021860,-217268781,-129547120],-5491,-300]]"`)
  })
})
