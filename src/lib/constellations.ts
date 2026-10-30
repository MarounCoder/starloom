export interface Star {
  x: number
  y: number
  /** Brightness 0..1. */
  b: number
}

/** A pen-up in a sequence: no line is drawn across it and playback rests. */
export const BREAK = -1

export interface Constellation {
  id: string
  name: string
  hue: number
  stars: Star[]
  /** Order the stars are joined and played in; may revisit stars and contain BREAK. */
  seq: number[]
  /** Set when it was dropped in from a preset. */
  preset?: string
}

export const HUES = ['214,178,110', '154,184,238', '231,167,160', '150,214,190', '200,170,240', '240,214,150']

export const newId = () => Math.random().toString(36).slice(2, 10)

export function addStar(c: Constellation, star: Star): Constellation {
  return { ...c, stars: [...c.stars, star], seq: [...c.seq, c.stars.length] }
}

/** Join an existing star to the end of the sequence; tapping the last star again does nothing. */
export function linkStar(c: Constellation, index: number): Constellation {
  if (index < 0 || index >= c.stars.length || c.seq[c.seq.length - 1] === index) return c
  return { ...c, seq: [...c.seq, index] }
}

/** Remove the last link, and the last star too if nothing else uses it. */
export function undoLast(c: Constellation): Constellation {
  if (!c.seq.length) return c
  const seq = c.seq.slice(0, -1)
  const last = c.seq[c.seq.length - 1]
  const stars = last === c.stars.length - 1 && !seq.includes(last) ? c.stars.slice(0, -1) : c.stars
  return { ...c, seq, stars }
}

/** Pitch is measured from the first star, so a melody sounds the same wherever it is. */
export const anchorY = (c: Constellation) => c.stars[0]?.y ?? 0

/** Consecutive star pairs to draw as lines, skipping breaks. */
export function segments(c: Constellation): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let k = 1; k < c.seq.length; k++) {
    const a = c.seq[k - 1]
    const b = c.seq[k]
    if (a !== BREAK && b !== BREAK && c.stars[a] && c.stars[b]) out.push([a, b, k])
  }
  return out
}

export function bounds(c: Constellation) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of c.stars) {
    x0 = Math.min(x0, s.x)
    y0 = Math.min(y0, s.y)
    x1 = Math.max(x1, s.x)
    y1 = Math.max(y1, s.y)
  }
  return { x0, y0, x1, y1 }
}
