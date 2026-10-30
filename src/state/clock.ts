import { bodyPositions } from '../lib/space/ephemeris'
import type { BodyId } from '../lib/space/bodies'
import type { V3 } from '../lib/space/vec'

/** The simulated clock: real time by default, faster or backwards on request. */
export const clock = {
  simMs: Date.now(),
  /** Simulated seconds per real second. */
  rate: 1,
  now: () => new Date(clock.simMs),
}

let cached: { ms: number; pos: Record<BodyId, V3> } | null = null

export function tick(realDtSec: number) {
  clock.simMs += realDtSec * 1000 * clock.rate
}

export function setRate(r: number) {
  clock.rate = r
}

export function resetNow() {
  clock.simMs = Date.now()
  clock.rate = 1
}

/** Every body's heliocentric position for the current simulated time, computed once per frame. */
export function positions(): Record<BodyId, V3> {
  if (!cached || cached.ms !== clock.simMs) cached = { ms: clock.simMs, pos: bodyPositions(clock.now()) }
  return cached.pos
}
