export type BodyId =
  | 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars'
  | 'jupiter' | 'io' | 'europa' | 'ganymede' | 'callisto'
  | 'saturn' | 'titan' | 'uranus' | 'neptune'

export interface BodyInfo {
  name: string
  parent: BodyId | null
  radiusKm: number
  color: string
  texture?: string
  clouds?: string
  ring?: { inner: number; outer: number; texture: string }
  facts: [label: string, value: string][]
  blurb: string
  /** The body's hum in Hz: slower orbits sing lower, the way Kepler imagined. */
  tone: number
}

/** "Music of the spheres": the tone for an orbital period in days. */
export const toneFor = (periodDays: number) => 261.63 * Math.pow(365.256 / periodDays, 0.25)

export const BODIES: Record<BodyId, BodyInfo> = {
  sun: {
    name: 'The Sun', parent: null, radiusKm: 695_700, color: '#ffd27a', texture: '2k_sun.jpg', tone: 98,
    facts: [['Diameter', '1,392,700 km'], ['Surface', '5,500 °C'], ['Age', '4.6 billion years'], ['Light to Earth', '8 min 20 s']],
    blurb: 'It holds 99.8% of all the mass in the Solar System.',
  },
  mercury: {
    name: 'Mercury', parent: 'sun', radiusKm: 2_439.7, color: '#b9aea4', texture: '2k_mercury.jpg', tone: toneFor(87.969),
    facts: [['Diameter', '4,879 km'], ['Day', '176 Earth days'], ['Year', '88 days'], ['Moons', 'None']],
    blurb: 'From sunrise to sunrise, one day on Mercury lasts two of its years.',
  },
  venus: {
    name: 'Venus', parent: 'sun', radiusKm: 6_051.8, color: '#f1d7a0', texture: '2k_venus_atmosphere.jpg', tone: toneFor(224.701),
    facts: [['Diameter', '12,104 km'], ['Day', '117 Earth days'], ['Year', '225 days'], ['Moons', 'None']],
    blurb: 'It spins backwards, so the Sun rises in the west.',
  },
  earth: {
    name: 'Earth', parent: 'sun', radiusKm: 6_371, color: '#6fa8ff', texture: '2k_earth_daymap.jpg', clouds: '2k_earth_clouds.jpg', tone: toneFor(365.256),
    facts: [['Diameter', '12,742 km'], ['Day', '24 hours'], ['Year', '365.25 days'], ['Moons', '1']],
    blurb: 'You are here. The only world we know with liquid water oceans on its surface.',
  },
  moon: {
    name: 'The Moon', parent: 'earth', radiusKm: 1_737.4, color: '#c9c4bb', texture: '2k_moon.jpg', tone: toneFor(27.32),
    facts: [['Diameter', '3,475 km'], ['Distance', '384,400 km'], ['Orbit', '27.3 days'], ['Light from Earth', '1.3 s']],
    blurb: 'It always shows Earth the same face, and drifts 3.8 cm further away every year.',
  },
  mars: {
    name: 'Mars', parent: 'sun', radiusKm: 3_389.5, color: '#e07a52', texture: '2k_mars.jpg', tone: toneFor(686.98),
    facts: [['Diameter', '6,779 km'], ['Day', '24 h 40 min'], ['Year', '687 days'], ['Moons', '2']],
    blurb: 'Olympus Mons, its largest volcano, is nearly three times the height of Everest.',
  },
  jupiter: {
    name: 'Jupiter', parent: 'sun', radiusKm: 69_911, color: '#e3b98a', texture: '2k_jupiter.jpg', tone: toneFor(4332.59),
    facts: [['Diameter', '139,820 km'], ['Day', '9 h 56 min'], ['Year', '11.9 years'], ['Moons', '95+']],
    blurb: 'The Great Red Spot is a storm wider than Earth that has lasted for centuries.',
  },
  io: {
    name: 'Io', parent: 'jupiter', radiusKm: 1_821.6, color: '#d8c46a', tone: toneFor(1.769),
    facts: [['Diameter', '3,643 km'], ['Orbit', '1.8 days'], ['Volcanoes', '400+ active']],
    blurb: 'The most volcanic place in the Solar System, squeezed by the tides of Jupiter.',
  },
  europa: {
    name: 'Europa', parent: 'jupiter', radiusKm: 1_560.8, color: '#c9bfa8', tone: toneFor(3.551),
    facts: [['Diameter', '3,122 km'], ['Orbit', '3.6 days'], ['Ocean', 'Under ~20 km of ice']],
    blurb: 'Beneath its ice lies a salty ocean holding more water than all of the seas on Earth.',
  },
  ganymede: {
    name: 'Ganymede', parent: 'jupiter', radiusKm: 2_634.1, color: '#8f8475', tone: toneFor(7.155),
    facts: [['Diameter', '5,268 km'], ['Orbit', '7.2 days'], ['Rank', 'Largest moon']],
    blurb: 'Bigger than Mercury, and the only moon with its own magnetic field.',
  },
  callisto: {
    name: 'Callisto', parent: 'jupiter', radiusKm: 2_410.3, color: '#5f574d', tone: toneFor(16.689),
    facts: [['Diameter', '4,821 km'], ['Orbit', '16.7 days'], ['Surface', '4 billion years old']],
    blurb: 'The most heavily cratered surface we know, almost untouched since it formed.',
  },
  saturn: {
    name: 'Saturn', parent: 'sun', radiusKm: 58_232, color: '#ead6a6', texture: '2k_saturn.jpg', tone: toneFor(10759.22),
    ring: { inner: 74_500, outer: 136_780, texture: '2k_saturn_ring_alpha.png' },
    facts: [['Diameter', '116,460 km'], ['Day', '10 h 33 min'], ['Year', '29.4 years'], ['Moons', '270+']],
    blurb: 'It is less dense than water. In a big enough bathtub, it would float.',
  },
  titan: {
    name: 'Titan', parent: 'saturn', radiusKm: 2_574.7, color: '#d9a654', tone: toneFor(15.945),
    facts: [['Diameter', '5,150 km'], ['Orbit', '15.9 days'], ['Air', 'Thicker than on Earth']],
    blurb: 'It has rain, rivers and seas, all made of liquid methane.',
  },
  uranus: {
    name: 'Uranus', parent: 'sun', radiusKm: 25_362, color: '#9fe3e6', texture: '2k_uranus.jpg', tone: toneFor(30688.5),
    facts: [['Diameter', '50,724 km'], ['Day', '17 h 14 min'], ['Year', '84 years'], ['Moons', '28+']],
    blurb: 'It rolls around the Sun on its side, tilted 98 degrees.',
  },
  neptune: {
    name: 'Neptune', parent: 'sun', radiusKm: 24_622, color: '#5b7dff', texture: '2k_neptune.jpg', tone: toneFor(60182),
    facts: [['Diameter', '49,244 km'], ['Day', '16 h 6 min'], ['Year', '165 years'], ['Moons', '16']],
    blurb: 'Its winds are the fastest in the Solar System, over 2,000 km/h.',
  },
}

export const BODY_IDS = Object.keys(BODIES) as BodyId[]
