import { clamp } from './rng'

/** `x`/`y` is the world point at the centre of the screen. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.12
export const MAX_ZOOM = 24

/**
 * Parallax layers move and scale less than the world: a layer with factor `p`
 * sees the camera at `cam * p` and zoom `zoom ** p`.
 */
export function layerZoom(cam: Camera, p = 1): number {
  return p === 1 ? cam.zoom : Math.pow(cam.zoom, p)
}

export function worldToScreen(cam: Camera, w: number, h: number, wx: number, wy: number, p = 1): [number, number] {
  const z = layerZoom(cam, p)
  return [(wx - cam.x * p) * z + w / 2, (wy - cam.y * p) * z + h / 2]
}

export function screenToWorld(cam: Camera, w: number, h: number, sx: number, sy: number): [number, number] {
  return [(sx - w / 2) / cam.zoom + cam.x, (sy - h / 2) / cam.zoom + cam.y]
}

/** Zoom by `factor` around a screen point, keeping the world point under it fixed. */
export function zoomAt(cam: Camera, w: number, h: number, sx: number, sy: number, factor: number): Camera {
  const [wx, wy] = screenToWorld(cam, w, h, sx, sy)
  const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  return { zoom, x: wx - (sx - w / 2) / zoom, y: wy - (sy - h / 2) / zoom }
}

/** The rectangle of layer coordinates visible on screen, with an optional margin in screen px. */
export function layerRect(cam: Camera, w: number, h: number, p = 1, margin = 0) {
  const z = layerZoom(cam, p)
  const cx = cam.x * p
  const cy = cam.y * p
  const hw = (w / 2 + margin) / z
  const hh = (h / 2 + margin) / z
  return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }
}
