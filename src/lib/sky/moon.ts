export const SYNODIC_DAYS = 29.530588853
/** A known new moon: 6 January 2000, 18:14 UTC. */
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14)

export interface MoonPhase {
  /** 0 = new, 0.5 = full, back to 1. */
  phase: number
  /** Lit fraction of the disc, 0..1. */
  illumination: number
  name: string
}

export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - NEW_MOON_REF) / 86_400_000
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS
  const phase = age / SYNODIC_DAYS
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2
  return { phase, illumination, name: phaseName(phase) }
}

function phaseName(p: number): string {
  if (p < 0.03 || p > 0.97) return 'New moon'
  if (p < 0.22) return 'Waxing crescent'
  if (p < 0.28) return 'First quarter'
  if (p < 0.47) return 'Waxing gibbous'
  if (p < 0.53) return 'Full moon'
  if (p < 0.72) return 'Waning gibbous'
  if (p < 0.78) return 'Last quarter'
  return 'Waning crescent'
}
