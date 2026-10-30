import { describe, expect, it } from 'vitest'
import { bodyPositions } from './ephemeris'
import { BODIES, BODY_IDS } from './bodies'
import {
  anglesFor,
  clampOutside,
  dirFor,
  newFlight,
  nearestSurface,
  speedFor,
  stepFree,
  stepOrbit,
  travelDuration,
  travelPath,
  NO_INPUT,
  rayDir,
  basis,
  type FlightInput,
  type Pose,
} from './flight'
import { KM_PER_AU, KM_PER_LY } from './units'
import { dist, len, norm, scale, sub, add, type V3 } from './vec'

const DT = 1 / 60
const pos = bodyPositions(new Date('2026-10-30T12:00Z'))
const bodies = BODY_IDS.map(id => ({ pos: pos[id], radius: BODIES[id].radiusKm }))
const finite = (v: V3) => v.every(Number.isFinite)

function pose(p: V3, look: V3): Pose {
  return { pos: p, ...anglesFor(look) }
}

describe('speed', () => {
  it('scales with the distance to the nearest thing', () => {
    expect(speedFor(1e9) / speedFor(1e3)).toBeCloseTo(1e6)
    expect(speedFor(0)).toBe(0.2)
    expect(Number.isFinite(speedFor(NaN))).toBe(true)
    expect(speedFor(NaN)).toBe(0.2)
  })
  it('measures to surfaces, never below zero', () => {
    const earth = { pos: [0, 0, 0] as V3, radius: 6371 }
    expect(nearestSurface([10_000, 0, 0], [earth], null)).toBeCloseTo(3629)
    expect(nearestSurface([1, 0, 0], [earth], null)).toBe(0)
    expect(nearestSurface([1e6, 0, 0], [earth], [[1e6 + 50, 0, 0]])).toBeCloseTo(50)
  })
})

describe('free flight', () => {
  it('never ends up inside Earth however hard you scroll at it', () => {
    const earth = pos.earth
    const start = add(earth, [6371 * 1.2, 0, 0])
    const cam = pose(start, sub(earth, start))
    const f = newFlight()
    for (let i = 0; i < 300; i++) {
      const input: FlightInput = { ...NO_INPUT, wheel: 5, wheelDir: norm(sub(earth, cam.pos)) }
      stepFree(f, cam, input, nearestSurface(cam.pos, bodies, null), DT, false)
      cam.pos = clampOutside(cam.pos, bodies)
      expect(dist(cam.pos, earth)).toBeGreaterThanOrEqual(6371 * 1.08 - 1e-6)
    }
  })

  it('stays finite a hundred million light-years out', () => {
    const start: V3 = [1e8 * KM_PER_LY, 0, 0]
    const cam = pose(start, [-1, 0, 0])
    const f = newFlight()
    f.vel = [-speedFor(len(start)), 0, 0]
    for (let i = 0; i < 600; i++) {
      stepFree(f, cam, { ...NO_INPUT, thrust: [0, 0, 1] }, nearestSurface(cam.pos, bodies, null), DT, false)
      expect(finite(cam.pos)).toBe(true)
      expect(finite(f.vel)).toBe(true)
      expect(Number.isFinite(cam.yaw) && Number.isFinite(cam.pitch)).toBe(true)
    }
  })

  it('reaches the distance of Neptune within seconds of holding forward', () => {
    const out = norm(pos.earth)
    const cam = pose(add(pos.earth, scale(out, 6371 * 6.5)), out)
    const f = newFlight()
    let t = 0
    while (dist(cam.pos, pos.earth) < 30 * KM_PER_AU && t < 20) {
      stepFree(f, cam, { ...NO_INPUT, thrust: [0, 0, 1] }, nearestSurface(cam.pos, bodies, null), DT, false)
      cam.pos = clampOutside(cam.pos, bodies)
      t += DT
    }
    expect(t).toBeLessThan(8)
  })

  it('glides to a stop after a scroll', () => {
    const cam = pose([1e9, 0, 0], [1, 0, 0])
    const f = newFlight()
    stepFree(f, cam, { ...NO_INPUT, wheel: 1, wheelDir: [1, 0, 0] }, 1e9, DT, false)
    for (let i = 0; i < 400; i++) stepFree(f, cam, NO_INPUT, 1e9, DT, false)
    expect(len(f.vel)).toBeLessThan(speedFor(1e9) * 1e-6)
  })

  it('has no inertia with reduced motion', () => {
    const cam = pose([1e9, 0, 0], [1, 0, 0])
    const f = newFlight()
    stepFree(f, cam, { ...NO_INPUT, wheel: 2, wheelDir: [1, 0, 0], look: [0.1, 0] }, 1e9, DT, true)
    expect(f.vel).toEqual([0, 0, 0])
    expect(f.yawVel).toBe(0)
  })

  it('turns with a drag and keeps turning a little after', () => {
    const cam = pose([0, 0, 0], [1, 0, 0])
    const f = newFlight()
    const y0 = cam.yaw
    stepFree(f, cam, { ...NO_INPUT, look: [0.05, 0] }, 1e9, DT, false)
    const y1 = cam.yaw
    expect(y1).not.toBeCloseTo(y0)
    stepFree(f, cam, NO_INPUT, 1e9, DT, false)
    expect(cam.yaw).not.toBeCloseTo(y1)
  })
})

