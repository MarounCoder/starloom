export interface Candidate {
  id: string
  x: number
  y: number
  /** Bodies 10; stars 10^(−0.4 m), capped at 5. */
  weight: number
}

/** The thing under a tap: among candidates within the radius, the heaviest after a gentle distance falloff. */
export function pickAt(cands: Candidate[], px: number, py: number, radiusPx: number): string | null {
  let best: string | null = null
  let score = 0
  for (const c of cands) {
    const d = Math.hypot(c.x - px, c.y - py)
    if (d > radiusPx) continue
    const s = c.weight / (1 + d / 8)
    if (s > score) {
      score = s
      best = c.id
    }
  }
  return best
}

export const starWeight = (mag: number) => Math.min(5, Math.pow(10, -0.4 * mag))
