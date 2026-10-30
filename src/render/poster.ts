import * as THREE from 'three'
import { BODIES, BODY_IDS } from '../lib/space/bodies'
import { moonPhase } from '../lib/space/ephemeris'
import { KM_PER_LY, KM_PER_PC } from '../lib/space/units'
import { dist, len } from '../lib/space/vec'
import { resolveStar } from '../lib/space/starId'
import { fmtDistance } from '../lib/format'
import { cam, project, screen } from '../state/camera'
import { catalogState, starMagFrom, starName } from '../state/catalog'
import { clock, positions } from '../state/clock'
import { active, useSky } from '../state/store'
import { posterLayout } from './posterLayout'

/** The renderer, scene and camera, kept by the canvas so the poster can borrow them. */
export const three: { gl: THREE.WebGLRenderer | null; scene: THREE.Scene | null; camera: THREE.PerspectiveCamera | null } = { gl: null, scene: null, camera: null }

const INK = '#0a0f24'
const BRASS = '#d6b26e'
const STARLIGHT = '#f3ead6'
const HAZE = '#a3acd0'

/** Render the current view once at poster size and copy it out before the browser shows the frame. */
function captureSky(w: number, h: number): HTMLCanvasElement {
  const { gl, scene, camera } = three
  if (!gl || !scene || !camera) throw new Error('no renderer')
  const size = gl.getSize(new THREE.Vector2())
  const prevRatio = gl.getPixelRatio()
  const prevAspect = camera.aspect
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  try {
    gl.setPixelRatio(1)
    gl.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    gl.render(scene, camera)
    out.getContext('2d')!.drawImage(gl.domElement, 0, 0, w, h)
  } finally {
    gl.setPixelRatio(prevRatio)
    gl.setSize(size.x, size.y, false)
    camera.aspect = prevAspect
    camera.updateProjectionMatrix()
  }
  return out
}

/** Labels for the poster: planets, your constellations and the brightest named stars, projected at poster size. */
function posterLabels(w: number, h: number): { x: number; y: number; text: string; brass: boolean }[] {
  const saved = { ...screen }
  screen.w = w
  screen.h = h
  const out: { x: number; y: number; text: string; brass: boolean }[] = []
  try {
    const pos = positions()
    const discs: { x: number; y: number; r: number; z: number }[] = []
    for (const id of BODY_IDS) {
      const p = project(pos[id])
      if (p.behind) continue
      const r = BODIES[id].radiusKm * p.pxPerKm
      if (r > 2) discs.push({ x: p.x, y: p.y, r, z: p.z })
      out.push({ x: p.x + Math.max(r, 6) + 10, y: p.y, text: BODIES[id].name, brass: false })
    }
    // Stars behind a planet's disc keep their names to themselves.
    const hidden = (x: number, y: number) => discs.some(d => Math.hypot(x - d.x, y - d.y) < d.r)
    const { catalog } = catalogState()
    if (catalog) {
      for (let i = 0; i < Math.min(catalog.count, 400); i++) {
        if (starMagFrom(i, cam.pos) > 1.6 || !catalogState().names[String(catalog.hyg[i])]?.[0]) continue
        const p = project([catalog.pos[i * 3] * KM_PER_PC, catalog.pos[i * 3 + 1] * KM_PER_PC, catalog.pos[i * 3 + 2] * KM_PER_PC])
        if (!p.behind && !hidden(p.x, p.y)) out.push({ x: p.x + 14, y: p.y, text: starName(i), brass: false })
      }
    }
    for (const c of useSky.getState().constellations) {
      const pts = c.stars.map(s => resolveStar(s, catalog)?.posKm).filter((p): p is [number, number, number] => !!p)
      if (!pts.length) continue
      const mid = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0])
      const p = project(mid as [number, number, number])
      if (!p.behind) out.push({ x: p.x, y: p.y, text: c.name, brass: true })
    }
  } finally {
    screen.w = saved.w
    screen.h = saved.h
  }
  return out.filter(l => l.x > 0 && l.x < w - 40 && l.y > 20 && l.y < h - 20)
}

function moonGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(243,234,214,0.12)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  // The lit part: a half disc plus an ellipse that grows and shrinks with the phase.
  const waxing = phase < 0.5
  const k = Math.cos(phase * Math.PI * 2)
  ctx.fillStyle = STARLIGHT
  ctx.beginPath()
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing)
  ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing)
  ctx.fill()
  ctx.restore()
}

/** Save the current view as a 2400 × 3300 star chart. */
export async function exportPoster(): Promise<void> {
  const W = 2400
  const H = 3300
  const L = posterLayout(W, H)
  const sky = captureSky(L.view.w, L.view.h)
  const labels = posterLabels(L.view.w, L.view.h)
  await document.fonts?.ready

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(sky, L.view.x, L.view.y)

  ctx.textBaseline = 'middle'
  ctx.font = '500 30px "IBM Plex Mono", monospace'
  for (const l of labels) {
    ctx.fillStyle = l.brass ? BRASS : 'rgba(243,234,214,0.85)'
    ctx.fillText(l.text, L.view.x + l.x, L.view.y + l.y)
  }

  ctx.strokeStyle = BRASS
  ctx.lineWidth = 3
  ctx.strokeRect(L.view.x - 18, L.view.y - 18, L.view.w + 36, L.view.h + 36)
  ctx.lineWidth = 1
  ctx.strokeRect(L.view.x - 30, L.view.y - 30, L.view.w + 60, L.view.h + 60)

  const s = useSky.getState()
  const sel = s.selected
  const title = active(s)?.name ?? (sel?.kind === 'body' ? BODIES[sel.id].name : 'Starloom')
  const date = clock.now()
  const fromSun = len(cam.pos)
  const where = fromSun < KM_PER_LY * 0.05 ? `${fmtDistance(dist(cam.pos, positions().earth))} from Earth` : `${fmtDistance(fromSun)} from the Sun`
  ctx.textAlign = 'center'
  ctx.fillStyle = STARLIGHT
  ctx.font = '400 150px Italiana, serif'
  ctx.fillText(title, W / 2, L.title.y + 110, L.title.w)
  ctx.fillStyle = HAZE
  ctx.font = 'italic 300 46px Spectral, serif'
  const line = `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · ${where}`
  ctx.fillText(line, W / 2, L.title.y + 220, L.title.w - 160)
  // Tonight's moon, just after the date.
  moonGlyph(ctx, W / 2 + Math.min(ctx.measureText(line).width, L.title.w - 160) / 2 + 50, L.title.y + 220, 22, moonPhase(date))
  ctx.fillStyle = BRASS
  ctx.font = '500 26px "IBM Plex Mono", monospace'
  ctx.fillText('STARLOOM · MAROUNCODER.GITHUB.IO/STARLOOM', W / 2, L.footer.y + L.footer.h / 2)

  const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'))
  if (!blob) throw new Error('no image')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `starloom-${date.toISOString().slice(0, 10)}.png`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
