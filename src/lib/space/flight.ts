import { ECL_NORTH, eclToEq, eqToEcl } from './frames'
import { add, cross, dist, len, norm, scale, sub, type V3 } from './vec'

/** Where the camera is and which way it looks: yaw around ecliptic north, pitch above the ecliptic. */
export interface Pose {
  pos: V3
  yaw: number
  pitch: number
}

export interface Orbit {
  dist: number
  yaw: number
  pitch: number
}

export interface Travel {
  from: V3
  approach?: V3
  arrive: number
  elapsed: number
  duration: number
  startYaw: number
  startPitch: number
}

export interface Flight {
  /** km/s, world frame. */
  vel: V3
  yawVel: number
  pitchVel: number
  orbit: Orbit | null
  travel: Travel | null
}

export interface FlightInput {
  /** Camera-space thrust, each axis −1..1: x right, y up, z forward. */
  thrust: V3
  /** Scroll, in notches (positive = forward / closer). */
  wheel: number
  /** World direction the scroll flies along (the ray under the pointer). */
  wheelDir: V3
  /** Yaw and pitch change from a drag this frame, radians. */
  look: [number, number]
  /** Speed multiplier (Shift). */
  boost: number
}

export const NO_INPUT: FlightInput = { thrust: [0, 0, 0], wheel: 0, wheelDir: [0, 0, 0], look: [0, 0], boost: 1 }

export const PITCH_LIMIT = (89 * Math.PI) / 180
/** You cover about three times the distance to the nearest thing every second. */
const SPEED_PER_KM = 3
const MIN_SPEED = 0.2
const GLIDE_S = 0.35
const LOOK_GLIDE_S = 0.25
const WHEEL_K = 0.2
const MAX_SPEED_FACTOR = 2.5
const ORBIT_ZOOM_PER_NOTCH = 0.15
const ORBIT_MIN = 1.15

export const newFlight = (): Flight => ({ vel: [0, 0, 0], yawVel: 0, pitchVel: 0, orbit: null, travel: null })

export function dirFor(yaw: number, pitch: number): V3 {
  return eclToEq([Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)])
}

export function anglesFor(dir: V3): { yaw: number; pitch: number } {
  const e = eqToEcl(norm(dir))
  const pitch = Math.asin(Math.max(-1, Math.min(1, e[2])))
  return { yaw: Math.atan2(e[1], e[0]), pitch: clampPitch(pitch) }
}

export function basis(yaw: number, pitch: number): { fwd: V3; right: V3; up: V3 } {
  const fwd = dirFor(yaw, pitch)
  const right = norm(cross(fwd, ECL_NORTH))
  return { fwd, right, up: cross(right, fwd) }
}

const clampPitch = (p: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p))
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function speedFor(nearestKm: number): number {
  return Number.isFinite(nearestKm) ? Math.max(MIN_SPEED, nearestKm * SPEED_PER_KM) : MIN_SPEED
}

/** Distance to the nearest surface (bodies) or star (radius 0); never negative. */
export function nearestSurface(pos: V3, bodies: { pos: V3; radius: number }[], starsKm: V3[] | null): number {
  let best = Infinity
  for (const b of bodies) best = Math.min(best, dist(pos, b.pos) - b.radius)
  if (starsKm) for (const s of starsKm) best = Math.min(best, dist(pos, s))
  return Math.max(0, best)
}

/** Keep the camera outside every body, on a shell just above its surface. */
export function clampOutside(pos: V3, bodies: { pos: V3; radius: number }[], margin = 1.08): V3 {
  let p = pos
  for (const b of bodies) {
    const d = dist(p, b.pos)
    const min = b.radius * margin
    if (d < min) {
      const dir = d > 0 ? norm(sub(p, b.pos)) : ([1, 0, 0] as V3)
      p = add(b.pos, scale(dir, min))
    }
  }
  return p
}

function stepLook(f: Flight, look: [number, number], frameDt: number, reduced: boolean): [number, number] {
  // Coarse timers can report a frame of zero length; never divide by it.
  const dt = Math.max(frameDt, 1e-3)
  if (look[0] || look[1]) {
    if (reduced) {
      f.yawVel = f.pitchVel = 0
    } else {
      f.yawVel = 0.5 * f.yawVel + 0.5 * (look[0] / dt)
      f.pitchVel = 0.5 * f.pitchVel + 0.5 * (look[1] / dt)
    }
    return look
  }
  if (reduced) return [0, 0]
  const d: [number, number] = [f.yawVel * dt, f.pitchVel * dt]
  const k = Math.exp(-dt / LOOK_GLIDE_S)
  f.yawVel *= k
  f.pitchVel *= k
  return d
}

