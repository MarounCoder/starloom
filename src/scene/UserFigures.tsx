import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HUES, segments } from '../lib/constellations'
import { resolveStar } from '../lib/space/starId'
import type { V3 } from '../lib/space/vec'
import { cam } from '../state/camera'
import { catalogState } from '../state/catalog'
import { pulses } from '../state/player'
import { useSky } from '../state/store'

const MAX = 4000
const PULSE_MS = 700

const rgb = (hue: number) => HUES[hue % HUES.length].split(',').map(v => Number(v) / 255)

/**
 * Your constellations, drawn between their stars' true 3D positions, so they stretch as you travel.
 * Rebuilt camera-relative every frame (there are only ever a few hundred lines), so precision holds anywhere.
 */
export function UserFigures() {
  const { lines, dots } = useMemo(() => {
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 6), 3).setUsage(THREE.DynamicDrawUsage))
    lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 6), 3).setUsage(THREE.DynamicDrawUsage))
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }))
    const dg = new THREE.BufferGeometry()
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    dg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const dots = new THREE.Points(dg, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, map: ringTexture() }))
    for (const o of [lines, dots]) {
      o.frustumCulled = false
      o.renderOrder = -8
    }
    return { lines, dots }
  }, [])

  useFrame(() => {
    const { constellations, activeId } = useSky.getState()
    const catalog = catalogState().catalog
    const lp = lines.geometry.attributes.position as THREE.BufferAttribute
    const lc = lines.geometry.attributes.color as THREE.BufferAttribute
    const dp = dots.geometry.attributes.position as THREE.BufferAttribute
    const dc = dots.geometry.attributes.color as THREE.BufferAttribute
    let nl = 0
    let nd = 0
    const now = performance.now()
    for (const c of constellations) {
      const pos: (V3 | null)[] = c.stars.map(id => {
        const r = resolveStar(id, catalog)
        return r ? [r.posKm[0] - cam.pos[0], r.posKm[1] - cam.pos[1], r.posKm[2] - cam.pos[2]] : null
      })
      const [r, g, b] = rgb(c.hue)
      const k = c.id === activeId ? 1.25 : 0.7
      for (const [a, z] of segments(c)) {
        if (nl >= MAX || !pos[a] || !pos[z]) continue
        lp.setXYZ(nl * 2, ...pos[a]!)
        lp.setXYZ(nl * 2 + 1, ...pos[z]!)
        lc.setXYZ(nl * 2, r * k, g * k, b * k)
        lc.setXYZ(nl * 2 + 1, r * k, g * k, b * k)
        nl++
      }
      c.stars.forEach((id, i) => {
        if (nd >= MAX || !pos[i]) return
        const age = now - (pulses.get(id) ?? -1e9)
        const glow = age < PULSE_MS ? 1 + 2.2 * (1 - age / PULSE_MS) : 1
        dp.setXYZ(nd, ...pos[i]!)
        dc.setXYZ(nd, r * k * glow, g * k * glow, b * k * glow)
        nd++
      })
    }
    lines.geometry.setDrawRange(0, nl * 2)
    dots.geometry.setDrawRange(0, nd)
    lp.needsUpdate = lc.needsUpdate = dp.needsUpdate = dc.needsUpdate = true
  })

  return (
    <>
      <primitive object={lines} />
      <primitive object={dots} />
    </>
  )
}

/** A thin ring, so a joined star reads as "part of your constellation". */
function ringTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.strokeStyle = 'white'
  g.lineWidth = 6
  g.beginPath()
  g.arc(32, 32, 24, 0, Math.PI * 2)
  g.stroke()
  return new THREE.CanvasTexture(c)
}
