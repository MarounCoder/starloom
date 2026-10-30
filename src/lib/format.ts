import { KM_PER_AU, KM_PER_LY } from './space/units'

/** Whole numbers with thousands separators and a proper minus sign. */
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US').replace('-', '−')

/** Three significant figures, or a whole number once it reaches 100. */
const sig3 = (v: number) => (v >= 100 ? fmt(v) : v.toPrecision(3))

/** A distance in the unit that reads best: km, AU, then light-years up to billions. */
export function fmtDistance(km: number): string {
  if (km < 0.1 * KM_PER_AU) return `${fmt(km)} km`
  if (km < 0.05 * KM_PER_LY) return `${sig3(km / KM_PER_AU)} AU`
  const ly = km / KM_PER_LY
  if (ly < 1e3) return `${sig3(ly)} ly`
  if (ly < 1e6) return `${sig3(ly / 1e3)} kly`
  if (ly < 1e9) return `${sig3(ly / 1e6)} Mly`
  return `${sig3(ly / 1e9)} Gly`
}

/** Magnitude as astronomers write it, always signed: brighter stars have smaller numbers. */
export const fmtMag = (m: number) => (m < 0 ? '−' : '+') + Math.abs(m).toFixed(1)