/** One frame of free flight: thrust and scroll push, everything glides to a stop. */
export function stepFree(f: Flight, cam: Pose, input: FlightInput, nearestKm: number, dt: number, reduced: boolean) {
  const [dy, dp] = stepLook(f, input.look, dt, reduced)
  cam.yaw = wrap(cam.yaw + dy)
  cam.pitch = clampPitch(cam.pitch + dp)

  const speed = speedFor(nearestKm) * input.boost
  const { fwd, right, up } = basis(cam.yaw, cam.pitch)
  const t = input.thrust
  const thrust = add(add(scale(right, t[0]), scale(up, t[1])), scale(fwd, t[2]))

  if (reduced) {
    const step = add(scale(thrust, speed * dt), scale(input.wheelDir, speed * input.wheel * WHEEL_K * GLIDE_S))
    cam.pos = add(cam.pos, step)
    f.vel = [0, 0, 0]
    return
  }

  let v = add(f.vel, scale(thrust, (speed / GLIDE_S) * dt))
  if (input.wheel) v = add(v, scale(input.wheelDir, speed * input.wheel * WHEEL_K))
  const max = speed * MAX_SPEED_FACTOR
  const l = len(v)
  if (l > max) v = scale(v, max / l)
  cam.pos = add(cam.pos, scale(v, dt))
  f.vel = scale(v, Math.exp(-dt / GLIDE_S))
}

/** One frame circling a target: drag turns around it, scroll moves in and out. */
export function stepOrbit(f: Flight, cam: Pose, target: V3, radius: number, input: FlightInput, dt: number, reduced: boolean) {
  const o = f.orbit
  if (!o) return
  const [dy, dp] = stepLook(f, input.look, dt, reduced)
  o.yaw = wrap(o.yaw + dy)
  o.pitch = clampPitch(o.pitch + dp)
  if (input.wheel) o.dist *= Math.exp(-input.wheel * ORBIT_ZOOM_PER_NOTCH)
  o.dist = Math.max(o.dist, radius * ORBIT_MIN)
  cam.yaw = o.yaw
  cam.pitch = o.pitch
  cam.pos = sub(target, scale(dirFor(o.yaw, o.pitch), o.dist))
  f.vel = [0, 0, 0]
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** A point on a fly-to: the distance to the destination shrinks geometrically, so huge trips feel smooth. */
export function travelPath(from: V3, to: V3, arriveDist: number, t: number, approach?: V3): V3 {
  const d0 = dist(from, to)
  if (d0 === 0) return from
  if (t <= 0) return from
  const e = easeInOutCubic(Math.min(1, t))
  const d = Math.exp((1 - e) * Math.log(d0) + e * Math.log(Math.max(arriveDist, 1e-9)))
  const start = scale(sub(from, to), 1 / d0)
  // With an approach direction, the side we come from swings round to it as we close in.
  const dir = approach ? norm(add(scale(start, 1 - e), scale(norm(approach), e))) : start
  return add(to, scale(dir, d))
}

export function travelDuration(d0: number, arriveDist: number): number {
  return Math.max(1.2, Math.min(4, 1.2 + 0.25 * Math.log10(Math.max(1, d0 / arriveDist))))
}

export function startTravel(f: Flight, cam: Pose, target: V3, arrive: number, approach?: V3): void {
  f.vel = [0, 0, 0]
  f.yawVel = f.pitchVel = 0
  f.orbit = null
  f.travel = { from: cam.pos, approach, arrive, elapsed: 0, duration: travelDuration(dist(cam.pos, target), arrive), startYaw: cam.yaw, startPitch: cam.pitch }
}

/** Advance a fly-to; the view turns toward the target during the first third. Returns true on arrival. */
export function stepTravel(f: Flight, cam: Pose, target: V3, dt: number): boolean {
  const tr = f.travel
  if (!tr) return true
  tr.elapsed += dt
  const t = Math.min(1, tr.elapsed / tr.duration)
  cam.pos = travelPath(tr.from, target, tr.arrive, t, tr.approach)
  const want = anglesFor(sub(target, cam.pos))
  const k = Math.min(1, t / 0.35)
  const s = k * k * (3 - 2 * k)
  cam.yaw = wrap(tr.startYaw + wrap(want.yaw - tr.startYaw) * s)
  cam.pitch = clampPitch(tr.startPitch + (want.pitch - tr.startPitch) * s)
  if (t >= 1) f.travel = null
  return t >= 1
}

/** World direction through a screen point given in normalised device coordinates (−1..1, y up). */
export function rayDir(yaw: number, pitch: number, fovDeg: number, aspect: number, ndcX: number, ndcY: number): V3 {
  const { fwd, right, up } = basis(yaw, pitch)
  const t = Math.tan((fovDeg * Math.PI) / 360)
  return norm(add(fwd, add(scale(right, ndcX * t * aspect), scale(up, ndcY * t))))
}
