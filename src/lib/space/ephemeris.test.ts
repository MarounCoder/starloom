import { describe, expect, it } from 'vitest'
import { bodyPositions, moonPhase } from './ephemeris'
import { KM_PER_AU } from './units'
import { dist, len } from './vec'

describe('ephemeris', () => {
  it('has Earth at perihelion in early January 2026', () => {
    const p = bodyPositions(new Date('2026-01-03T12:00Z'))
    expect(len(p.earth) / KM_PER_AU).toBeCloseTo(0.9833, 2)
    expect(Math.abs(len(p.earth) / KM_PER_AU - 0.9833)).toBeLessThan(0.001)
  })
  it('keeps Jupiter, the Moon and Io at real distances', () => {
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.UTC(2026, 0, 1) + i * 37.3 * 86_400_000)
      const p = bodyPositions(date)
      const j = len(p.jupiter) / KM_PER_AU
      expect(j).toBeGreaterThan(4.95)
      expect(j).toBeLessThan(5.46)
      const m = dist(p.moon, p.earth)
      expect(m).toBeGreaterThan(356_000)
      expect(m).toBeLessThan(407_000)
      expect(Math.abs(dist(p.io, p.jupiter) - 421_700)).toBeLessThan(5_000)
      expect(Math.abs(dist(p.titan, p.saturn) - 1_221_870)).toBeLessThan(1)
    }
  })
  it('knows the phase of the Moon', () => {
    const p = moonPhase(new Date('2024-04-08T18:21Z'))
    expect(Math.min(p, 1 - p)).toBeLessThan(0.01)
    expect(Math.abs(moonPhase(new Date('2024-04-23T23:49Z')) - 0.5)).toBeLessThan(0.01)
  })
})
