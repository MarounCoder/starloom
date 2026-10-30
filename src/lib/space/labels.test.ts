import { describe, expect, it } from 'vitest'
import { placeLabels, type LabelReq } from './labels'

const req = (id: string, x: number, y: number, priority: number): LabelReq => ({ id, text: id, x, y, priority, w: 60, h: 14 })

describe('placeLabels', () => {
  it('keeps only the more important of two overlapping labels', () => {
    expect([...placeLabels([req('low', 100, 100, 1), req('high', 110, 104, 5)])]).toEqual(['high'])
  })
  it('keeps labels that do not overlap', () => {
    expect(placeLabels([req('a', 100, 100, 1), req('b', 400, 300, 1)]).size).toBe(2)
  })
  it('respects the cap', () => {
    const many = Array.from({ length: 50 }, (_, i) => req(`l${i}`, i * 100, (i % 7) * 40, i))
    const placed = placeLabels(many, 10)
    expect(placed.size).toBe(10)
    expect(placed.has('l49')).toBe(true)
  })
})
