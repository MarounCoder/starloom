import { describe, expect, it } from 'vitest'
import { hash2, mulberry32, noise2 } from './rng'
import { MAX_ZOOM, MIN_ZOOM, screenToWorld, worldToScreen, zoomAt, type Camera } from './camera'
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

describe('camera', () => {
  const cam: Camera = { x: 120, y: -40, zoom: 1.7 }
  it('screenToWorld inverts worldToScreen', () => {
    const [sx, sy] = worldToScreen(cam, 800, 600, 300, 77)
    const [wx, wy] = screenToWorld(cam, 800, 600, sx, sy)
    expect(wx).toBeCloseTo(300)
    expect(wy).toBeCloseTo(77)
  })
  it('zoomAt keeps the point under the cursor fixed', () => {
    const before = screenToWorld(cam, 800, 600, 610, 90)
    const next = zoomAt(cam, 800, 600, 610, 90, 2.3)
    const after = screenToWorld(next, 800, 600, 610, 90)
    expect(after[0]).toBeCloseTo(before[0])
    expect(after[1]).toBeCloseTo(before[1])
  })
  it('zoomAt clamps at both ends and still keeps the point fixed', () => {
    const big = zoomAt(cam, 800, 600, 10, 10, 1e6)
    expect(big.zoom).toBe(MAX_ZOOM)
    const small = zoomAt(cam, 800, 600, 10, 10, 1e-6)
    expect(small.zoom).toBe(MIN_ZOOM)
    const p = screenToWorld(cam, 800, 600, 10, 10)
    const q = screenToWorld(small, 800, 600, 10, 10)
    expect(q[0]).toBeCloseTo(p[0])
  })
})

describe('gesture', () => {
  it('classifies taps and drags', () => {
    expect(isTap(3, 2, 120)).toBe(true)
    expect(isTap(9, 0, 100)).toBe(false)
    expect(isTap(1, 1, 600)).toBe(false)
  })
})
