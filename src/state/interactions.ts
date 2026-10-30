import { screenToWorld } from '../lib/camera'
import { presetById } from '../lib/presets'
import { audio } from '../lib/music/audio'
import { randomWish } from '../lib/names'
import { bodyPositions, PLANETS, SOLAR_ORIGIN, SUN, toneFor } from '../lib/sky/solarSystem'
import { clock, pointer, segBorn, shooters, sparks, type HoverTarget } from './fx'
import { current, sky, useSky } from './store'
import { soundStar, strum } from './player'
import { view } from './view'

const toScreen = (x: number, y: number): [number, number] => [
  (x - view.cam.x) * view.cam.zoom + view.w / 2,
  (y - view.cam.y) * view.cam.zoom + view.h / 2,
]

/** Size a dropped-in preset so it fills a comfortable part of the screen. */
export const presetSize = () => Math.min(380, Math.min(view.w, view.h) * 0.55) / view.cam.zoom

export function hitStar(sx: number, sy: number, radius: number): { cid: string; idx: number } | null {
  let best: { cid: string; idx: number } | null = null
  let bd = radius
  const { constellations, currentId } = useSky.getState()
  for (const c of constellations) {
    c.stars.forEach((s, idx) => {
      const [x, y] = toScreen(s.x, s.y)
      const d = Math.hypot(x - sx, y - sy)
      if (d < bd || (d === bd && c.id === currentId)) {
        bd = d
        best = { cid: c.id, idx }
      }
    })
  }
  return best
}

export function hitBody(sx: number, sy: number, slop: number): string | null {
  const z = view.cam.zoom
  const [ox, oy] = toScreen(SOLAR_ORIGIN.x, SOLAR_ORIGIN.y)
  if (Math.hypot(ox - sx, oy - sy) < Math.max(SUN.radius * z, 3) + slop) return 'sun'
  if (z < 0.2) return null
  for (const pos of bodyPositions(clock.solarDays)) {
    const body = PLANETS.find(p => p.id === pos.id)
    if (!body) continue
    const [x, y] = toScreen(pos.x, pos.y)
    if (Math.hypot(x - sx, y - sy) < Math.max(body.radius * z, 2) + slop) return body.id
  }
  return null
}

export function hoverAt(sx: number, sy: number): HoverTarget {
  const star = hitStar(sx, sy, 16)
  if (star) return { kind: 'star', ...star }
  const body = hitBody(sx, sy, 8)
  return body ? { kind: 'body', id: body } : null
}

function catchShootingStar(sx: number, sy: number, slop: number): boolean {
  const now = performance.now()
  for (let i = 0; i < shooters.length; i++) {
    const sh = shooters[i]
    const e = now - sh.born
    const hx = sh.x + sh.vx * e
    const hy = sh.y + sh.vy * e
    const tx = hx - sh.vx * 260
    const ty = hy - sh.vy * 260
    // Distance from the tap to the streak.
    const dx = tx - hx
    const dy = ty - hy
    const t = Math.max(0, Math.min(1, ((sx - hx) * dx + (sy - hy) * dy) / (dx * dx + dy * dy || 1)))
    if (Math.hypot(sx - hx - t * dx, sy - hy - t * dy) > slop) continue
    shooters.splice(i, 1)
    for (let k = 0; k < 50; k++) {
      const a = Math.random() * Math.PI * 2
      const v = 0.05 + Math.random() * 0.24
      sparks.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: 700 + Math.random() * 900 })
    }
    ;[0, 4, 7, 11, 14].forEach((semi, k) => audio.play(587.33 * Math.pow(2, semi / 12), { when: k * 0.07, pan: sx / view.w - 0.5, velocity: 0.7 }))
    sky.catchWish(randomWish())
    return true
  }
  return false
}

/** Everything a tap on the sky can mean, in priority order. */
export function tapAt(sx: number, sy: number, touch: boolean) {
  audio.ensure()
  const slop = touch ? 26 : 16
  const s = useSky.getState()

  if (catchShootingStar(sx, sy, slop + 24)) return

  if (s.placing) {
    const [wx, wy] = screenToWorld(view.cam, view.w, view.h, sx, sy)
    const c = sky.placePreset(s.placing, wx, wy, presetSize())
    if (c) {
      strum(c)
      sky.toast(`${presetById(c.preset!)?.name ?? c.name} added. Press Play to hear it.`)
    }
    return
  }

  // A tap outside an open card closes it instead of placing a star.
  if (s.panel || s.selectedBody || s.wish) {
    useSky.setState({ panel: null, selectedBody: null, wish: null })
    return
  }

  const star = hitStar(sx, sy, slop)
  if (star) {
    const k = sky.tapStar(star.cid, star.idx)
    if (k !== null) segBorn.set(`${star.cid}:${k}`, performance.now())
    const c = useSky.getState().constellations.find(x => x.id === star.cid)!
    soundStar(c, star.idx)
    return
  }

  const body = hitBody(sx, sy, slop - 6)
  if (body) {
    useSky.setState({ selectedBody: body })
    const p = PLANETS.find(x => x.id === body)
    audio.planet(p ? toneFor(p.period) : 65.41, sx / view.w - 0.5)
    return
  }

  const [wx, wy] = screenToWorld(view.cam, view.w, view.h, sx, sy)
  const { cid, idx } = sky.addStarAt(wx, wy, 0.25 + Math.random() * 0.75)
  if (idx > 0) segBorn.set(`${cid}:${current()!.seq.length - 1}`, performance.now())
  soundStar(current()!, idx)
}

export function updateHover() {
  pointer.hover = pointer.inside ? hoverAt(pointer.sx, pointer.sy) : null
}
