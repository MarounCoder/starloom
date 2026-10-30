import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { rayDir } from '../lib/space/flight'
import { isTap } from '../lib/gesture'
import { cam } from '../state/camera'
import { exitOrbit, flight, pending, tapHandler } from '../state/flight'


const typing = (e: Event) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/** Mouse, touch and keyboard → the flight input buffer. */
export function FlightInput() {
  const el = useThree(s => s.gl.domElement)

  useEffect(() => {
    const pointers = new Map<number, { x: number; y: number }>()
    let down: { x: number; y: number; t: number; id: number } | null = null
    let pinch = 0
    let moved = false

    const radPerPx = () => ((cam.fovDeg * Math.PI) / 180) / el.clientHeight
    const ray = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      return rayDir(cam.yaw, cam.pitch, cam.fovDeg, r.width / r.height, ((x - r.left) / r.width) * 2 - 1, 1 - ((y - r.top) / r.height) * 2)
    }
    const look = (dx: number, dy: number) => {
      const k = radPerPx()
      // Grab the sky: in free flight the view follows the finger; in orbit the body turns with it.
      const s = flight.orbit ? -1.6 : 1
      pending.look = [pending.look[0] + dx * k * s, pending.look[1] + dy * k * s]
      pending.any = true
    }

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }
        moved = false
      } else {
        down = null
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const cur = { x: e.clientX, y: e.clientY }
      pointers.set(e.pointerId, cur)
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch > 0 && d > 0) {
          pending.wheel += Math.log(d / pinch) / 0.15
          pending.wheelDir = ray((a.x + b.x) / 2, (a.y + b.y) / 2)
          pending.any = true
        }
        pinch = d
        return
      }
      if (down && !isTap(cur.x - down.x, cur.y - down.y, 0)) moved = true
      if (moved) look(cur.x - prev.x, cur.y - prev.y)
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (down && down.id === e.pointerId && !moved && isTap(e.clientX - down.x, e.clientY - down.y, performance.now() - down.t)) {
        const r = el.getBoundingClientRect()
        tapHandler.current?.(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch')
      }
      if (pointers.size < 2) pinch = 0
      if (!pointers.size) down = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      pending.wheel += Math.max(-4, Math.min(4, -px / 100))
      pending.wheelDir = ray(e.clientX, e.clientY)
      pending.any = true
    }
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.type === 'keydown' && e.code === 'Escape' && flight.orbit) exitOrbit()
      const flightKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']
      if (!flightKeys.includes(e.code)) return
      if (e.type === 'keydown') {
        pending.keys.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      } else pending.keys.delete(e.code)
    }
    const onBlur = () => pending.keys.clear()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [el])

  return null
}
