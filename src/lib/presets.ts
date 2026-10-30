import { clamp } from './rng'
import { BREAK, newId, type Constellation } from './constellations'

export interface Preset {
  id: string
  name: string
  blurb: string
  /** [x, y, magnitude], projected from right ascension / declination in degrees, east to the left. */
  stars: [number, number, number][]
  seq: number[]
}

const _ = BREAK

export const PRESETS: Preset[] = [
  {
    id: 'orion',
    name: 'Orion',
    blurb: 'The Hunter. His belt is three stars in an almost perfect line.',
    stars: [[-4.8, -7.41, 0.5], [5.4, 8.2, 0.13], [2.7, -6.35, 1.64], [1.05, 0.3, 2.2], [0, 1.2, 1.69], [-1.2, 1.94, 1.77], [-3, 9.67, 2.06], [0.15, -9.93, 3.4]],
    seq: [7, 0, 5, 6, 1, 3, 2, 7, _, 3, 4, 5],
  },
  {
    id: 'big-dipper',
    name: 'Big Dipper',
    blurb: 'Follow the two stars at the end of the bowl to find the North Star.',
    stars: [[11.4, -6.25, 1.8], [11.65, -0.88, 2.4], [4.25, 1.81, 2.4], [1.19, -1.53, 3.3], [-4.25, -0.46, 1.8], [-8.5, 0.57, 2.2], [-11.8, 6.19, 1.9]],
    seq: [6, 5, 4, 3, 0, 1, 2, 3],
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    blurb: 'The vain queen, a bright W that circles the pole all night.',
    stars: [[6.4, 0.85, 2.3], [2.44, 3.46, 2.2], [0.41, -0.72, 2.4], [-3.2, -0.24, 2.7], [-6.8, -3.67, 3.4]],
    seq: [0, 1, 2, 3, 4],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    blurb: 'The Swan, also called the Northern Cross, flying down the Milky Way.',
    stars: [[-5.8, -7.28, 1.25], [-2, -2.26, 2.2], [8.1, 10.04, 3.1], [-6.7, 4.03, 2.5], [5.3, -7.13, 2.9]],
    seq: [0, 1, 2, _, 4, 1, 3],
  },
  {
    id: 'lyra',
    name: 'Lyra',
    blurb: 'The Lyre of Orpheus. Vega, its brightest star, was the pole star 14,000 years ago.',
    stars: [[2.2, -2.78, 0.03], [-0.36, 2.64, 3.5], [-2.2, 3.31, 3.2], [0.6, -1.6, 4.3], [-1.33, -0.9, 4.3]],
    seq: [0, 3, 4, 2, 1, 3],
  },
  {
    id: 'crux',
    name: 'Southern Cross',
    blurb: 'The smallest constellation, and the compass of the southern sky.',
    stars: [[0.08, 3.1, 0.8], [-2.6, -0.31, 1.25], [-0.53, -2.89, 1.6], [1.5, -1.25, 2.8], [0.68, 0.4, 3.6]],
    seq: [2, 0, _, 1, 3, _, 4],
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    blurb: 'The Scorpion, with red Antares beating at its heart.',
    stars: [
      [3.9, -5.57, 1], [9, -12.2, 2.6], [10.2, -9.38, 2.3], [10.4, -5.89, 2.9], [5.7, -6.41, 2.9], [2.5, -3.78, 2.8], [-0.5, 2.29, 2.3],
      [-0.76, 6.05, 3], [-1.27, 10.36, 3.6], [-5.1, 11.24, 3.3], [-10.4, 11, 1.9], [-12.6, 8.13, 3], [-11.6, 7.03, 2.4], [-9.7, 5.1, 1.6],
    ],
    seq: [1, 2, 3, _, 2, 4, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    id: 'leo',
    name: 'Leo',
    blurb: 'The Lion. Its mane is a backwards question mark called the Sickle.',
    stars: [[9.4, 6.03, 1.4], [-14.6, 3.43, 2.1], [6.7, -1.84, 2], [-6.3, -2.52, 2.6], [-6.3, 2.57, 3.3], [7.4, -5.42, 3.4], [14.6, -5.77, 3], [9.7, 1.24, 3.5], [13.2, -8, 3.9]],
    seq: [6, 8, 5, 2, 7, 0, 4, 1, 3, 2, _, 3, 4],
  },
]

export const presetById = (id: string) => PRESETS.find(p => p.id === id)

/** Brightness from apparent magnitude: Vega (0) is 1, faint naked-eye stars fade toward 0.15. */
export const magToB = (mag: number) => clamp((4.5 - mag) / 4.5, 0.15, 1)

/** Scale a preset so its larger side is `size` world units, centred on (cx, cy). */
export function instantiatePreset(p: Preset, cx: number, cy: number, size: number, hue: number): Constellation {
  const xs = p.stars.map(s => s[0])
  const ys = p.stars.map(s => s[1])
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2
  const my = (Math.min(...ys) + Math.max(...ys)) / 2
  const k = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  return {
    id: newId(),
    name: p.name,
    hue,
    preset: p.id,
    stars: p.stars.map(([x, y, m]) => ({ x: cx + (x - mx) * k, y: cy + (y - my) * k, b: magToB(m) })),
    seq: [...p.seq],
  }
}
