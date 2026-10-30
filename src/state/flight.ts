import { BODIES, BODY_IDS, type BodyId } from '../lib/space/bodies'
import {
  anglesFor,
  clampOutside,
  nearestSurface,
  newFlight,
  startTravel,
  stepFree,
  stepOrbit,
  stepTravel,
  type FlightInput,
} from '../lib/space/flight'
import type { StarId } from '../lib/space/starId'
import { KM_PER_PC } from '../lib/space/units'
import { dist, scale, sub, type V3 } from '../lib/space/vec'
import { cam } from './camera'
import { catalogState } from './catalog'
import { positions } from './clock'

export type Target =
  | { kind: 'body'; id: BodyId }
  | { kind: 'star'; id: StarId }
  | { kind: 'point'; pos: V3; arriveKm: number; look?: V3 }

export const flight = newFlight()

/** Input gathered by the event handlers since the last frame. */
export const pending: FlightInput & { keys: Set<string>; any: boolean } = {
  thrust: [0, 0, 0],
  wheel: 0,
  wheelDir: [0, 0, 0],
  look: [0, 0],
  boost: 1,
  keys: new Set(),
  any: false,
}

/** Taps (not drags) on the sky go here; the picking layer sets it. */
export const tapHandler: { current: ((x: number, y: number, touch: boolean) => void) | null } = { current: null }

/** Which body the camera is circling, if any. */
export let orbiting: BodyId | null = null
let travelTarget: { pos: () => V3; arrive: number; body: BodyId | null } | null = null

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Real-star ids resolve through the catalogue; generated ids are added with the generated universe. */
export function starPosKm(id: StarId): V3 | null {
  const c = catalogState().catalog
  if (!c || !id.startsWith('h')) return null
  const i = c.byHyg.get(Number(id.slice(1)))
  if (i === undefined) return null
  return [c.pos[i * 3] * KM_PER_PC, c.pos[i * 3 + 1] * KM_PER_PC, c.pos[i * 3 + 2] * KM_PER_PC]
}

function starArriveKm(id: StarId): number {
  const c = catalogState().catalog
  const i = c?.byHyg.get(Number(id.slice(1)))
  const abs = c && i !== undefined ? c.absMag[i] : 4.83
  const lum = Math.pow(10, -0.4 * (abs - 4.83))
  return 0.02 * KM_PER_PC * Math.max(1, Math.sqrt(lum)) * 0.05
}

export function enterOrbit(id: BodyId) {
  orbiting = id
  const target = positions()[id]
  const a = anglesFor(sub(target, cam.pos))
  flight.orbit = { dist: Math.max(dist(cam.pos, target), BODIES[id].radiusKm * 1.15), ...a }
}

export function exitOrbit() {
  orbiting = null
  flight.orbit = null
}

export function cancelTravel() {
  travelTarget = null
  flight.travel = null
}

/** Glide to something; any input takes over again. Bodies are circled on arrival. */
export function flyTo(t: Target) {
  exitOrbit()
  if (t.kind === 'body') {
    travelTarget = { pos: () => positions()[t.id], arrive: BODIES[t.id].radiusKm * 4, body: t.id }
  } else if (t.kind === 'star') {
    const p = starPosKm(t.id)
    if (!p) return
    travelTarget = { pos: () => p, arrive: starArriveKm(t.id), body: null }
  } else {
    travelTarget = { pos: () => t.pos, arrive: t.arriveKm, body: null }
  }
  const target = travelTarget.pos()
  startTravel(flight, cam, target, travelTarget.arrive)
  if (reducedMotion()) {
    flight.travel!.elapsed = flight.travel!.duration
  }
}

let nearStars: V3[] = []
let frame = 0

/** The 64 nearest catalogue stars, refreshed every 15 frames. */
function nearestStarsKm(): V3[] {
  const c = catalogState().catalog
  if (!c) return []
  if (frame++ % 15 !== 0) return nearStars
  const px = cam.pos[0] / KM_PER_PC
  const py = cam.pos[1] / KM_PER_PC
  const pz = cam.pos[2] / KM_PER_PC
  const best: [number, number][] = []
  let worst = Infinity
  for (let i = 0; i < c.count; i++) {
    const dx = c.pos[i * 3] - px
    const dy = c.pos[i * 3 + 1] - py
    const dz = c.pos[i * 3 + 2] - pz
    const d = dx * dx + dy * dy + dz * dz
    if (best.length < 64 || d < worst) {
      best.push([d, i])
      if (best.length > 64) {
        best.sort((a, b) => a[0] - b[0])
        best.length = 64
      }
      worst = best.length < 64 ? Infinity : Math.max(...best.map(b => b[0]))
    }
  }
  nearStars = best.map(([, i]) => scale([c.pos[i * 3], c.pos[i * 3 + 1], c.pos[i * 3 + 2]], KM_PER_PC))
  return nearStars
}

/** Extra places that count as "near" for flight speed (the generated universe adds its own). */
export const extraNearest: (() => number)[] = []

export function nearestKm(): number {
  const p = positions()
  const bodies = BODY_IDS.map(id => ({ pos: p[id], radius: BODIES[id].radiusKm }))
  let n = nearestSurface(cam.pos, bodies, nearestStarsKm())
  for (const f of extraNearest) n = Math.min(n, f())
  return n
}

function consume(): FlightInput & { any: boolean } {
  const k = pending.keys
  const axis = (pos: string[], neg: string[]) => (pos.some(x => k.has(x)) ? 1 : 0) - (neg.some(x => k.has(x)) ? 1 : 0)
  const thrust: V3 = [axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']), axis(['KeyE'], ['KeyQ']), axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'])]
  const out = {
    thrust,
    wheel: pending.wheel,
    wheelDir: pending.wheelDir,
    look: pending.look,
    boost: k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1,
    any: pending.any || thrust.some(v => v !== 0),
  }
  pending.wheel = 0
  pending.look = [0, 0]
  pending.any = false
  return out
}

/** One frame of camera motion: travel, orbit or free flight, then keep clear of every surface. */
export function stepFlight(dt: number) {
  const input = consume()
  const reduced = reducedMotion()
  if (flight.travel && input.any) cancelTravel()

  if (flight.travel && travelTarget) {
    const done = stepTravel(flight, cam, travelTarget.pos(), dt)
    if (done) {
      const body = travelTarget.body
      travelTarget = null
      if (body) enterOrbit(body)
    }
  } else if (flight.orbit && orbiting) {
    if (input.thrust.some(v => v !== 0)) {
      exitOrbit()
      stepFree(flight, cam, input, nearestKm(), dt, reduced)
    } else {
      stepOrbit(flight, cam, positions()[orbiting], BODIES[orbiting].radiusKm, input, dt, reduced)
    }
  } else {
    stepFree(flight, cam, input, nearestKm(), dt, reduced)
  }

  const p = positions()
  cam.pos = clampOutside(
    cam.pos,
    BODY_IDS.map(id => ({ pos: p[id], radius: BODIES[id].radiusKm })),
  )
}
