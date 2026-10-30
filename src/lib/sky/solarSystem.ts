/** Where the Sun sits in the world. */
export const SOLAR_ORIGIN = { x: 2600, y: 1300 }

/** Simulated days that pass per real second while you watch. */
export const SIM_DAYS_PER_SECOND = 4

export const J2000 = Date.UTC(2000, 0, 1, 12)
export const daysSinceJ2000 = (ms: number) => (ms - J2000) / 86_400_000

export interface Fact {
  label: string
  value: string
}

export interface Body {
  id: string
  name: string
  color: string
  /** Radius in world units. */
  radius: number
  /** Orbit radius in world units (square-root compressed from AU). */
  orbit: number
  au: number
  /** Orbital period in days. */
  period: number
  /** Mean heliocentric longitude at J2000, degrees. */
  l0: number
  ring?: boolean
  facts: Fact[]
  blurb: string
}

const orbitFor = (au: number) => 70 + 170 * Math.sqrt(au)

function planet(b: Omit<Body, 'orbit'>): Body {
  return { ...b, orbit: orbitFor(b.au) }
}

export const SUN = {
  id: 'sun',
  name: 'The Sun',
  color: '#ffd27a',
  radius: 30,
  facts: [
    { label: 'Diameter', value: '1,392,700 km' },
    { label: 'Surface', value: '5,500 °C' },
    { label: 'Age', value: '4.6 billion years' },
    { label: 'Light to Earth', value: '8 min 20 s' },
  ],
  blurb: 'It holds 99.8% of all the mass in the Solar System.',
}

export const PLANETS: Body[] = [
  planet({
    id: 'mercury', name: 'Mercury', color: '#b9aea4', radius: 3.2, au: 0.387, period: 87.969, l0: 252.25,
    facts: [
      { label: 'Diameter', value: '4,879 km' }, { label: 'Day', value: '176 Earth days' },
      { label: 'Year', value: '88 days' }, { label: 'Moons', value: 'None' },
    ],
    blurb: 'From sunrise to sunrise, one day on Mercury lasts two of its years.',
  }),
  planet({
    id: 'venus', name: 'Venus', color: '#f1d7a0', radius: 5.5, au: 0.723, period: 224.701, l0: 181.98,
    facts: [
      { label: 'Diameter', value: '12,104 km' }, { label: 'Day', value: '117 Earth days' },
      { label: 'Year', value: '225 days' }, { label: 'Moons', value: 'None' },
    ],
    blurb: 'It spins backwards, so the Sun rises in the west.',
  }),
  planet({
    id: 'earth', name: 'Earth', color: '#6fa8ff', radius: 5.8, au: 1, period: 365.256, l0: 100.46,
    facts: [
      { label: 'Diameter', value: '12,742 km' }, { label: 'Day', value: '24 hours' },
      { label: 'Year', value: '365.25 days' }, { label: 'Moons', value: '1' },
    ],
    blurb: 'You are here. The only world we know with liquid water oceans on its surface.',
  }),
  planet({
    id: 'mars', name: 'Mars', color: '#e07a52', radius: 4, au: 1.524, period: 686.98, l0: 355.45,
    facts: [
      { label: 'Diameter', value: '6,779 km' }, { label: 'Day', value: '24 h 40 min' },
      { label: 'Year', value: '687 days' }, { label: 'Moons', value: '2' },
    ],
    blurb: 'Olympus Mons, its largest volcano, is nearly three times the height of Everest.',
  }),
  planet({
    id: 'jupiter', name: 'Jupiter', color: '#e3b98a', radius: 16, au: 5.203, period: 4332.59, l0: 34.4,
    facts: [
      { label: 'Diameter', value: '139,820 km' }, { label: 'Day', value: '9 h 56 min' },
      { label: 'Year', value: '11.9 years' }, { label: 'Moons', value: '95+' },
    ],
    blurb: 'The Great Red Spot is a storm wider than Earth that has lasted for centuries.',
  }),
  planet({
    id: 'saturn', name: 'Saturn', color: '#ead6a6', radius: 13.5, au: 9.537, period: 10759.22, l0: 49.94, ring: true,
    facts: [
      { label: 'Diameter', value: '116,460 km' }, { label: 'Day', value: '10 h 33 min' },
      { label: 'Year', value: '29.4 years' }, { label: 'Moons', value: '270+' },
    ],
    blurb: 'It is less dense than water. In a big enough bathtub, it would float.',
  }),
  planet({
    id: 'uranus', name: 'Uranus', color: '#9fe3e6', radius: 9, au: 19.19, period: 30688.5, l0: 313.23,
    facts: [
      { label: 'Diameter', value: '50,724 km' }, { label: 'Day', value: '17 h 14 min' },
      { label: 'Year', value: '84 years' }, { label: 'Moons', value: '28+' },
    ],
    blurb: 'It rolls around the Sun on its side, tilted 98 degrees.',
  }),
  planet({
    id: 'neptune', name: 'Neptune', color: '#5b7dff', radius: 8.8, au: 30.07, period: 60182, l0: 304.88,
    facts: [
      { label: 'Diameter', value: '49,244 km' }, { label: 'Day', value: '16 h 6 min' },
      { label: 'Year', value: '165 years' }, { label: 'Moons', value: '16' },
    ],
    blurb: 'Its winds are the fastest in the Solar System, over 2,000 km/h.',
  }),
]

export const MOON_ORBIT = 14
export const MOON_PERIOD = 27.32

export const longitudeDeg = (body: Pick<Body, 'l0' | 'period'>, days: number) =>
  (((body.l0 + (360 * days) / body.period) % 360) + 360) % 360

/** "Music of the spheres": slower planets hum lower. */
export const toneFor = (period: number) => 261.63 * Math.pow(365.256 / period, 0.25)

export interface BodyPosition {
  id: string
  x: number
  y: number
}

/** World positions of every planet (and Earth's Moon) for a simulated day count since J2000. */
export function bodyPositions(days: number): BodyPosition[] {
  const out: BodyPosition[] = []
  for (const p of PLANETS) {
    const a = (longitudeDeg(p, days) * Math.PI) / 180
    const x = SOLAR_ORIGIN.x + Math.cos(a) * p.orbit
    const y = SOLAR_ORIGIN.y - Math.sin(a) * p.orbit
    out.push({ id: p.id, x, y })
    if (p.id === 'earth') {
      const m = ((days / MOON_PERIOD) % 1) * Math.PI * 2
      out.push({ id: 'moon', x: x + Math.cos(m) * MOON_ORBIT, y: y - Math.sin(m) * MOON_ORBIT })
    }
  }
  return out
}
