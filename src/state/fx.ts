import { daysSinceJ2000 } from '../lib/sky/solarSystem'
import { CYCLE_MS } from '../lib/sky/daycycle'

/** Short-lived visual state shared by input handling and the renderer. None of it is saved. */

/** `${constellationId}:${starIndex}` → time the star last sounded. */
export const pulses = new Map<string, number>()
/** `${constellationId}:${seqIndex}` → time that line segment was drawn. */
export const segBorn = new Map<string, number>()

export interface Shooter {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
}
export const shooters: Shooter[] = []

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
}
export const sparks: Spark[] = []

export type HoverTarget = { kind: 'star'; cid: string; idx: number } | { kind: 'body'; id: string } | null

export const pointer = {
  /** Last known pointer position in screen px, for hover and the preset ghost. */
  sx: -1,
  sy: -1,
  inside: false,
  hover: null as HoverTarget,
}

export const clock = {
  /** Simulated days since J2000 for the planets; starts at today's real positions. */
  solarDays: daysSinceJ2000(Date.now()),
  /** Start the day/night loop in the middle of the night. */
  cycleStart: performance.now() - 0.3 * CYCLE_MS,
  nextShot: performance.now() + 6000,
}

export const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
