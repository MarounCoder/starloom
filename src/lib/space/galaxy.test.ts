import { describe, expect, it } from 'vitest'
import { MILKY_WAY, densityAt } from './galaxy'
import { CELL_PC, galaxiesInCell, galaxiesNear } from './cosmos'
import { KM_PER_PC } from './units'
import { dist, scale, type V3 } from './vec'

const SUN: V3 = [0, 0, 0]

describe('the Milky Way', () => {
  it('has density 1 at the Sun', () => {
    expect(densityAt(MILKY_WAY, SUN)).toBeCloseTo(1, 1)
  })
  it('is dense at the centre and thin above the plane', () => {
    expect(densityAt(MILKY_WAY, MILKY_WAY.center)).toBeGreaterThan(20)
    expect(densityAt(MILKY_WAY, scale(MILKY_WAY.normal, 2000 * KM_PER_PC))).toBeLessThan(0.01)
  })
  it('sits about 8.2 kpc away toward Sagittarius', () => {
    expect(dist(SUN, MILKY_WAY.center) / KM_PER_PC).toBeCloseTo(8200, -1)
  })
})

describe('the cosmos', () => {
  it('puts the Milky Way in the home cell, alone within 150 kpc', () => {
    const home = galaxiesInCell(0, 0, 0)
    expect(home.some(g => g.key === 'mw')).toBe(true)
    for (const g of home) if (g.key !== 'mw') expect(dist(g.center, MILKY_WAY.center) / KM_PER_PC).toBeGreaterThan(150_000)
  })
  it('is the same every time', () => {
    expect(galaxiesInCell(3, -2, 7)).toEqual(galaxiesInCell(3, -2, 7))
  })
  it('has galaxies everywhere you go, named as generated', () => {
    const far: V3 = [1e3 * CELL_PC * KM_PER_PC, -7e2 * CELL_PC * KM_PER_PC, 0]
    const near = galaxiesNear(far)
    expect(near.length).toBeGreaterThan(5)
    for (const g of near) expect(g.name).toMatch(/\(generated\)$/)
  })
  it('gives each galaxy a sensible size and an orientation', () => {
    for (const g of galaxiesNear([0, 0, 0])) {
      expect(g.radiusPc).toBeGreaterThanOrEqual(3000)
      expect(g.radiusPc).toBeLessThanOrEqual(40000)
      expect(Math.hypot(...g.normal)).toBeCloseTo(1)
    }
  })
})
