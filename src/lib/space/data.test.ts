import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseCatalog } from './catalog'
import { apparentMag } from './photometry'
import { IAU, iauIndex } from './iau'

const file = (p: string) => readFileSync(fileURLToPath(new URL(`../../../public/data/${p}`, import.meta.url)))
const bin = file('stars.bin')
const cat = parseCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength))
const figures: { abbr: string; lines: [number, number][] }[] = JSON.parse(file('constellations.json').toString())

const dist = (i: number) => Math.hypot(cat.pos[i * 3], cat.pos[i * 3 + 1], cat.pos[i * 3 + 2])
const decDeg = (i: number) => (Math.asin(cat.pos[i * 3 + 2] / dist(i)) * 180) / Math.PI

describe('shipped star data', () => {
  it('holds a naked-eye-plus catalogue', () => {
    expect(cat.count).toBeGreaterThan(25_000)
    expect(cat.count).toBeLessThan(60_000)
  })
  it('starts with Sirius', () => {
    expect(cat.hip[0]).toBe(32349)
    expect(apparentMag(cat.absMag[0], dist(0))).toBeCloseTo(-1.44, 1)
  })
  it('puts Polaris at the pole and Alpha Centauri next door', () => {
    expect(decDeg(cat.byHip.get(11767)!)).toBeCloseTo(89.26, 1)
    expect(dist(cat.byHip.get(71683)!)).toBeCloseTo(1.34, 1)
  })
  it('knows Betelgeuse is in Orion', () => {
    expect(cat.con[cat.byHip.get(27989)!]).toBe(iauIndex.get('Ori'))
  })
  it('has 88 figures whose stars are all in the catalogue', () => {
    expect(figures).toHaveLength(88)
    expect(new Set(IAU.map(c => c.abbr)).size).toBe(88)
    for (const f of figures) {
      expect(iauIndex.has(f.abbr)).toBe(true)
      for (const [a, b] of f.lines) {
        expect(cat.byHip.has(a), `${f.abbr} ${a}`).toBe(true)
        expect(cat.byHip.has(b), `${f.abbr} ${b}`).toBe(true)
      }
    }
  })
})
