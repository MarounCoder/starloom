export interface LabelReq {
  id: string
  text: string
  /** Anchor in screen pixels; the label is drawn to the right of it. */
  x: number
  y: number
  priority: number
  w: number
  h: number
}

const PAD = 4

/** Greedy placement: most important first, skipping any label that would overlap one already placed. */
export function placeLabels(reqs: LabelReq[], maxCount = 40): Set<string> {
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = []
  const out = new Set<string>()
  for (const r of [...reqs].sort((a, b) => b.priority - a.priority)) {
    if (out.size >= maxCount) break
    const box = { x0: r.x - PAD, y0: r.y - r.h / 2 - PAD, x1: r.x + r.w + PAD, y1: r.y + r.h / 2 + PAD }
    if (placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue
    placed.push(box)
    out.add(r.id)
  }
  return out
}
