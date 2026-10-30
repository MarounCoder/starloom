import { describe, expect, it } from 'vitest'
import { generateChunk, LAYERS } from './starfield'
import { bandCentreY, bandDensity } from './milkyway'
import { getRegionObject } from './deepsky'
import { bodyPositions, daysSinceJ2000, J2000, longitudeDeg, PLANETS, SOLAR_ORIGIN } from './solarSystem'
import { moonPhase } from './moon'
import { skyAt } from './daycycle'

describe('starfield', () => {
  it('generates the same chunk every time, brightest first', () => {
    const a = generateChunk(LAYERS[1], 4, -2)
    const b = generateChunk(LAYERS[1], 4, -2)
    expect(a).toEqual(b)
    for (let i = 1; i < a.stars.length; i++) expect(a.stars[i - 1].b).toBeGreaterThanOrEqual(a.stars[i].b)
  })
  it('puts more stars in the Milky Way on the far layer', () => {
    // Find a chunk on the band centre and one far from it.
    const s = LAYERS[0].chunk
    const onBand = generateChunk(LAYERS[0], 3, Math.floor(bandCentreY(3.5 * s) / s))
    const offBand = generateChunk(LAYERS[0], 3, 40)
    expect(onBand.stars.length).toBeGreaterThan(offBand.stars.length)
    expect(onBand.glow.length).toBeGreaterThan(0)
    expect(offBand.glow.length).toBe(0)
  })
})

describe('milky way', () => {
  it('peaks on the centre line and fades away from it', () => {
    const x = 1234
    const c = bandCentreY(x)
    expect(bandDensity(x, c)).toBeGreaterThan(bandDensity(x, c + 900))
    expect(bandDensity(x, c + 5000)).toBeLessThan(0.001)
  })
})

describe('deep sky', () => {
  it('is deterministic and keeps the home landmarks', () => {
    expect(getRegionObject('nebula', 5, 7)).toEqual(getRegionObject('nebula', 5, 7))
    expect(getRegionObject('nebula', 0, 0)?.name).toBe('The Loom Nebula')
  })
})

describe('solar system', () => {
  it('places Earth at its J2000 mean longitude', () => {
    const earth = PLANETS.find(p => p.id === 'earth')!
    expect(longitudeDeg(earth, daysSinceJ2000(J2000))).toBeCloseTo(100.46)
  })
  it('keeps every planet on its orbit', () => {
    const pos = bodyPositions(9000)
    for (const p of PLANETS) {
      const q = pos.find(b => b.id === p.id)!
      expect(Math.hypot(q.x - SOLAR_ORIGIN.x, q.y - SOLAR_ORIGIN.y)).toBeCloseTo(p.orbit)
    }
  })
})

describe('moon', () => {
  it('knows the new moon of 8 April 2024', () => {
    const p = moonPhase(new Date(Date.UTC(2024, 3, 8, 18, 21))).phase
    expect(Math.min(p, 1 - p)).toBeLessThan(0.03)
  })
  it('knows the full moon of 23 April 2024', () => {
    const m = moonPhase(new Date(Date.UTC(2024, 3, 23, 23, 49)))
    expect(m.phase).toBeGreaterThan(0.47)
    expect(m.phase).toBeLessThan(0.53)
    expect(m.name).toBe('Full moon')
  })
})

describe('day cycle', () => {
  it('is continuous across the loop boundary', () => {
    const a = skyAt(0)
    const b = skyAt(0.99999)
    for (let i = 0; i < 3; i++) expect(Math.abs(a.top[i] - b.top[i])).toBeLessThan(0.5)
    expect(Math.abs(a.stars - b.stars)).toBeLessThan(0.01)
  })
  it('is fully starry in the middle of the night', () => {
    expect(skyAt(0.45).stars).toBe(1)
  })
})
