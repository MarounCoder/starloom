import { BODIES, BODY_IDS, type BodyId } from '../lib/space/bodies'
import { IAU } from '../lib/space/iau'
import { buildIndex, type Entry, type Index } from '../lib/space/search'
import { KM_PER_AU, KM_PER_PC } from '../lib/space/units'
import { dist, sub, type V3 } from '../lib/space/vec'
import { MILKY_WAY, type Galaxy } from '../lib/space/galaxy'
import { galaxiesNear, galaxyByKey } from '../lib/space/cosmos'
import { cam } from './camera'
import { catalogState, figureCentroidKm, starKm, starMagFrom } from './catalog'
import { positions } from './clock'
import { flyTo, lookToward, type Target } from './flight'
import { sky } from './store'

/** Where a search result or a suggested place takes you. */
export type Destination = Target | { kind: 'figure'; abbr: string } | { kind: 'galaxy'; key: string }

/** Face-on, from far enough out to see the whole galaxy. */
export function galaxyDestination(g: Galaxy): Destination {
  return { kind: 'galaxy', key: g.key }
}

/** Go somewhere: fly to bodies, stars and points; turn to face constellations. Selects what has a card. */
export function go(d: Destination) {
  if (d.kind === 'figure') {
    const c = figureCentroidKm(d.abbr)
    if (c) lookToward(sub(c, cam.pos))
    sky.select({ kind: 'figure', abbr: d.abbr })
    return
  }
  if (d.kind === 'galaxy') {
    const g = galaxyByKey(d.key)
    if (!g) return
    const out = g.key === 'mw' ? 32000 : g.radiusPc * 2.6
    flyTo({ kind: 'point', pos: g.center, arriveKm: out * KM_PER_PC, approach: g.normal })
    sky.select({ kind: 'galaxy', id: g.key })
    return
  }
  flyTo(d)
  if (d.kind === 'body') sky.select({ kind: 'body', id: d.id })
  else if (d.kind === 'star') sky.select({ kind: 'star', id: d.id })
  else sky.select(null)
}

const hygOfHip = (hip: number): string | null => {
  const c = catalogState().catalog
  const i = c?.byHip.get(hip)
  return c && i !== undefined ? `h${c.hyg[i]}` : null
}

export interface Place {
  label: string
  blurb: string
  dest: () => Destination | null
}

const PLEIADES = [17702, 17847, 17499, 17573, 17608, 17531, 17851, 17489]

export const PLACES: Place[] = [
  { label: 'Earth', blurb: 'Home', dest: () => ({ kind: 'body', id: 'earth' }) },
  { label: 'The Moon', blurb: '384,400 km away', dest: () => ({ kind: 'body', id: 'moon' }) },
  { label: 'Jupiter', blurb: 'And its four great moons', dest: () => ({ kind: 'body', id: 'jupiter' }) },
  { label: "Saturn's rings", blurb: 'Nearly edge-on this decade', dest: () => ({ kind: 'body', id: 'saturn' }) },
  {
    label: 'Leave the Solar System',
    blurb: 'Look back from 600 AU',
    dest: () => ({ kind: 'point', pos: [0, 0, 0], arriveKm: 600 * KM_PER_AU }),
  },
  { label: 'Alpha Centauri', blurb: 'The nearest stars, 4.4 light-years', dest: () => star(71683) },
  { label: 'Sirius', blurb: 'The brightest star in our sky', dest: () => star(32349) },
  { label: 'Betelgeuse', blurb: 'A red supergiant in Orion', dest: () => star(27989) },
  {
    label: 'The Pleiades',
    blurb: 'The Seven Sisters star cluster',
    dest: () => {
      const c = catalogState().catalog
      if (!c) return null
      const ids = PLEIADES.map(h => c.byHip.get(h)).filter((i): i is number => i !== undefined)
      const pos: V3 = [0, 0, 0]
      for (const i of ids) {
        const p = starKm(i)
        for (let k = 0; k < 3; k++) pos[k] += p[k] / ids.length
      }
      return { kind: 'point', pos, arriveKm: 6 * KM_PER_PC }
    },
  },
  { label: 'Above the Milky Way', blurb: 'Our whole galaxy, from 100,000 light-years up', dest: () => galaxyDestination(MILKY_WAY) },
  {
    label: 'The nearest other galaxy',
    blurb: 'Generated: a galaxy that Starloom imagined',
    dest: () => {
      const g = galaxiesNear([0, 0, 0])
        .filter(x => x.key !== 'mw')
        .sort((a, b) => dist(a.center, MILKY_WAY.center) - dist(b.center, MILKY_WAY.center))[0]
      return g ? galaxyDestination(g) : null
    },
  },
]

function star(hip: number): Destination | null {
  const id = hygOfHip(hip)
  return id ? { kind: 'star', id } : null
}

let index: Index<Destination> | null = null
let indexedFor: unknown = null

/** The search index: bodies, the 88 constellations and every named star. Rebuilt once the catalogue arrives. */
export function searchIndex(): Index<Destination> {
  const { catalog, names } = catalogState()
  if (index && indexedFor === catalog) return index
  const entries: Entry<Destination>[] = []
  for (const id of BODY_IDS as BodyId[]) {
    const b = BODIES[id]
    entries.push({ key: `body:${id}`, label: b.name, detail: b.parent === 'sun' ? 'Planet' : b.parent ? `Moon of ${BODIES[b.parent].name}` : 'Star', aliases: id === 'sun' ? ['Sun', 'Sol'] : id === 'moon' ? ['Moon', 'Luna'] : [], target: { kind: 'body', id }, rank: 100 })
  }
  if (catalog) {
    for (const c of IAU) entries.push({ key: `fig:${c.abbr}`, label: c.name, detail: 'Constellation', aliases: [c.abbr, c.genitive], target: { kind: 'figure', abbr: c.abbr }, rank: 50 })
    const earth = positions().earth
    for (const [hyg, [proper, bayer, flam]] of Object.entries(names)) {
      const i = catalog.byHyg.get(Number(hyg))
      if (i === undefined) continue
      const con = catalog.con[i] < 88 ? IAU[catalog.con[i]] : null
      const label = proper ?? bayer ?? flam!
      const aliases = [bayer, flam].filter((x): x is string => !!x && x !== label)
      if (bayer && con) aliases.push(`${bayer.split(' ')[0]} ${con.genitive}`)
      entries.push({ key: `star:h${hyg}`, label, detail: con ? `Star in ${con.name}` : 'Star', aliases, target: { kind: 'star', id: `h${hyg}` }, rank: -starMagFrom(i, earth) })
    }
  }
  index = buildIndex(entries)
  indexedFor = catalog
  return index
}
