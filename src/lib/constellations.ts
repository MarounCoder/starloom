import type { StarId } from './space/starId'
import { walkFigure } from './space/music'

/** A pen-up in a sequence: no line is drawn across it and playback rests. */
export const BREAK = -1

/** A constellation of your own: real or generated stars joined in the order you tapped them. */
export interface Constellation {
  id: string
  name: string
  hue: number
  stars: StarId[]
  /** Order the stars are joined and played in; may revisit stars and contain BREAK. */
  seq: number[]
}

export const HUES = ['214,178,110', '154,184,238', '231,167,160', '150,214,190', '200,170,240', '240,214,150']

export const newId = () => Math.random().toString(36).slice(2, 10)

/** Tap a star: a new one is added and joined; one already in the constellation is joined again. Tapping the last star again does nothing. */
export function tapStar(c: Constellation, id: StarId): Constellation {
  const idx = c.stars.indexOf(id)
  if (idx === -1) return { ...c, stars: [...c.stars, id], seq: [...c.seq, c.stars.length] }
  if (c.seq[c.seq.length - 1] === idx) return c
  return { ...c, seq: [...c.seq, idx] }
}

/** Remove the last link, and the last star too if nothing else uses it. */
export function undoLast(c: Constellation): Constellation {
  if (!c.seq.length) return c
  const seq = c.seq.slice(0, -1)
  const last = c.seq[c.seq.length - 1]
  const stars = last === c.stars.length - 1 && !seq.includes(last) ? c.stars.slice(0, -1) : c.stars
  return { ...c, seq, stars }
}

/** Consecutive star pairs to draw as lines, skipping breaks: [a, b, seqIndex]. */
export function segments(c: Constellation): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let k = 1; k < c.seq.length; k++) {
    const a = c.seq[k - 1]
    const b = c.seq[k]
    if (a !== BREAK && b !== BREAK && c.stars[a] && c.stars[b]) out.push([a, b, k])
  }
  return out
}

/** "Make a copy" of a real figure: its stars, walked from the brightest, as a constellation you can edit. */
export function figureToConstellation(segs: [number, number][], idOf: (i: number) => StarId, magOf: (i: number) => number, name: string, hue: number): Constellation {
  const nodes = [...new Set(segs.flat())]
  const walk = walkFigure(segs, new Map(nodes.map(i => [i, magOf(i)])))
  const stars: StarId[] = []
  const index = new Map<number, number>()
  const seq = walk.map(i => {
    if (i === BREAK) return BREAK
    if (!index.has(i)) {
      index.set(i, stars.length)
      stars.push(idOf(i))
    }
    return index.get(i)!
  })
  return { id: newId(), name, hue, stars, seq }
}

/** Remove some stars: links through them become rests, the rest are re-indexed. */
export function withoutStars(c: Constellation, drop: Set<number>): Constellation {
  if (!drop.size) return c
  const map = new Map<number, number>()
  const stars: StarId[] = []
  c.stars.forEach((s, i) => {
    if (drop.has(i)) return
    map.set(i, stars.length)
    stars.push(s)
  })
  const seq: number[] = []
  for (const i of c.seq) {
    const j = i === BREAK || !map.has(i) ? BREAK : map.get(i)!
    if (j === BREAK && (seq.length === 0 || seq[seq.length - 1] === BREAK)) continue
    seq.push(j)
  }
  while (seq[seq.length - 1] === BREAK) seq.pop()
  return { ...c, stars, seq }
}
