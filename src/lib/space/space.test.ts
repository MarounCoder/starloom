import { describe, expect, it } from 'vitest'
import { ECL_NORTH, eclToEq, eclipticLatDeg, eqToEcl, raDecToVec } from './frames'
import { add, cross, dist, dot, len, norm, sub } from './vec'

describe('vec', () => {
  it('does the basics in float64', () => {
    expect(add([1, 2, 3], [1, 1, 1])).toEqual([2, 3, 4])
    expect(sub([1, 2, 3], [1, 1, 1])).toEqual([0, 1, 2])
    expect(len([3, 4, 0])).toBe(5)
    expect(dist([1e15, 0, 0], [1e15 + 1e5, 0, 0])).toBe(1e5)
    expect(dot(norm([0, 0, 9]), [0, 0, 1])).toBe(1)
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
  })
})

describe('frames', () => {
  it('puts the celestial pole 66.56° above the ecliptic', () => {
    const v = eqToEcl([0, 0, 1])
    expect((Math.asin(v[2]) * 180) / Math.PI).toBeCloseTo(66.56, 2)
  })
  it('leaves the vernal equinox where it is', () => {
    const v = eqToEcl([1, 0, 0])
    expect(v[0]).toBeCloseTo(1)
    expect(v[1]).toBeCloseTo(0)
    expect(v[2]).toBeCloseTo(0)
  })
  it('round-trips between frames', () => {
    const v: [number, number, number] = [0.3, -0.5, 0.8]
    const back = eclToEq(eqToEcl(v))
    v.forEach((c, i) => expect(back[i]).toBeCloseTo(c, 12))
  })
  it('turns RA/Dec into unit vectors', () => {
    const p = raDecToVec(0, 90)
    expect(p[0]).toBeCloseTo(0)
    expect(p[2]).toBeCloseTo(1)
    const q = raDecToVec(90, 0, 2)
    expect(q[1]).toBeCloseTo(2)
  })
  it('measures ecliptic latitude', () => {
    expect(eclipticLatDeg(ECL_NORTH)).toBeCloseTo(90)
    expect(eclipticLatDeg([1, 0, 0])).toBeCloseTo(0)
  })
})
