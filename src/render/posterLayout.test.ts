import { describe, expect, it } from 'vitest'
import { posterLayout, type Rect } from './posterLayout'

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('posterLayout', () => {
  const W = 2400
  const H = 3300
  const l = posterLayout(W, H)
  const rects = [l.view, l.title, l.footer]
  it('keeps every block inside the page with generous margins', () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(120)
      expect(r.y).toBeGreaterThanOrEqual(120)
      expect(r.x + r.w).toBeLessThanOrEqual(W - 120)
      expect(r.y + r.h).toBeLessThanOrEqual(H - 120)
    }
  })
  it('never overlaps blocks', () => {
    expect(overlaps(l.view, l.title)).toBe(false)
    expect(overlaps(l.view, l.footer)).toBe(false)
    expect(overlaps(l.title, l.footer)).toBe(false)
  })
  it('shows the sky at 4:5', () => {
    expect(l.view.w / l.view.h).toBeCloseTo(0.8, 3)
  })
})
