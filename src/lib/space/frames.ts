import { DEG, OBLIQUITY_RAD } from './units'
import { norm, type V3 } from './vec'

const C = Math.cos(OBLIQUITY_RAD)
const S = Math.sin(OBLIQUITY_RAD)

/** Equatorial J2000 → ecliptic J2000 (a rotation about the vernal-equinox axis). */
export const eqToEcl = (v: V3): V3 => [v[0], C * v[1] + S * v[2], -S * v[1] + C * v[2]]
export const eclToEq = (v: V3): V3 => [v[0], C * v[1] - S * v[2], S * v[1] + C * v[2]]

/** The ecliptic north pole, which Starloom treats as "up". */
export const ECL_NORTH: V3 = eclToEq([0, 0, 1])

export function raDecToVec(raDeg: number, decDeg: number, dist = 1): V3 {
  const ra = raDeg * DEG
  const dec = decDeg * DEG
  return [dist * Math.cos(dec) * Math.cos(ra), dist * Math.cos(dec) * Math.sin(ra), dist * Math.sin(dec)]
}

/** Ecliptic latitude, in degrees, of an equatorial direction. */
export function eclipticLatDeg(dir: V3): number {
  const e = eqToEcl(norm(dir))
  return Math.asin(Math.max(-1, Math.min(1, e[2]))) / DEG
}

/** Rotation from equatorial J2000 to galactic coordinates (rows), as used by the Hipparcos catalogue. */
export const EQ_TO_GAL: [V3, V3, V3] = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
]

export const eqToGal = (v: V3): V3 => [
  EQ_TO_GAL[0][0] * v[0] + EQ_TO_GAL[0][1] * v[1] + EQ_TO_GAL[0][2] * v[2],
  EQ_TO_GAL[1][0] * v[0] + EQ_TO_GAL[1][1] * v[1] + EQ_TO_GAL[1][2] * v[2],
  EQ_TO_GAL[2][0] * v[0] + EQ_TO_GAL[2][1] * v[1] + EQ_TO_GAL[2][2] * v[2],
]

/** Galactic → equatorial (the transpose). */
export const galToEq = (v: V3): V3 => [
  EQ_TO_GAL[0][0] * v[0] + EQ_TO_GAL[1][0] * v[1] + EQ_TO_GAL[2][0] * v[2],
  EQ_TO_GAL[0][1] * v[0] + EQ_TO_GAL[1][1] * v[1] + EQ_TO_GAL[2][1] * v[2],
  EQ_TO_GAL[0][2] * v[0] + EQ_TO_GAL[1][2] * v[1] + EQ_TO_GAL[2][2] * v[2],
]
