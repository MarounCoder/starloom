import { anchorY, BREAK, bounds, type Constellation } from '../lib/constellations'
import { degreeFor, degreeToMidi, midiName, midiToFreq } from '../lib/music/scales'
import { audio } from '../lib/music/audio'
import { clamp } from '../lib/rng'
import { layerRect, worldToScreen } from '../lib/camera'
import { pulses } from './fx'
import { useSky } from './store'
import { view } from './view'

export function noteOf(c: Constellation, idx: number) {
  const s = c.stars[idx]
  const midi = degreeToMidi(useSky.getState().settings.scale, degreeFor(s.y, anchorY(c)))
  return { midi, name: midiName(midi), freq: midiToFreq(midi) }
}

/** Sound one star: its pitch, panned to where it sits on screen. */
export function soundStar(c: Constellation, idx: number, when = 0) {
  const s = c.stars[idx]
  if (!s) return
  const [sx] = worldToScreen(view.cam, view.w, view.h, s.x, s.y)
  audio.play(noteOf(c, idx).freq, { pan: (sx / view.w - 0.5) * 1.6, velocity: 0.55 + s.b * 0.45, when })
  pulses.set(`${c.id}:${idx}`, performance.now() + when * 1000)
}

/** A quick upward strum through a constellation, used when one is dropped in. */
export function strum(c: Constellation) {
  const order = c.stars.map((_, i) => i).sort((a, b) => c.stars[b].y - c.stars[a].y)
  order.forEach((idx, k) => soundStar(c, idx, k * 0.06))
}

const loops = new Map<string, number>()
let token = 0

function setPlaying() {
  useSky.setState({ playing: [...loops.keys()] })
}

/** Loop a constellation's melody. Rhythm follows the distance between stars; breaks are rests. */
export function play(cid: string) {
  audio.ensure()
  const my = ++token
  loops.set(cid, my)
  setPlaying()
  let k = 0
  const step = () => {
    if (loops.get(cid) !== my) return
    const c = useSky.getState().constellations.find(x => x.id === cid)
    if (!c || !c.seq.length) return stop(cid)
    if (k >= c.seq.length) {
      k = 0
      window.setTimeout(step, 1000)
      return
    }
    const idx = c.seq[k++]
    if (idx === BREAK) {
      window.setTimeout(step, 420)
      return
    }
    soundStar(c, idx)
    useSky.setState({ focus: { cid, idx } })
    const nextIdx = c.seq[k]
    const a = c.stars[idx]
    const b = nextIdx !== undefined && nextIdx !== BREAK ? c.stars[nextIdx] : null
    const d = b ? Math.hypot(b.x - a.x, b.y - a.y) : 200
    window.setTimeout(step, clamp(170 + d * 1.3, 190, 760))
  }
  step()
}

export function stop(cid: string) {
  if (loops.delete(cid)) setPlaying()
}

export function stopAll() {
  loops.clear()
  setPlaying()
}

export const isPlaying = (cid: string) => loops.has(cid)

export function toggle(cid: string) {
  if (isPlaying(cid)) stop(cid)
  else play(cid)
}

/** Play every constellation in view together, a small sky symphony. Toggles off if anything is playing. */
export function togglePlayAll() {
  if (loops.size) return stopAll()
  const r = layerRect(view.cam, view.w, view.h)
  const visible = useSky
    .getState()
    .constellations.filter(c => {
      if (!c.seq.length) return false
      const b = bounds(c)
      return b.x1 >= r.x0 && b.x0 <= r.x1 && b.y1 >= r.y0 && b.y0 <= r.y1
    })
  visible.forEach((c, i) => window.setTimeout(() => play(c.id), i * 230))
  return visible.length
}
