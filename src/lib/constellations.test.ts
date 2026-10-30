import { describe, expect, it } from 'vitest'
import { BREAK, figureToConstellation, segments, tapStar, undoLast, type Constellation } from './constellations'

const empty = (): Constellation => ({ id: 'c', name: 'Test', hue: 0, stars: [], seq: [] })

describe('constellations of real stars', () => {
  it('adds a star once, then links it again later', () => {
    let c = tapStar(empty(), 'h1')
    c = tapStar(c, 'h1')
    expect(c.stars).toEqual(['h1'])
    expect(c.seq).toEqual([0])
    c = tapStar(tapStar(c, 'h2'), 'h1')
    expect(c.stars).toEqual(['h1', 'h2'])
    expect(c.seq).toEqual([0, 1, 0])
  })
  it('undo removes the last link and an orphaned star', () => {
    const c = tapStar(tapStar(empty(), 'h1'), 'gmw/0/1,2,3/4')
    const u = undoLast(c)
    expect(u.stars).toEqual(['h1'])
    expect(u.seq).toEqual([0])
  })
  it('draws lines between consecutive stars, skipping breaks', () => {
    const c: Constellation = { ...empty(), stars: ['a', 'b', 'c'], seq: [0, 1, BREAK, 1, 2] }
    expect(segments(c).map(([a, b]) => [a, b])).toEqual([[0, 1], [1, 2]])
  })
  it('copies a real figure with every one of its lines', () => {
    const segs: [number, number][] = [[10, 11], [11, 12], [11, 13]]
    const c = figureToConstellation(segs, i => `h${i}`, i => ({ 10: 1, 11: 0, 12: 2, 13: 3 })[i]!, 'Orion', 2)
    const got = new Set(segments(c).map(([a, b]) => [c.stars[a], c.stars[b]].sort().join('-')))
    for (const [a, b] of segs) expect(got.has([`h${a}`, `h${b}`].sort().join('-'))).toBe(true)
    expect(c.name).toBe('Orion')
    expect(c.hue).toBe(2)
  })
})
