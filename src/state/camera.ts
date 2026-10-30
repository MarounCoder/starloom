import { useSyncExternalStore } from 'react'
import { ECL_NORTH, raDecToVec } from '../lib/space/frames'
import { anglesFor, dirFor } from '../lib/space/flight'
import { BODIES } from '../lib/space/bodies'
import { bodyPositions } from '../lib/space/ephemeris'
import { add, cross, norm, scale, type V3 } from '../lib/space/vec'

export interface Cam {
  /** World position, km (float64, equatorial J2000). */
  pos: V3
  /** Heading around ecliptic north, radians. */
  yaw: number
  /** Elevation above the ecliptic plane, radians, within ±89°. */
  pitch: number
  fovDeg: number
}

export const cam: Cam = { pos: [0, 0, 0], yaw: 0, pitch: 0, fovDeg: 50 }

export { anglesFor, dirFor }

export const camForward = (): V3 => dirFor(cam.yaw, cam.pitch)

export function camBasis(): { fwd: V3; right: V3; up: V3 } {
  const fwd = camForward()
  const right = norm(cross(fwd, ECL_NORTH))
  const up = cross(right, fwd)
  return { fwd, right, up }
}

/**
 * The opening view: Earth hanging in the lower left, looking out toward Orion.
 */
export function homePose(date: Date, aspect = 1.6): Pick<Cam, 'pos' | 'yaw' | 'pitch'> {
  const earth = bodyPositions(date).earth
  const fwd = raDecToVec(84, -1.2)
  const { yaw, pitch } = anglesFor(fwd)
  const right = norm(cross(fwd, ECL_NORTH))
  const up = cross(right, fwd)
  const d = BODIES.earth.radiusKm * 6.5
  // Earth sits left of and below the centre of the view; less to the side on a narrow screen.
  const side = 0.23 * Math.min(1, aspect / 1.6)
  const rel = add(add(scale(fwd, d), scale(right, -d * Math.tan(side))), scale(up, -d * Math.tan(0.16)))
  return { pos: add(earth, scale(rel, -1)), yaw, pitch }
}

const listeners = new Set<() => void>()
let snapshot = { ...cam, pos: [...cam.pos] as V3 }
let lastNotify = 0

/** Called by the frame loop after the camera moves; React hears about it at most 10 times a second. */
export function notifyCam(now = performance.now()) {
  if (now - lastNotify < 100) return
  lastNotify = now
  snapshot = { ...cam, pos: [...cam.pos] as V3 }
  listeners.forEach(l => l())
}

export function subscribeCam(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const useCamSnapshot = () => useSyncExternalStore(subscribeCam, () => snapshot)

/** The canvas size in CSS pixels, kept current by the frame loop. */
export const screen = { w: 1, h: 1 }

/** Where a world point lands on screen (CSS px), its depth along the view, and how many px one km spans there. */
export function project(pos: V3): { x: number; y: number; z: number; behind: boolean; pxPerKm: number } {
  const { fwd, right, up } = camBasis()
  const rel: V3 = [pos[0] - cam.pos[0], pos[1] - cam.pos[1], pos[2] - cam.pos[2]]
  const z = rel[0] * fwd[0] + rel[1] * fwd[1] + rel[2] * fwd[2]
  const t = Math.tan((cam.fovDeg * Math.PI) / 360)
  const aspect = screen.w / screen.h
  const behind = z <= 0
  const zz = behind ? 1e-9 : z
  const nx = (rel[0] * right[0] + rel[1] * right[1] + rel[2] * right[2]) / (zz * t * aspect)
  const ny = (rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2]) / (zz * t)
  return { x: ((nx + 1) / 2) * screen.w, y: ((1 - ny) / 2) * screen.h, z, behind, pxPerKm: screen.h / 2 / (zz * t) }
}
