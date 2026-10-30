import { describe, expect, it } from 'vitest'
import { apparentMag, bvToRgb, spectralFromBv } from './photometry'

describe('photometry', () => {
  it('turns absolute into apparent magnitude', () => {
    expect(apparentMag(1.42, 2.64)).toBeCloseTo(-1.47, 2)
  })
  it('colours stars by B–V', () => {
    const sun = bvToRgb(0.65)
    expect(sun[0]).toBeGreaterThanOrEqual(sun[1])
    expect(sun[1]).toBeGreaterThanOrEqual(sun[2])
    expect(sun[2]).toBeGreaterThan(0.75)
    const red = bvToRgb(1.85)
    expect(red[0]).toBeGreaterThan(0.95)
    expect(red[2]).toBeLessThan(0.55)
    const blue = bvToRgb(-0.2)
    expect(blue[2]).toBeGreaterThan(blue[0])
  })
  it('guesses a spectral class from colour', () => {
    expect(spectralFromBv(0.0)).toBe('A')
    expect(spectralFromBv(0.65)).toBe('G')
    expect(spectralFromBv(1.6)).toBe('M')
  })
})
