import { useEffect, useRef } from 'react'
import { zoomAt } from '../lib/camera'
import { isTap } from '../lib/gesture'
import { presetById } from '../lib/presets'
import { moonPhase } from '../lib/sky/moon'
import { CYCLE_MS, moonPath, nightSky, skyAt } from '../lib/sky/daycycle'
import { SIM_DAYS_PER_SECOND } from '../lib/sky/solarSystem'
import { renderScene } from '../render/renderer'
import { clock, pointer, reduceMotion, shooters } from '../state/fx'
import { presetSize, tapAt, updateHover } from '../state/interactions'
import { useSky } from '../state/store'
import { notifyView, setCam, stepFlight, view } from '../state/view'

interface Press {
  x: number
  y: number
  startX: number
  startY: number
  t: number
}

const today = moonPhase(new Date())

function spawnShootingStar(now: number) {
  const { w, h } = view
  const fromLeft = Math.random() < 0.5
  const x = w * (fromLeft ? 0.05 + Math.random() * 0.5 : 0.45 + Math.random() * 0.5)
  const y = h * (0.06 + Math.random() * 0.34)
  const ang = (fromLeft ? 0.42 : Math.PI - 0.42) + (Math.random() - 0.5) * 0.3
  const sp = (w + h) * 0.00022 * (0.85 + Math.random() * 0.4)
  shooters.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, born: now, life: 2300 + Math.random() * 900 })
  clock.nextShot = now + 9000 + Math.random() * 14000
}

export function SkyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let dpr = 1
    let raf = 0
    let last = performance.now()

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      view.w = window.innerWidth
      view.h = window.innerHeight
      canvas.width = Math.round(view.w * dpr)
      canvas.height = Math.round(view.h * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // ---- input: one finger pans, two pinch, a short still press is a tap ----
    const presses = new Map<number, Press>()
    let pinch: { dist: number; zoom: number } | null = null
    let dragging = false
    let track: { x: number; y: number; t: number }[] = []

    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      presses.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, t: performance.now() })
      view.vel = { x: 0, y: 0 }
      view.flight = null
      if (presses.size === 2) {
        const [a, b] = [...presses.values()]
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.cam.zoom }
        dragging = true
      } else {
        dragging = false
        track = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
      }
    }

    const move = (e: PointerEvent) => {
      pointer.sx = e.clientX
      pointer.sy = e.clientY
      pointer.inside = true
      const p = presses.get(e.pointerId)
      if (!p) {
        if (e.pointerType === 'mouse') {
          updateHover()
          canvas.style.cursor = pointer.hover ? 'pointer' : useSky.getState().placing ? 'copy' : 'crosshair'
        }
        return
      }
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (presses.size >= 2 && pinch) {
        const [a, b] = [...presses.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const cx = (a.x + b.x) / 2
        const cy = (a.y + b.y) / 2
        const target = (pinch.zoom * dist) / pinch.dist
        const next = zoomAt(view.cam, view.w, view.h, cx, cy, target / view.cam.zoom)
        // Pan with the midpoint too.
        setCam({ ...next, x: next.x - dx / 2 / next.zoom, y: next.y - dy / 2 / next.zoom })
        return
      }
      if (!dragging && !isTap(p.x - p.startX, p.y - p.startY, 0)) dragging = true
      if (dragging) {
        setCam({ ...view.cam, x: view.cam.x - dx / view.cam.zoom, y: view.cam.y - dy / view.cam.zoom })
        const now = performance.now()
        track.push({ x: e.clientX, y: e.clientY, t: now })
        track = track.filter(s => now - s.t < 90)
        canvas.style.cursor = 'grabbing'
      }
    }

    const up = (e: PointerEvent) => {
      const p = presses.get(e.pointerId)
      presses.delete(e.pointerId)
      if (!p) return
      if (presses.size === 1) {
        // Back from a pinch to one finger: `dragging` stays true, so it pans and never taps.
        pinch = null
        return
      }
      if (pinch) {
        pinch = null
        return
      }
      if (!dragging && isTap(p.x - p.startX, p.y - p.startY, performance.now() - p.t)) {
        tapAt(e.clientX, e.clientY, e.pointerType !== 'mouse')
      } else if (dragging && !reduceMotion && track.length > 1) {
        const a = track[0]
        const b = track[track.length - 1]
        const dt = Math.max(16, b.t - a.t)
        view.vel = { x: -(b.x - a.x) / dt / view.cam.zoom, y: -(b.y - a.y) / dt / view.cam.zoom }
      }
      dragging = false
      canvas.style.cursor = 'crosshair'
    }

    const leave = () => {
      pointer.inside = false
      pointer.hover = null
    }

    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const k = e.ctrlKey ? 0.01 : 0.0015
      const unit = e.deltaMode === 1 ? 16 : 1
      setCam(zoomAt(view.cam, view.w, view.h, e.clientX, e.clientY, Math.exp(-e.deltaY * unit * k)))
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('wheel', wheel, { passive: false })

    // ---- the frame loop ----
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(64, now - last))
      last = now
      const s = useSky.getState()
      // Draw in CSS pixels at device resolution.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!stepFlight(now) && (view.vel.x || view.vel.y)) {
        view.cam = { ...view.cam, x: view.cam.x + view.vel.x * dt, y: view.cam.y + view.vel.y * dt }
        const decay = Math.pow(0.93, dt / 16)
        view.vel = { x: view.vel.x * decay, y: view.vel.y * decay }
        if (Math.hypot(view.vel.x, view.vel.y) * view.cam.zoom < 0.01) view.vel = { x: 0, y: 0 }
      }
      notifyView(now)

      clock.solarDays += (dt / 1000) * SIM_DAYS_PER_SECOND
      const cycleT = ((now - clock.cycleStart) % CYCLE_MS) / CYCLE_MS
      const night = s.settings.timeMode === 'night'
      const tint = night ? nightSky() : skyAt(cycleT)
      const mp = night ? { x: 0.84, y: 0.2 } : moonPath(cycleT)

      if (now > clock.nextShot && shooters.length < 2 && document.visibilityState === 'visible') spawnShootingStar(now)

      const placing = s.placing ? presetById(s.placing) : undefined
      renderScene({
        ctx,
        w: view.w,
        h: view.h,
        cam: view.cam,
        now,
        tint,
        moon: mp ? { x: mp.x * view.w, y: mp.y * view.h, phase: today.phase } : null,
        constellations: s.constellations,
        currentId: s.currentId,
        playing: s.playing,
        solarDays: clock.solarDays,
        ghost: placing && pointer.inside ? { preset: placing, sx: pointer.sx, sy: pointer.sy, size: presetSize() } : null,
        hover: pointer.hover,
        ui: 1,
        twinkle: !reduceMotion,
        effects: true,
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [])

  return <canvas ref={ref} className="sky" aria-label="The night sky. Tap to place a star and hear its note; drag to explore." />
}
