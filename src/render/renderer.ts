import { layerRect, layerZoom, screenToWorld, type Camera } from '../lib/camera'
import { clamp } from '../lib/rng'
import { bounds, HUES, segments, type Constellation } from '../lib/constellations'
import { instantiatePreset, type Preset } from '../lib/presets'
import { getChunk, LAYERS, type Layer } from '../lib/sky/starfield'
import { getRegionObject, REGION, type DeepSkyObject } from '../lib/sky/deepsky'
import { bodyPositions, PLANETS, SOLAR_ORIGIN, SUN } from '../lib/sky/solarSystem'
import type { RGB, SkyTint } from '../lib/sky/daycycle'
import { pulses, segBorn, shooters, sparks, type HoverTarget } from '../state/fx'
import { galaxySprite, GLOW_PAD, glowSprite, hexToRgb, milkyChunk, NEBULA_EXTENT, nebulaSprite } from './sprites'

export interface Scene {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  cam: Camera
  now: number
  tint: SkyTint
  /** Screen position of the moon and its phase (0 new → 0.5 full), or null when it has set. */
  moon: { x: number; y: number; phase: number } | null
  constellations: Constellation[]
  currentId: string | null
  playing: string[]
  solarDays: number
  ghost: { preset: Preset; sx: number; sy: number; size: number } | null
  hover: HoverTarget
  /** Scale for line widths and text, 1 on screen; larger for the poster. */
  ui: number
  twinkle: boolean
  effects: boolean
}

export const GREEK = 'αβγδεζηθικλμνξοπρστυφχψω'
export const bayer = (i: number) => (i < GREEK.length ? GREEK[i] : String(i + 1))

const rgb = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const rgbCache = new Map<string, string>()
const rgbOf = (hex: string) => {
  let v = rgbCache.get(hex)
  if (!v) rgbCache.set(hex, (v = hexToRgb(hex)))
  return v
}

const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace'
const FONT_BODY = 'Spectral, Georgia, serif'

export function renderScene(o: Scene) {
  const { ctx } = o
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  drawSky(o)
  for (const layer of LAYERS) drawLayer(o, layer)
  if (o.moon) drawMoon(o)
  drawSolar(o)
  drawConstellations(o)
  if (o.ghost) drawGhost(o)
  if (o.effects) drawEffects(o)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function drawSky({ ctx, w, h, tint }: Scene) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, rgb(tint.top))
  g.addColorStop(0.55, rgb(tint.mid))
  g.addColorStop(1, rgb(tint.bottom))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const r = Math.max(w, h) * 0.8
  const hg = ctx.createRadialGradient(w / 2, h * 1.15, 0, w / 2, h * 1.15, r)
  hg.addColorStop(0, rgb(tint.glow, tint.glowA))
  hg.addColorStop(1, rgb(tint.glow, 0))
  ctx.fillStyle = hg
  ctx.fillRect(0, 0, w, h)
}

