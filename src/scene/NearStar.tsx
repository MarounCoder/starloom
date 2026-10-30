import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { apparentMag, bvToRgb } from '../lib/space/photometry'
import { KM_PER_PC } from '../lib/space/units'
import type { V3 } from '../lib/space/vec'
import { cam } from '../state/camera'
import { catalogState } from '../state/catalog'
import { universe } from '../state/universe'
import { glowTexture } from './textures'

interface Near {
  pos: V3
  absMag: number
  ci: number
}

/** The nearest star to the camera, real or generated (refreshed every 15 frames). */
function findNearest(): Near | null {
  let best: Near | null = null
  let bd = Infinity
  const c = catalogState().catalog
  if (c) {
    const px = cam.pos[0] / KM_PER_PC
    const py = cam.pos[1] / KM_PER_PC
    const pz = cam.pos[2] / KM_PER_PC
    for (let i = 0; i < c.count; i++) {
      const d = (c.pos[i * 3] - px) ** 2 + (c.pos[i * 3 + 1] - py) ** 2 + (c.pos[i * 3 + 2] - pz) ** 2
      if (d < bd) {
        bd = d
        best = { pos: [c.pos[i * 3] * KM_PER_PC, c.pos[i * 3 + 1] * KM_PER_PC, c.pos[i * 3 + 2] * KM_PER_PC], absMag: c.absMag[i], ci: c.ci[i] }
      }
    }
  }
  for (const ch of universe.loaded.values()) {
    if (ch.level > 2) continue
    for (let i = 0; i < ch.count; i++) {
      const p: V3 = [ch.origin[0] + ch.pos[i * 3] * KM_PER_PC, ch.origin[1] + ch.pos[i * 3 + 1] * KM_PER_PC, ch.origin[2] + ch.pos[i * 3 + 2] * KM_PER_PC]
      const d = ((p[0] - cam.pos[0]) ** 2 + (p[1] - cam.pos[1]) ** 2 + (p[2] - cam.pos[2]) ** 2) / KM_PER_PC ** 2
      if (d < bd) {
        bd = d
        best = { pos: p, absMag: ch.absMag[i], ci: ch.ci[i] }
      }
    }
  }
  return best
}

/**
 * A star you have flown close to becomes a dazzling sun: a glow placed in float64 at its true position,
 * sized by how bright it looks from here (the Sun has its own).
 */
export function NearStar() {
  const sprite = useRef<THREE.Sprite>(null)
  const near = useRef<Near | null>(null)
  const frame = useRef(0)
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false, transparent: true, toneMapped: false }),
    [],
  )

  useFrame(() => {
    if (frame.current++ % 15 === 0) near.current = findNearest()
    const s = sprite.current
    const n = near.current
    if (!s) return
    if (!n) {
      s.visible = false
      return
    }
    const rel = [n.pos[0] - cam.pos[0], n.pos[1] - cam.pos[1], n.pos[2] - cam.pos[2]]
    const dPc = Math.hypot(rel[0], rel[1], rel[2]) / KM_PER_PC
    const m = apparentMag(n.absMag, dPc)
    s.visible = m < 0
    if (!s.visible) return
    s.position.set(rel[0], rel[1], rel[2])
    s.scale.setScalar(Math.min(0.35, 0.03 * Math.pow(10, -0.1 * m)))
    const [r, g, b] = bvToRgb(n.ci)
    const k = 1.2 + Math.min(1.5, -m / 10)
    material.color.setRGB(r * k, g * k, b * k)
    material.opacity = Math.min(1, -m / 3)
  })

  return <sprite ref={sprite} material={material} renderOrder={-5} visible={false} />
}
