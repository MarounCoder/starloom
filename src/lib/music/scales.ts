import { clamp } from '../rng'

export type ScaleId = 'pentatonic' | 'minor' | 'hirajoshi' | 'lydian'

export const SCALES: Record<ScaleId, { label: string; steps: number[] }> = {
  pentatonic: { label: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
  minor: { label: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
  hirajoshi: { label: 'Hirajōshi', steps: [0, 2, 3, 7, 8] },
  lydian: { label: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11] },
}

/** World units between neighbouring scale degrees. */
export const STEP_WORLD = 45
export const ANCHOR_DEGREE = 7
export const MAX_DEGREE = 21

/**
 * Scale degree of a star, relative to its constellation's first star:
 * the anchor sits on degree 7 and every 45 world units higher is one degree up.
 */
export function degreeFor(y: number, anchorY: number): number {
  return clamp(Math.round((anchorY - y) / STEP_WORLD) + ANCHOR_DEGREE, 0, MAX_DEGREE)
}

/** Root is D3 (MIDI 50). */
export function degreeToMidi(scale: ScaleId, degree: number, root = 50): number {
  const steps = SCALES[scale].steps
  const n = steps.length
  const oct = Math.floor(degree / n)
  const d = ((degree % n) + n) % n
  return root + oct * 12 + steps[d]
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const midiName = (m: number) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
