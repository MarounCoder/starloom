import { useSyncExternalStore } from 'react'
import { clamp, lerp } from '../lib/rng'
import { MAX_ZOOM, MIN_ZOOM, zoomAt, type Camera } from '../lib/camera'

export const HOME: Camera = { x: 0, y: 0, zoom: 1 }
const KEY = 'starloom:view:v1'

function loadCam(): Camera {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (c && [c.x, c.y, c.zoom].every(Number.isFinite)) return { x: c.x, y: c.y, zoom: clamp(c.zoom, MIN_ZOOM, MAX_ZOOM) }
  } catch {
    /* storage unavailable */
  }
  return { ...HOME }
}

interface Flight {
  from: Camera
  to: Camera
  mid: number
  start: number
  dur: number
}

/**
 * The camera lives outside React: it changes every frame while panning,
 * and only the HUD needs a throttled copy of it.
 */
export const view = {
  cam: loadCam(),
  w: typeof window === 'undefined' ? 1280 : window.innerWidth,
  h: typeof window === 'undefined' ? 800 : window.innerHeight,
  /** Inertia in world units per ms. */
  vel: { x: 0, y: 0 },
  flight: null as Flight | null,
}

const listeners = new Set<() => void>()
let snapshot: Camera = { ...view.cam }
let lastNotify = 0
let saveTimer = 0

export function notifyView(now: number, force = false) {
  if (!force && now - lastNotify < 120) return
  if (snapshot.x === view.cam.x && snapshot.y === view.cam.y && snapshot.zoom === view.cam.zoom) return
  lastNotify = now
  snapshot = { ...view.cam }
  listeners.forEach(fn => fn())
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(view.cam))
    } catch {
      /* storage unavailable */
    }
  }, 600)
}

export function useCamera(): Camera {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => snapshot,
  )
}

export function setCam(c: Camera) {
  view.cam = { x: c.x, y: c.y, zoom: clamp(c.zoom, MIN_ZOOM, MAX_ZOOM) }
  view.flight = null
  view.vel = { x: 0, y: 0 }
}

/** Glide to a camera, pulling back mid-flight when the trip is long so you can see where you are going. */
export function flyTo(to: Camera, reduce = false) {
  if (reduce) {
    setCam(to)
    return
  }
  const from = { ...view.cam }
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const fit = Math.max(view.w, view.h) / (dist * 1.4 || 1)
  const mid = clamp(Math.min(from.zoom, to.zoom, fit), MIN_ZOOM, MAX_ZOOM)
  const dur = clamp(900 + Math.log2(1 + dist / 500) * 350, 900, 2600)
  view.vel = { x: 0, y: 0 }
  view.flight = { from, to: { ...to, zoom: clamp(to.zoom, MIN_ZOOM, MAX_ZOOM) }, mid, start: performance.now(), dur }
}

/** Zoom around the centre of the screen with a short glide. */
export function zoomBy(factor: number, reduce = false) {
  flyTo(zoomAt(view.cam, view.w, view.h, view.w / 2, view.h / 2, factor), reduce)
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Advance an active flight; returns false when none is running. */
export function stepFlight(now: number): boolean {
  const f = view.flight
  if (!f) return false
  const t = clamp((now - f.start) / f.dur, 0, 1)
  const e = ease(t)
  const lz =
    t < 0.5
      ? lerp(Math.log(f.from.zoom), Math.log(f.mid), ease(t * 2))
      : lerp(Math.log(f.mid), Math.log(f.to.zoom), ease(t * 2 - 1))
  view.cam = { x: lerp(f.from.x, f.to.x, e), y: lerp(f.from.y, f.to.y, e), zoom: Math.exp(lz) }
  if (t >= 1) view.flight = null
  return true
}
