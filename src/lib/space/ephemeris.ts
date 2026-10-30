import { Body, GeoMoon, HelioVector, JupiterMoons, MoonPhase, RotationAxis, type Vector } from 'astronomy-engine'
import type { BodyId } from './bodies'
import { ECL_NORTH } from './frames'
import { DAY_MS, J2000_MS, KM_PER_AU } from './units'
import { add, cross, norm, scale, type V3 } from './vec'

const km = (v: { x: number; y: number; z: number }): V3 => [v.x * KM_PER_AU, v.y * KM_PER_AU, v.z * KM_PER_AU]
const unit = (v: Vector): V3 => norm([v.x, v.y, v.z])

const PLANETS: [BodyId, Body][] = [
  ['mercury', Body.Mercury], ['venus', Body.Venus], ['earth', Body.Earth], ['mars', Body.Mars],
  ['jupiter', Body.Jupiter], ['saturn', Body.Saturn], ['uranus', Body.Uranus], ['neptune', Body.Neptune],
]

const TITAN_A_KM = 1_221_870
const TITAN_PERIOD_D = 15.945

/** Heliocentric positions (km, equatorial J2000) of every body for a date. */
export function bodyPositions(date: Date): Record<BodyId, V3> {
  const out = { sun: [0, 0, 0] } as Record<BodyId, V3>
  for (const [id, b] of PLANETS) out[id] = km(HelioVector(b, date))
  out.moon = add(out.earth, km(GeoMoon(date)))
  const jm = JupiterMoons(date)
  out.io = add(out.jupiter, km(jm.io))
  out.europa = add(out.jupiter, km(jm.europa))
  out.ganymede = add(out.jupiter, km(jm.ganymede))
  out.callisto = add(out.jupiter, km(jm.callisto))
  // Titan: a circular orbit in Saturn's equatorial plane, phase 0 at J2000.
  const n = unit(RotationAxis(Body.Saturn, date).north)
  const e1 = norm(cross([0, 0, 1], n))
  const e2 = cross(n, e1)
  const a = (2 * Math.PI * ((date.getTime() - J2000_MS) / DAY_MS)) / TITAN_PERIOD_D
  out.titan = add(out.saturn, add(scale(e1, TITAN_A_KM * Math.cos(a)), scale(e2, TITAN_A_KM * Math.sin(a))))
  return out
}

const AXES: Partial<Record<BodyId, Body>> = {
  sun: Body.Sun, mercury: Body.Mercury, venus: Body.Venus, earth: Body.Earth, moon: Body.Moon, mars: Body.Mars,
  jupiter: Body.Jupiter, saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune,
}

/** A body's north pole and how far it has turned (degrees), for orienting its texture. */
export function bodySpin(id: BodyId, date: Date): { north: V3; spinDeg: number } {
  const b = AXES[id]
  if (!b) return { north: ECL_NORTH, spinDeg: 0 }
  const axis = RotationAxis(b, date)
  return { north: unit(axis.north), spinDeg: axis.spin }
}

/** 0 = new moon, 0.5 = full moon. */
export const moonPhase = (date: Date) => MoonPhase(date) / 360
