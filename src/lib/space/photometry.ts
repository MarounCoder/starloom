/** Stars fainter than this (seen from the Sun) are left out of the real catalogue. */
export const STAR_MAG_LIMIT = 7.5

export const apparentMag = (absMag: number, distPc: number) => absMag + 5 * Math.log10(Math.max(distPc, 1e-12)) - 5

/** Black-body colour for a B–V index (Ballesteros' temperature, Helland's RGB fit), brightest channel = 1. */
export function bvToRgb(ci: number): [number, number, number] {
  const bv = Math.max(-0.4, Math.min(2.2, ci))
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)) / 100
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332)
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04
  const c = [r, g, b].map(v => Math.max(0, Math.min(255, v)))
  const m = Math.max(...c)
  return [c[0] / m, c[1] / m, c[2] / m]
}

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'

/** A rough spectral class from colour alone. */
export function spectralFromBv(ci: number): SpectralClass {
  if (ci < -0.3) return 'O'
  if (ci < -0.02) return 'B'
  if (ci < 0.3) return 'A'
  if (ci < 0.58) return 'F'
  if (ci < 0.81) return 'G'
  if (ci < 1.4) return 'K'
  return 'M'
}