describe('orbit', () => {
  it('zooms in no closer than just above the surface', () => {
    const target = pos.saturn
    const r = BODIES.saturn.radiusKm
    const cam = pose(add(target, [r * 5, 0, 0]), [-1, 0, 0])
    const f = newFlight()
    f.orbit = { dist: r * 5, ...anglesFor([-1, 0, 0]) }
    for (let i = 0; i < 300; i++) stepOrbit(f, cam, target, r, { ...NO_INPUT, wheel: 5 }, DT, false)
    expect(f.orbit.dist).toBeCloseTo(r * 1.15)
    expect(dist(cam.pos, target)).toBeCloseTo(r * 1.15)
  })
  it('looks at the target', () => {
    const target: V3 = [1e8, 2e8, 3e7]
    const cam = pose([0, 0, 0], [1, 0, 0])
    const f = newFlight()
    f.orbit = { dist: 1e5, yaw: 0.3, pitch: 0.2 }
    stepOrbit(f, cam, target, 1000, NO_INPUT, DT, false)
    const look = dirFor(cam.yaw, cam.pitch)
    const toTarget = norm(sub(target, cam.pos))
    look.forEach((c, i) => expect(c).toBeCloseTo(toTarget[i], 9))
  })
})

describe('travel', () => {
  const from: V3 = [4e13, 0, 0]
  const to: V3 = [0, 0, 0]
  it('starts where you are and ends at the arrival distance', () => {
    expect(travelPath(from, to, 1000, 0)).toEqual(from)
    expect(dist(travelPath(from, to, 1000, 1), to)).toBeCloseTo(1000)
  })
  it('only ever gets closer', () => {
    let prev = Infinity
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const d = dist(travelPath(from, to, 1000, Math.min(t, 1)), to)
      expect(d).toBeLessThanOrEqual(prev)
      prev = d
    }
  })
  it('takes longer for longer trips, within limits', () => {
    expect(travelDuration(1e4, 1e3)).toBeGreaterThanOrEqual(1.2)
    expect(travelDuration(1e20, 1e3)).toBe(4)
    expect(travelDuration(1e12, 1e3)).toBeGreaterThan(travelDuration(1e6, 1e3))
  })
})

describe('rayDir', () => {
  it('points straight ahead at the centre of the screen', () => {
    const r = rayDir(0.4, 0.1, 50, 1.6, 0, 0)
    const f = dirFor(0.4, 0.1)
    r.forEach((c, i) => expect(c).toBeCloseTo(f[i], 12))
  })
  it('points half a field of view up at the top edge', () => {
    const r = rayDir(0.4, 0.1, 50, 1.6, 0, 1)
    const { fwd, up } = basis(0.4, 0.1)
    const angle = Math.atan2(r[0] * up[0] + r[1] * up[1] + r[2] * up[2], r[0] * fwd[0] + r[1] * fwd[1] + r[2] * fwd[2])
    expect((angle * 180) / Math.PI).toBeCloseTo(25, 6)
  })
})

describe('travel with an approach direction', () => {
  it('arrives on the requested side of the target', () => {
    const from: V3 = [1e15, 0, 0]
    const to: V3 = [0, 0, 0]
    const end = travelPath(from, to, 5e14, 1, [0, 0, 1])
    expect(end[0]).toBeCloseTo(0)
    expect(end[2] / 5e14).toBeCloseTo(1)
  })
  it('still starts where you are', () => {
    expect(travelPath([1e15, 0, 0], [0, 0, 0], 5e14, 0, [0, 0, 1])).toEqual([1e15, 0, 0])
  })
})
