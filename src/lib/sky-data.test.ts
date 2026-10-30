import { describe, expect, it } from 'vitest'
import { addStar, BREAK, linkStar, segments, undoLast, type Constellation } from './constellations'
import { instantiatePreset, PRESETS } from './presets'
import { decodeSky, encodeSky, readHash } from './share'
import { randomName } from './names'

const empty = (): Constellation => ({ id: 'a', name: 'Test', hue: 0, stars: [], seq: [] })

describe('constellations', () => {
  it('adds stars and joins them in order', () => {
    let c = addStar(empty(), { x: 0, y: 0, b: 1 })
    c = addStar(c, { x: 10, y: 0, b: 1 })
    expect(c.seq).toEqual([0, 1])
    expect(segments(c)).toEqual([[0, 1, 1]])
  })
  it('ignores tapping the last star twice', () => {
    const c = addStar(empty(), { x: 0, y: 0, b: 1 })
    expect(linkStar(c, 0)).toBe(c)
  })
  it('undo removes the newest star only when nothing else uses it', () => {
    let c = addStar(addStar(empty(), { x: 0, y: 0, b: 1 }), { x: 5, y: 5, b: 1 })
    c = linkStar(c, 0)
    c = undoLast(c)
    expect(c.stars.length).toBe(2)
    c = undoLast(c)
    expect(c.stars.length).toBe(1)
    expect(undoLast(undoLast(c))).toEqual({ ...c, stars: [], seq: [] })
  })
  it('does not draw across breaks', () => {
    const c: Constellation = { ...empty(), stars: [{ x: 0, y: 0, b: 1 }, { x: 1, y: 1, b: 1 }, { x: 2, y: 2, b: 1 }], seq: [0, 1, BREAK, 2] }
    expect(segments(c)).toEqual([[0, 1, 1]])
  })
})

describe('presets', () => {
  it('every sequence points at real stars', () => {
    for (const p of PRESETS) for (const k of p.seq) expect(k === BREAK || (k >= 0 && k < p.stars.length)).toBe(true)
  })
  it('keeps the shape when scaled', () => {
    const p = PRESETS[0]
    const c = instantiatePreset(p, 100, 100, 400, 0)
    const ratio = (a: number, b: number) => Math.hypot(a, b)
    const src = ratio(p.stars[0][0] - p.stars[1][0], p.stars[0][1] - p.stars[1][1]) / ratio(p.stars[2][0] - p.stars[3][0], p.stars[2][1] - p.stars[3][1])
    const out = ratio(c.stars[0].x - c.stars[1].x, c.stars[0].y - c.stars[1].y) / ratio(c.stars[2].x - c.stars[3].x, c.stars[2].y - c.stars[3].y)
    expect(out).toBeCloseTo(src)
  })
})

describe('share', () => {
  const sky = {
    constellations: [instantiatePreset(PRESETS[1], 50, -20, 300, 2), { ...addStar(empty(), { x: 1.4, y: -2.6, b: 0.5 }), name: "L'Escargot qui Danse" }],
    instrument: 'glass' as const,
    scale: 'hirajoshi' as const,
    camera: { x: 12.3, y: -4, zoom: 1.25 },
  }
  it('round-trips a sky', () => {
    const back = decodeSky(encodeSky(sky))!
    expect(back.instrument).toBe('glass')
    expect(back.scale).toBe('hirajoshi')
    expect(back.camera).toEqual({ x: 12, y: -4, zoom: 1.25 })
    expect(back.constellations.map(c => c.name)).toEqual(['Big Dipper', "L'Escargot qui Danse"])
    expect(back.constellations[0].seq).toEqual(sky.constellations[0].seq)
    expect(back.constellations[1].stars[0]).toEqual({ x: 1, y: -3, b: 0.5 })
  })
  it('rejects garbage and truncated links', () => {
    expect(decodeSky('not-a-sky')).toBeNull()
    expect(decodeSky(encodeSky(sky).slice(0, 20))).toBeNull()
    expect(decodeSky('')).toBeNull()
  })
  it('reads the hash', () => {
    expect(readHash('#sky=abc')).toBe('abc')
    expect(readHash('#other')).toBeNull()
  })
})

describe('names', () => {
  it('uses the right French article', () => {
    for (let i = 0; i < 50; i++) expect(randomName()).toMatch(/^(Le |La |L')\S/)
  })
})
