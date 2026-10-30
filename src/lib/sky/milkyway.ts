import { noise2 } from '../rng'

/** Slope of the Milky Way band across the far layer. */
const SLOPE = 0.42
const COS = Math.cos(Math.atan(SLOPE))

/** Centre line of the band, in far-layer coordinates. It wanders but never ends. */
export function bandCentreY(x: number): number {
  return SLOPE * x + 260 * Math.sin(x / 2300) - 150
}

/** How much Milky Way there is at a far-layer point, from 0 (none) to 1 (core). */
export function bandDensity(x: number, y: number): number {
  const d = (y - bandCentreY(x)) * COS
  const width = 480 + 220 * noise2(x / 3000, 0.5, 9)
  const falloff = Math.exp(-((d / width) ** 2))
  return falloff * (0.55 + 0.45 * noise2(x / 700, y / 700, 5))
}
