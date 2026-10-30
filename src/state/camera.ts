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
