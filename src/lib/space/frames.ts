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
