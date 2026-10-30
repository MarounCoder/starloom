import { describe, expect, it } from 'vitest'
import { BREAK } from '../constellations'
import { raDecToVec } from './frames'
import { degreeForLat, melody, noteGap, velocityForMag, walkFigure } from './music'
import { KM_PER_LY, KM_PER_PC } from './units'
import type { V3 } from './vec'

describe('pitch from ecliptic latitude', () => {
  it('anchors the first star on degree 7 and steps every 2°', () => {
    expect(degreeForLat(10, 10)).toBe(7)
    expect(degreeForLat(12, 10)).toBe(8)
    expect(degreeForLat(6, 10)).toBe(5)
    expect(degreeForLat(90, -90)).toBe(21)
    expect(degreeForLat(-90, 90)).toBe(0)
  })
  it('spaces notes by angle and plays bright stars louder', () => {
    expect(noteGap(0)).toBe(190)
    expect(noteGap(100)).toBe(760)
    expect(noteGap(10)).toBe(460)
    expect(velocityForMag(-1.5)).toBe(1)
    expect(velocityForMag(12)).toBe(0.4)
  })
})

describe('walkFigure', () => {
  const mags = (m: Record<number, number>) => new Map(Object.entries(m).map(([k, v]) => [Number(k), v]))
  it('walks a path from its brightest end', () => {
    expect(walkFigure([[1, 2], [2, 3]], mags({ 1: 0, 2: 3, 3: 4 }))).toEqual([1, 2, 3])
  })
  it('returns to a branch star after a break', () => {
    expect(walkFigure([[9, 4], [9, 5]], mags({ 9: 0, 4: 2, 5: 3 }))).toEqual([9, 4, BREAK, 9, 5])
  })
  it('separates disconnected parts with one break', () => {
    const w = walkFigure([[1, 2], [7, 8]], mags({ 1: 1, 2: 2, 7: 0, 8: 3 }))
    expect(w.filter(x => x === BREAK)).toHaveLength(1)
    expect(w[0]).toBe(7)
  })
  it('uses every segment exactly once', () => {
    const segs: [number, number][] = [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [2, 6]]
    const w = walkFigure(segs, mags({ 1: 2, 2: 0, 3: 1, 4: 3, 5: 4, 6: 5 }))
    const used = new Set<string>()
    for (let i = 1; i < w.length; i++) {
      if (w[i] === BREAK || w[i - 1] === BREAK) continue
      const k = [w[i - 1], w[i]].sort().join('-')
      expect(used.has(k)).toBe(false)
      used.add(k)
    }
    expect(used.size).toBe(segs.length)
  })
})

describe('melody', () => {
  const star = (ra: number, dec: number, pc: number) => raDecToVec(ra, dec, pc * KM_PER_PC)
  const stars: V3[] = [star(219.9, -60.83, 1.34), star(101.29, -16.72, 2.64), star(114.83, 5.22, 3.51)]
  const seq = [0, 1, 2]
  const mags = [0, -1.4, 0.4]
  it('changes when you move, not when you turn', () => {
    const home = melody(stars, seq, [0, 0, 0], mags)
    const away = melody(stars, seq, [5 * KM_PER_LY, 0, 0], mags)
    expect(home.map(n => n.degree)).not.toEqual(away.map(n => n.degree))
    expect(melody(stars, seq, [0, 0, 0], mags)).toEqual(home)
  })
  it('turns breaks into rests', () => {
    const m = melody(stars, [0, BREAK, 1], [0, 0, 0], mags)
    expect(m[1].rest).toBe(true)
    expect(m[0].degree).toBe(7)
  })
})
