import { degreeToMidi, midiToFreq } from '../lib/music/scales'
import { audio } from '../lib/music/audio'
import { BREAK, type Constellation } from '../lib/constellations'
import { LOOP_PAUSE_MS, melody, walkFigure, type Note } from '../lib/space/music'
import { apparentMag } from '../lib/space/photometry'
import { resolveStar, type StarId } from '../lib/space/starId'
import { KM_PER_PC } from '../lib/space/units'
import { dist, type V3 } from '../lib/space/vec'
import { cam, project, screen } from './camera'
import { catalogState, starKm } from './catalog'
import { useSky } from './store'

/** When each star last sounded (performance.now() ms), for the pulse on screen. */
export const pulses = new Map<StarId, number>()

interface Playable {
  ids: StarId[]
  starsKm: V3[]
  absMags: number[]
  seq: number[]
}

/** A user constellation, or a real figure as `fig:<abbr>`, as stars and a sequence. */
function playable(id: string): Playable | null {
  const { catalog, figures } = catalogState()
  if (id.startsWith('fig:')) {
    const f = figures.find(x => x.abbr === id.slice(4))
    if (!f || !catalog) return null
    const walk = walkFigure(f.segs, new Map(f.segs.flat().map(i => [i, catalog.absMag[i] + 5 * Math.log10(Math.hypot(catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2])) - 5])))
    const nodes = [...new Set(walk.filter(i => i !== BREAK))]
    const index = new Map(nodes.map((n, k) => [n, k]))
    return {
      ids: nodes.map(i => `h${catalog.hyg[i]}`),
      starsKm: nodes.map(i => starKm(i)),
      absMags: nodes.map(i => catalog.absMag[i]),
      seq: walk.map(i => (i === BREAK ? BREAK : index.get(i)!)),
    }
  }
  const c = useSky.getState().constellations.find(x => x.id === id)
  if (!c) return null
  return fromConstellation(c)
}

function fromConstellation(c: Constellation): Playable {
  const resolved = c.stars.map(s => resolveStar(s, catalogState().catalog))
  return {
    ids: c.stars,
    starsKm: resolved.map(r => r?.posKm ?? [NaN, NaN, NaN]),
    absMags: resolved.map(r => r?.absMag ?? 5),
    seq: c.seq.map(i => (i !== BREAK && !resolved[i] ? BREAK : i)),
  }
}

function notesFor(p: Playable): Note[] {
  const mags = p.starsKm.map((s, i) => apparentMag(p.absMags[i], dist(s, cam.pos) / KM_PER_PC))
  return melody(p.starsKm, p.seq, cam.pos, mags)
}

function sound(p: Playable, n: Note) {
  const scale = useSky.getState().settings.scale
  const sp = project(p.starsKm[n.idx])
  const pan = sp.behind ? 0 : (sp.x / screen.w - 0.5) * 1.6
  audio.play(midiToFreq(degreeToMidi(scale, n.degree)), { pan, velocity: 0.35 + n.velocity * 0.6 })
  pulses.set(p.ids[n.idx], performance.now())
}

/** Sound one star of the active constellation as it is tapped. */
export function soundStar(id: StarId) {
  const s = useSky.getState()
  const c = s.constellations.find(x => x.id === s.activeId)
  if (!c) return
  const p = fromConstellation(c)
  const idx = c.stars.indexOf(id)
  const note = notesFor(p).find(n => n.idx === idx)
  if (note) sound(p, note)
}

const loops = new Map<string, number>()
let token = 0

const setPlaying = () => useSky.setState({ playing: [...loops.keys()] })

/** Loop a melody; it is recomputed each time round, so moving the camera bends it. */
export function play(id: string) {
  audio.ensure()
  const my = ++token
  loops.set(id, my)
  setPlaying()
  let notes: Note[] = []
  let p: Playable | null = null
  let k = 0
  const step = () => {
    if (loops.get(id) !== my) return
    if (k === 0) {
      p = playable(id)
      if (!p || !p.seq.some(i => i !== BREAK)) return stop(id)
      notes = notesFor(p)
    }
    if (k >= notes.length) {
      k = 0
      window.setTimeout(step, LOOP_PAUSE_MS)
      return
    }
    const n = notes[k++]
    if (!n.rest && p) sound(p, n)
    window.setTimeout(step, n.gapMs)
  }
  step()
}

export function stop(id: string) {
  if (loops.delete(id)) setPlaying()
}

export function stopAll() {
  loops.clear()
  setPlaying()
}

export const isPlaying = (id: string) => loops.has(id)

export function toggle(id: string) {
  if (isPlaying(id)) stop(id)
  else play(id)
}

/** Play your constellations that are in view, plus a selected real one, together. Toggles off if anything plays. */
export function togglePlayAll(): number {
  if (loops.size) {
    stopAll()
    return -1
  }
  const s = useSky.getState()
  const inView = (c: Constellation) =>
    c.seq.length > 0 &&
    c.stars.some(id => {
      const r = resolveStar(id, catalogState().catalog)
      if (!r) return false
      const p = project(r.posKm)
      return !p.behind && p.x >= 0 && p.x <= screen.w && p.y >= 0 && p.y <= screen.h
    })
  const ids = s.constellations.filter(inView).map(c => c.id)
  if (s.selected?.kind === 'figure') ids.push(`fig:${s.selected.abbr}`)
  ids.forEach((id, i) => window.setTimeout(() => play(id), i * 230))
  return ids.length
}
