import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../lib/rng'
import type { Nebula } from '../lib/space/deepsky'
import { KM_PER_PC } from '../lib/space/units'
import { cam } from '../state/camera'
import { universe } from '../state/universe'

/** Emission-nebula colours: hydrogen red, pink, oxygen teal, a little violet. */
const PALETTE = ['255,96,110', '255,128,170', '110,220,210', '170,140,255']

const textures = new Map<string, THREE.Texture>()

/** A soft, filamentary cloud drawn once per nebula on a canvas: blobs strung along a few random walks. */
function nebulaTexture(n: Nebula): THREE.Texture {
  const hit = textures.get(n.key)
  if (hit) return hit
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.globalCompositeOperation = 'lighter'
  const rand = mulberry32(n.seed)
  const main = PALETTE[Math.floor(n.hue * PALETTE.length) % PALETTE.length]
  const second = PALETTE[Math.floor(rand() * PALETTE.length)]
  const blob = (x: number, y: number, r: number, col: string, a: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${col},${a})`)
    grad.addColorStop(1, `rgba(${col},0)`)
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // A broad glow first, then wispy filaments on top.
  for (let i = 0; i < 6; i++) blob(size / 2 + (rand() - 0.5) * size * 0.35, size / 2 + (rand() - 0.5) * size * 0.35, 40 + rand() * 50, rand() < 0.75 ? main : second, 0.16)
  for (let f = 0; f < 4; f++) {
    let x = size / 2 + (rand() - 0.5) * size * 0.4
    let y = size / 2 + (rand() - 0.5) * size * 0.4
    let a = rand() * Math.PI * 2
    const col = rand() < 0.7 ? main : second
    for (let i = 0; i < 60; i++) {
      a += (rand() - 0.5) * 0.5
      x += Math.cos(a) * 2.2
      y += Math.sin(a) * 2.2
      blob(x, y, 10 + rand() * 16, col, 0.05)
    }
  }
  // Fade the square edges away.
  g.globalCompositeOperation = 'destination-in'
  const edge = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2)
  edge.addColorStop(0, 'rgba(0,0,0,1)')
  edge.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = edge
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  if (textures.size > 96) textures.delete(textures.keys().next().value!)
  textures.set(n.key, t)
  return t
}

/** Nebulae in the cells around the camera, as camera-facing glowing clouds. */
export function Nebulae() {
  const group = useMemo(() => new THREE.Group(), [])
  const live = useMemo(() => new Map<string, { sprite: THREE.Sprite; n: Nebula }>(), [])

  useFrame(() => {
    const want = new Set(universe.nebulae.map(n => n.key))
    for (const [key, l] of live)
      if (!want.has(key)) {
        group.remove(l.sprite)
        l.sprite.material.dispose()
        live.delete(key)
      }
    for (const n of universe.nebulae) {
      if (live.has(n.key)) continue
      const m = new THREE.SpriteMaterial({ map: nebulaTexture(n), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })
      const sprite = new THREE.Sprite(m)
      sprite.scale.setScalar(n.radiusPc * 2.4 * KM_PER_PC)
      sprite.renderOrder = -14
      sprite.frustumCulled = false
      group.add(sprite)
      live.set(n.key, { sprite, n })
    }
    for (const { sprite, n } of live.values()) {
      sprite.position.set(n.pos[0] - cam.pos[0], n.pos[1] - cam.pos[1], n.pos[2] - cam.pos[2])
      // Fade when the camera is inside the cloud, so flying through it never fills the screen.
      const d = Math.hypot(n.pos[0] - cam.pos[0], n.pos[1] - cam.pos[1], n.pos[2] - cam.pos[2]) / KM_PER_PC / n.radiusPc
      sprite.material.opacity = Math.min(0.9, Math.max(0, (d - 0.4) / 1.2))
    }
  })

  return <primitive object={group} />
}
