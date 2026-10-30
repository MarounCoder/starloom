export const TAP_MAX_MOVE = 6
export const TAP_MAX_MS = 350

/** A press counts as a tap when it barely moved and was short. */
export function isTap(dx: number, dy: number, ms: number): boolean {
  return Math.hypot(dx, dy) <= TAP_MAX_MOVE && ms <= TAP_MAX_MS
}