function drawLayer(o: Scene, layer: Layer) {
  const { ctx, cam, w, h, now, tint, ui } = o
  const p = layer.p
  const z = layerZoom(cam, p)
  const s = layer.chunk
  const ox = cam.x * p
  const oy = cam.y * p
  const X = (x: number) => (x - ox) * z + w / 2
  const Y = (y: number) => (y - oy) * z + h / 2
  const r = layerRect(cam, w, h, p, 10)

  if (layer.id === 0) {
    // Milky Way glow, then dark dust lanes over it.
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.45 + 0.55 * tint.stars
    for (let cx = Math.floor((r.x0 - GLOW_PAD) / s); cx <= Math.floor((r.x1 + GLOW_PAD) / s); cx++) {
      for (let cy = Math.floor((r.y0 - GLOW_PAD) / s); cy <= Math.floor((r.y1 + GLOW_PAD) / s); cy++) {
        const chunk = getChunk(layer, cx, cy)
        const img = milkyChunk(`${cx}:${cy}`, chunk, cx * s, cy * s, s)
        if (!img) continue
        const span = (s + GLOW_PAD * 2) * z
        ctx.drawImage(img, X(cx * s - GLOW_PAD), Y(cy * s - GLOW_PAD), span, span)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    const dark = glowSprite('4,6,18')
    for (let cx = Math.floor((r.x0 - 300) / s); cx <= Math.floor((r.x1 + 300) / s); cx++) {
      for (let cy = Math.floor((r.y0 - 300) / s); cy <= Math.floor((r.y1 + 300) / s); cy++) {
        for (const g of getChunk(layer, cx, cy).glow) {
          if (g.kind !== 'dust') continue
          const rr = g.r * z
          ctx.globalAlpha = g.a * (0.4 + 0.6 * tint.stars)
          ctx.drawImage(dark, X(g.x) - rr, Y(g.y) - rr, rr * 2, rr * 2)
        }
      }
    }
    drawDeep(o, 'galaxy', p)
  } else if (layer.id === 1) {
    drawDeep(o, 'nebula', p)
  } else {
    drawDeep(o, 'cluster', p)
  }

  // Background stars, brightest first; when zoomed out only the brightest share is drawn.
  const keep = clamp(z * z * 1.1, 0.03, 1)
  const sizeK = clamp(Math.sqrt(z), 0.6, 2.4) * ui
  ctx.globalCompositeOperation = 'source-over'
  for (let cx = Math.floor(r.x0 / s); cx <= Math.floor(r.x1 / s); cx++) {
    for (let cy = Math.floor(r.y0 / s); cy <= Math.floor(r.y1 / s); cy++) {
      const stars = getChunk(layer, cx, cy).stars
      const n = Math.ceil(stars.length * keep)
      for (let i = 0; i < n; i++) {
        const st = stars[i]
        const sx = X(st.x)
        const sy = Y(st.y)
        if (sx < -6 || sx > w + 6 || sy < -6 || sy > h + 6) continue
        const tw = o.twinkle ? 0.65 + 0.35 * Math.sin(now * st.tw + st.ph) : 0.85
        const a = (0.25 + 0.75 * st.b) * tw * tint.stars
        if (a < 0.02) continue
        const size = st.size * sizeK
        ctx.globalAlpha = a
        ctx.fillStyle = st.color
        if (size < 1.6) ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
        else {
          ctx.beginPath()
          ctx.arc(sx, sy, size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        if (st.b > 0.88 && layer.id > 0) {
          ctx.globalAlpha = a * 0.45
          const gs = size * 5
          ctx.drawImage(glowSprite(rgbOf(st.color)), sx - gs, sy - gs, gs * 2, gs * 2)
        }
      }
    }
  }
}

const KIND_LABEL = { emission: 'emission nebula', reflection: 'reflection nebula', planetary: 'planetary nebula' }

function drawDeep(o: Scene, type: DeepSkyObject['type'], p: number) {
  const { ctx, cam, w, h, tint, ui } = o
  const z = layerZoom(cam, p)
  const r = layerRect(cam, w, h, p, 0)
  const pad = 1200
  for (let rx = Math.floor((r.x0 - pad) / REGION); rx <= Math.floor((r.x1 + pad) / REGION); rx++) {
    for (let ry = Math.floor((r.y0 - pad) / REGION); ry <= Math.floor((r.y1 + pad) / REGION); ry++) {
      const obj = getRegionObject(type, rx, ry)
      if (!obj) continue
      const sx = (obj.x - cam.x * p) * z + w / 2
      const sy = (obj.y - cam.y * p) * z + h / 2
      const R = obj.r * z
      const E = obj.type === 'nebula' ? R * NEBULA_EXTENT : R * 1.2
      if (sx + E < 0 || sx - E > w || sy + E < 0 || sy - E > h) continue
      let labelY = sy + R + 16 * ui
      if (obj.type === 'galaxy') {
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(obj.rot)
        ctx.scale(1, obj.tilt)
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.8 * (0.35 + 0.65 * tint.stars)
        ctx.drawImage(galaxySprite(obj), -R, -R, R * 2, R * 2)
        ctx.restore()
      } else if (obj.type === 'nebula') {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.95 * (0.35 + 0.65 * tint.stars)
        ctx.drawImage(nebulaSprite(obj), sx - E, sy - E, E * 2, E * 2)
        labelY = sy + R * 0.9 + 16 * ui
      } else {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.25 * tint.stars
        ctx.drawImage(glowSprite('170,190,255'), sx - R * 1.4, sy - R * 1.4, R * 2.8, R * 2.8)
        ctx.globalCompositeOperation = 'source-over'
        if (R > 6) {
          const k = clamp(Math.sqrt(z), 0.6, 2) * ui
          ctx.fillStyle = '#e4ebff'
          for (const st of obj.stars) {
            ctx.globalAlpha = st.b * tint.stars
            const size = (0.6 + st.b * 1.3) * k
            ctx.fillRect(sx + st.dx * z - size / 2, sy + st.dy * z - size / 2, size, size)
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      if (R > 55) {
        const kind = obj.type === 'nebula' ? KIND_LABEL[obj.kind] : obj.type === 'galaxy' ? 'spiral galaxy' : 'open cluster'
        ctx.globalAlpha = clamp((R - 55) / 60, 0, 1) * 0.6
        ctx.fillStyle = '#dfe4ff'
        ctx.textAlign = 'center'
        ctx.font = `italic ${13 * ui}px ${FONT_BODY}`
        ctx.fillText(obj.name, sx, labelY)
        ctx.font = `${9.5 * ui}px ${FONT_MONO}`
        ctx.fillText(kind.toUpperCase(), sx, labelY + 14 * ui)
        ctx.textAlign = 'start'
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawMoon(o: Scene) {
  const { ctx, ui, tint } = o
  const { x, y, phase } = o.moon!
  const r = 20 * ui
  const vis = 0.45 + 0.55 * tint.stars
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.35 * vis * (0.2 + 0.8 * Math.sin(Math.PI * phase))
  ctx.drawImage(glowSprite('230,225,200'), x - r * 5, y - r * 5, r * 10, r * 10)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 0.85 * vis
  ctx.fillStyle = '#1c2140'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  // Lit part: a half disc on the sunward side, closed by the terminator ellipse.
  const k = Math.cos(phase * Math.PI * 2)
  ctx.beginPath()
  if (phase < 0.5) ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false)
  else ctx.arc(x, y, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  const start = phase < 0.5 ? Math.PI / 2 : -Math.PI / 2
  ctx.ellipse(x, y, Math.abs(k) * r, r, 0, start, start + Math.PI, k > 0)
  ctx.closePath()
  ctx.save()
  ctx.clip()
  ctx.globalAlpha = vis
  ctx.fillStyle = '#f1ead8'
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.fillStyle = 'rgba(150,140,120,0.35)'
  for (const [dx, dy, cr] of [[-0.3, -0.25, 0.22], [0.25, 0.2, 0.16], [-0.05, 0.45, 0.12], [0.35, -0.35, 0.1]]) {
    ctx.beginPath()
    ctx.arc(x + dx * r, y + dy * r, cr * r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

function drawSolar(o: Scene) {
  const { ctx, cam, w, h, ui, hover } = o
  const z = cam.zoom
  const sx = (SOLAR_ORIGIN.x - cam.x) * z + w / 2
  const sy = (SOLAR_ORIGIN.y - cam.y) * z + h / 2
  const extent = (PLANETS[PLANETS.length - 1].orbit + 60) * z
  if (sx + extent < 0 || sx - extent > w || sy + extent < 0 || sy - extent > h) return

  ctx.lineWidth = ui
  for (const p of PLANETS) {
    const R = p.orbit * z
    if (R < 5) continue
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(243,234,214,0.09)'
    ctx.beginPath()
    ctx.arc(sx, sy, R, 0, Math.PI * 2)
    ctx.stroke()
  }

  const sr = Math.max(SUN.radius * z, 2.5 * ui)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.9
  ctx.drawImage(glowSprite('255,190,100'), sx - sr * 4, sy - sr * 4, sr * 8, sr * 8)
  ctx.globalCompositeOperation = 'source-over'
  const sg = ctx.createRadialGradient(sx - sr * 0.2, sy - sr * 0.2, 0, sx, sy, sr)
  sg.addColorStop(0, '#fffbe8')
  sg.addColorStop(0.6, '#ffd27a')
  sg.addColorStop(1, '#f39a3c')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.arc(sx, sy, sr, 0, Math.PI * 2)
  ctx.fill()
  if (hover?.kind === 'body' && hover.id === 'sun') ring(ctx, sx, sy, sr + 6 * ui, ui)

  for (const pos of bodyPositions(o.solarDays)) {
    const isMoon = pos.id === 'moon'
    if (isMoon && z < 1.1) continue
    const body = isMoon ? null : PLANETS.find(p => p.id === pos.id)!
    const px = (pos.x - cam.x) * z + w / 2
    const py = (pos.y - cam.y) * z + h / 2
    const pr = Math.max((body ? body.radius : 1.6) * z, (isMoon ? 0.8 : 1.6) * ui)
    if (px < -pr * 3 || px > w + pr * 3 || py < -pr * 3 || py > h + pr * 3) continue
    ctx.globalAlpha = 1
    ctx.fillStyle = body ? body.color : '#cfcabd'
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fill()
    // Night side away from the Sun.
    const a = Math.atan2(sy - py, sx - px)
    const shade = ctx.createLinearGradient(px + Math.cos(a) * pr, py + Math.sin(a) * pr, px - Math.cos(a) * pr, py - Math.sin(a) * pr)
    shade.addColorStop(0.35, 'rgba(4,6,18,0)')
    shade.addColorStop(1, 'rgba(4,6,18,0.8)')
    ctx.fillStyle = shade
    ctx.fill()
    if (body?.ring) {
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-0.4)
      ctx.strokeStyle = 'rgba(234,214,166,0.7)'
      ctx.lineWidth = Math.max(ui, pr * 0.28)
      ctx.beginPath()
      ctx.ellipse(0, 0, pr * 2.1, pr * 0.7, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    if (body && hover?.kind === 'body' && hover.id === body.id) ring(ctx, px, py, pr + 6 * ui, ui)
    if (body && z > 0.45) {
      ctx.globalAlpha = clamp((z - 0.45) * 3, 0, 0.7)
      ctx.fillStyle = '#e8e2d2'
      ctx.font = `${10 * ui}px ${FONT_MONO}`
      ctx.fillText(body.name.toUpperCase(), px + pr + 6 * ui, py + 3.5 * ui)
    }
  }

  if (z < 0.5) {
    ctx.globalAlpha = clamp((0.5 - z) * 6, 0, 0.75)
    ctx.fillStyle = '#ffe2a8'
    ctx.textAlign = 'center'
    ctx.font = `italic ${13 * ui}px ${FONT_BODY}`
    ctx.fillText('The Solar System', sx, sy + Math.max(sr * 2, 14 * ui) + 12 * ui)
    ctx.textAlign = 'start'
  }
  ctx.globalAlpha = 1
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ui: number) {
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = '#d6b26e'
  ctx.lineWidth = 1.2 * ui
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
}

function drawConstellations(o: Scene) {
  const { ctx, cam, w, h, now, ui, hover } = o
  const z = cam.zoom
  const view = layerRect(cam, w, h, 1, 80)
  const starK = clamp(Math.pow(z, 0.35), 0.6, 1.7) * ui
  ctx.lineCap = 'round'
  for (const c of o.constellations) {
    if (!c.stars.length) continue
    const b = bounds(c)
    if (b.x1 < view.x0 || b.x0 > view.x1 || b.y1 < view.y0 || b.y0 > view.y1) continue
    const tone = HUES[c.hue % HUES.length]
    const cur = c.id === o.currentId
    const playing = o.playing.includes(c.id)
    const X = (x: number) => (x - cam.x) * z + w / 2
    const Y = (y: number) => (y - cam.y) * z + h / 2

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.lineWidth = (cur ? 1.4 : 1.1) * ui
    ctx.strokeStyle = `rgba(${tone},${playing ? 0.72 : cur ? 0.55 : 0.26})`
    for (const [ai, bi, k] of segments(c)) {
      const born = segBorn.get(`${c.id}:${k}`) ?? 0
      const p = o.twinkle ? clamp((now - born) / 450, 0, 1) : 1
      const ax = X(c.stars[ai].x)
      const ay = Y(c.stars[ai].y)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax + (X(c.stars[bi].x) - ax) * p, ay + (Y(c.stars[bi].y) - ay) * p)
      ctx.stroke()
    }

    c.stars.forEach((s, i) => {
      const x = X(s.x)
      const y = Y(s.y)
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) return
      const rad = (1.5 + s.b * 2.6) * starK
      const pk = pulses.get(`${c.id}:${i}`)
      const pa = pk !== undefined && now >= pk ? Math.max(0, 1 - (now - pk) / 900) : 0
      const hovered = hover?.kind === 'star' && hover.cid === c.id && hover.idx === i
      const gs = rad * 7 * (1 + pa * 0.8)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, (cur ? 0.5 : 0.28) + pa * 0.5 + (hovered ? 0.3 : 0))
      ctx.drawImage(glowSprite(tone), x - gs, y - gs, gs * 2, gs * 2)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = cur ? 1 : 0.75
      ctx.fillStyle = '#f3ead6'
      ctx.beginPath()
      ctx.arc(x, y, rad * (1 + pa * 0.5), 0, Math.PI * 2)
      ctx.fill()
      if (pa > 0 && o.twinkle) {
        ctx.globalAlpha = pa * 0.7
        ctx.strokeStyle = `rgba(${tone},1)`
        ctx.lineWidth = ui
        ctx.beginPath()
        ctx.arc(x, y, rad + (1 - pa) * 30 * ui, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (cur && z > 0.3 && c.stars.length > 1) {
        ctx.globalAlpha = 0.75
        ctx.fillStyle = `rgba(${tone},1)`
        ctx.font = `${10.5 * ui}px ${FONT_MONO}`
        ctx.fillText(bayer(i), x + rad + 4 * ui, y - rad - 2 * ui)
      }
    })

    if (c.stars.length > 1 && Math.max(b.x1 - b.x0, b.y1 - b.y0) * z > 50) {
      ctx.globalAlpha = cur ? 0.9 : 0.5
      ctx.fillStyle = `rgba(${tone},1)`
      ctx.textAlign = 'center'
      ctx.font = `italic ${(cur ? 15 : 13) * ui}px ${FONT_BODY}`
      ctx.fillText(c.name, X((b.x0 + b.x1) / 2), Y(b.y1) + 28 * ui)
      ctx.textAlign = 'start'
    }
  }
  ctx.globalAlpha = 1
}

function drawGhost(o: Scene) {
  const { ctx, cam, w, h, ui } = o
  const g = o.ghost!
  const [wx, wy] = screenToWorld(cam, w, h, g.sx, g.sy)
  const c = instantiatePreset(g.preset, wx, wy, g.size, 0)
  const X = (x: number) => (x - cam.x) * cam.zoom + w / 2
  const Y = (y: number) => (y - cam.y) * cam.zoom + h / 2
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = '#d6b26e'
  ctx.lineWidth = ui
  ctx.setLineDash([4 * ui, 5 * ui])
  for (const [a, b] of segments(c)) {
    ctx.beginPath()
    ctx.moveTo(X(c.stars[a].x), Y(c.stars[a].y))
    ctx.lineTo(X(c.stars[b].x), Y(c.stars[b].y))
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.fillStyle = '#f3ead6'
  for (const s of c.stars) {
    ctx.beginPath()
    ctx.arc(X(s.x), Y(s.y), (1.5 + s.b * 2.2) * ui, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawEffects(o: Scene) {
  const { ctx, now, ui } = o
  for (let i = shooters.length - 1; i >= 0; i--) {
    const sh = shooters[i]
    const e = now - sh.born
    const f = e / sh.life
    if (f >= 1) {
      shooters.splice(i, 1)
      continue
    }
    const hx = sh.x + sh.vx * e
    const hy = sh.y + sh.vy * e
    const tx = hx - sh.vx * 260
    const ty = hy - sh.vy * 260
    const a = Math.sin(Math.PI * f)
    const g = ctx.createLinearGradient(hx, hy, tx, ty)
    g.addColorStop(0, `rgba(255,246,225,${a})`)
    g.addColorStop(1, 'rgba(255,246,225,0)')
    ctx.globalAlpha = 1
    ctx.strokeStyle = g
    ctx.lineWidth = 2 * ui
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a
    ctx.drawImage(glowSprite('255,240,210'), hx - 16, hy - 16, 32, 32)
    ctx.globalCompositeOperation = 'source-over'
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]
    const e = now - p.born
    const f = e / p.life
    if (f >= 1) {
      sparks.splice(i, 1)
      continue
    }
    ctx.globalAlpha = 1 - f
    ctx.fillStyle = '#d6b26e'
    ctx.fillRect(p.x + p.vx * e - 1, p.y + p.vy * e + 0.00003 * e * e - 1, 2, 2)
  }
  ctx.globalAlpha = 1
}
