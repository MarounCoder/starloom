import { describe, expect, it } from 'vitest'
import { hash2, mulberry32, noise2 } from './rng'
import { isTap } from './gesture'

describe('rng', () => {
  it('hash2 is deterministic and spreads neighbours', () => {
    expect(hash2(3, -7, 1)).toBe(hash2(3, -7, 1))
    expect(hash2(3, -7, 1)).not.toBe(hash2(4, -7, 1))
    expect(hash2(3, -7, 1)).not.toBe(hash2(3, -7, 2))
  })
  it('mulberry32 repeats for the same seed and stays in [0,1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('noise2 is continuous across cell borders', () => {
    expect(Math.abs(noise2(0.9999, 0.5) - noise2(1.0001, 0.5))).toBeLessThan(0.01)
  })
})

describe('gesture', () => {
  it('classifies taps and drags', () => {
    expect(isTap(3, 2, 120)).toBe(true)
    expect(isTap(9, 0, 100)).toBe(false)
    expect(isTap(1, 1, 600)).toBe(false)
  })
})
