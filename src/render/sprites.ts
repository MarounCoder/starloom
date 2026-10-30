import { mulberry32, hash2 } from '../lib/rng'
import type { Chunk } from '../lib/sky/starfield'
import type { Galaxy, Nebula } from '../lib/sky/deepsky'

type Canvas = HTMLCanvasElement

function canvas(size: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!]
}

const glowCache = new Map<string, Canvas>()

/** A soft round glow in an "r,g,b" colour, drawn scaled wherever a halo is needed. */
export function glowSprite(rgb: string): Canvas {
  let c = glowCache.get(rgb)
  if (c) return c
  const [cv, ctx] = canvas(128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.25, `rgba(${rgb},0.35)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glowCache.set(rgb, cv)
  c = cv
  return c
}

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

const GLOW_RGB = { haze: '190,200,240', core: '255,226,190', violet: '170,140,230' }
/** World units of padding around a chunk so glow blobs that spill over the edge are not clipped. */
export const GLOW_PAD = 480
const GLOW_PX = 192
const glowChunks = new Map<string, Canvas>()

/** The Milky Way glow for one far-layer chunk, pre-rendered small and drawn stretched (it is all blur anyway). */
export function milkyChunk(key: string, chunk: Chunk, x0: number, y0: number, size: number): Canvas | null {
  const lights = chunk.glow.filter(g => g.kind !== 'dust')
  if (!lights.length) return null
  let c = glowChunks.get(key)
  if (c) return c
  const [cv, ctx] = canvas(GLOW_PX)
  const span = size + GLOW_PAD * 2
  const k = GLOW_PX / span
  ctx.globalCompositeOperation = 'lighter'
  for (const g of lights) {
    const sprite = glowSprite(GLOW_RGB[g.kind as keyof typeof GLOW_RGB])
    const r = g.r * k
    ctx.globalAlpha = g.a
    ctx.drawImage(sprite, (g.x - x0 + GLOW_PAD) * k - r, (g.y - y0 + GLOW_PAD) * k - r, r * 2, r * 2)
  }
  if (glowChunks.size > 400) glowChunks.clear()
  glowChunks.set(key, cv)
  c = cv
  return c
}

const nebulaCache = new Map<string, Canvas>()
/** Half-width of a nebula sprite in world units, relative to its radius. */
export const NEBULA_EXTENT = 1.8

export function nebulaSprite(n: Nebula): Canvas {
  let c = nebulaCache.get(n.id)
  if (c) return c
  const size = 512
  const [cv, ctx] = canvas(size)
  const k = size / 2 / (n.r * NEBULA_EXTENT)
  ctx.globalCompositeOperation = 'lighter'
  for (const b of n.blobs) {
    ctx.globalAlpha = b.a
    const r = b.r * k
    ctx.drawImage(glowSprite(b.color), size / 2 + b.dx * k - r, size / 2 + b.dy * k - r, r * 2, r * 2)
  }
  if (nebulaCache.size > 120) nebulaCache.clear()
  nebulaCache.set(n.id, cv)
  c = cv
  return c
}

const galaxyCache = new Map<string, Canvas>()

/** A face-on spiral; the renderer tilts and rotates it. */
export function galaxySprite(g: Galaxy): Canvas {
  let c = galaxyCache.get(g.id)
  if (c) return c
  const size = 256
  const h = size / 2
  const [cv, ctx] = canvas(size)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.5
  ctx.drawImage(glowSprite(g.hue), h * 0.2, h * 0.2, size * 0.8, size * 0.8)
  ctx.globalAlpha = 0.9
  ctx.drawImage(glowSprite('255,240,220'), h * 0.7, h * 0.7, h * 0.6, h * 0.6)
  const rand = mulberry32(hash2(g.x | 0, g.y | 0, 7))
  for (let arm = 0; arm < g.arms; arm++) {
    for (let i = 0; i < 220; i++) {
      const t = i / 220
      const a = (arm / g.arms) * Math.PI * 2 + t * 4.2
      const r = (0.08 + t * 0.85) * h
      const j = (rand() - 0.5) * 18 * (0.4 + t)
      const x = h + Math.cos(a) * r + j
      const y = h + Math.sin(a) * r + (rand() - 0.5) * 18 * (0.4 + t)
      ctx.globalAlpha = (1 - t) * 0.5
      ctx.fillStyle = `rgba(${g.hue},1)`
      ctx.fillRect(x, y, 1.6, 1.6)
    }
  }
  galaxyCache.set(g.id, cv)
  c = cv
  return c
}
