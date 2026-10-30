import { bounds, type Constellation } from '../lib/constellations'
import { layerRect } from '../lib/camera'
import { fmt, niceStep, sectorName } from '../lib/format'
import { moonPhase } from '../lib/sky/moon'
import { nightSky } from '../lib/sky/daycycle'
import { renderScene } from './renderer'

const W = 2400
const H = 3300
const M = 150
const CHART_Y = 560
const CHART_H = 2360

interface PosterInput {
  cam: { x: number; y: number; zoom: number }
  screenW: number
  screenH: number
  constellations: Constellation[]
  currentId: string | null
  solarDays: number
}

/** Render the current view as a portrait star chart and download it as a PNG. */
export async function exportPoster(input: PosterInput): Promise<void> {
  await Promise.all([
    document.fonts.load('120px Italiana'),
    document.fonts.load('italic 40px Spectral'),
    document.fonts.load('30px "IBM Plex Mono"'),
  ]).catch(() => undefined)

  const chartW = W - M * 2
  const ui = chartW / input.screenW
  const cam = { ...input.cam, zoom: input.cam.zoom * ui }

  const chart = document.createElement('canvas')
  chart.width = chartW
  chart.height = CHART_H
  renderScene({
    ctx: chart.getContext('2d')!,
    w: chartW,
    h: CHART_H,
    cam,
    now: 0,
    tint: nightSky(),
    moon: null,
    constellations: input.constellations,
    currentId: input.currentId,
    playing: [],
    solarDays: input.solarDays,
    ghost: null,
    hover: null,
    ui,
    twinkle: false,
    effects: false,
  })

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#070b1c'
  ctx.fillRect(0, 0, W, H)

  // Graticule: a faint grid in world units over the chart.
  const g = chart.getContext('2d')!
  const r = layerRect(cam, chartW, CHART_H)
  const step = niceStep(300 / cam.zoom)
  g.strokeStyle = 'rgba(214,178,110,0.12)'
  g.lineWidth = 1.5
  g.font = '22px "IBM Plex Mono", monospace'
  g.fillStyle = 'rgba(214,178,110,0.55)'
  for (let x = Math.ceil(r.x0 / step) * step; x <= r.x1; x += step) {
    const sx = (x - cam.x) * cam.zoom + chartW / 2
    g.beginPath()
    g.moveTo(sx, 0)
    g.lineTo(sx, CHART_H)
    g.stroke()
    g.fillText(fmt(x), sx + 8, CHART_H - 14)
  }
  for (let y = Math.ceil(r.y0 / step) * step; y <= r.y1; y += step) {
    const sy = (y - cam.y) * cam.zoom + CHART_H / 2
    g.beginPath()
    g.moveTo(0, sy)
    g.lineTo(chartW, sy)
    g.stroke()
    g.fillText(fmt(y), 12, sy - 8)
  }

  ctx.drawImage(chart, M, CHART_Y)
  ctx.strokeStyle = '#d6b26e'
  ctx.lineWidth = 3
  ctx.strokeRect(M, CHART_Y, chartW, CHART_H)
  ctx.lineWidth = 1
  ctx.strokeRect(M - 14, CHART_Y - 14, chartW + 28, CHART_H + 28)

  // Title block: the constellations in view.
  const visible = input.constellations.filter(k => {
    if (!k.stars.length) return false
    const b = bounds(k)
    return b.x1 >= r.x0 && b.x0 <= r.x1 && b.y1 >= r.y0 && b.y0 <= r.y1
  })
  const main = visible.find(k => k.id === input.currentId) ?? visible[0]
  const others = visible.filter(k => k !== main).map(k => k.name)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#d6b26e'
  ctx.font = '500 30px "IBM Plex Mono", monospace'
  ctx.fillText(`STAR CHART  ·  SECTOR ${sectorName(input.cam.x, input.cam.y)}`, M, 190)
  ctx.fillStyle = '#f3ead6'
  ctx.font = '150px Italiana, Didot, serif'
  fitText(ctx, main ? main.name : 'A Corner of the Sky', M, 350, chartW)
  ctx.fillStyle = '#a3acd0'
  ctx.font = 'italic 300 46px Spectral, Georgia, serif'
  const sub = others.length
    ? `with ${others.slice(0, 3).join(', ')}${others.length > 3 ? ` and ${others.length - 3} more` : ''}`
    : 'charted in Starloom'
  fitText(ctx, sub, M, 440, chartW)

  // Footer.
  const moon = moonPhase(new Date())
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.font = '28px "IBM Plex Mono", monospace'
  ctx.fillStyle = '#a3acd0'
  const fy = CHART_Y + CHART_H + 120
  ctx.fillText(`CENTRE  ${fmt(input.cam.x)} · ${fmt(input.cam.y)}`, M, fy)
  ctx.textAlign = 'center'
  ctx.fillText(date.toUpperCase(), W / 2, fy)
  ctx.textAlign = 'right'
  ctx.fillText(`MOON  ${moon.name.toUpperCase()} ${Math.round(moon.illumination * 100)}%`, W - M, fy)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d6b26e'
  ctx.font = '64px Italiana, Didot, serif'
  ctx.fillText('Starloom', W / 2, H - 110)

  const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Could not create the poster image')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `starloom-${new Date().toISOString().slice(0, 10)}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number) {
  const w = ctx.measureText(text).width
  if (w <= max) return ctx.fillText(text, x, y)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(max / w, max / w)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}
