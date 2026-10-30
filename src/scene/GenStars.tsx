import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bvToRgb } from '../lib/space/photometry'
import { KM_PER_PC } from '../lib/space/units'
import type { GenChunk } from '../lib/space/octree'
import { cam } from '../state/camera'
import { stepUniverse, universe } from '../state/universe'
import { makeStarMaterial } from './starMaterial'
import { renderTier } from '../lib/tier'

interface Live {
  points: THREE.Points
  born: number
}

const FADE_IN_S = 0.4

function build(ch: GenChunk, material: THREE.ShaderMaterial): THREE.Points {
  // Phones draw every n-th star; the chunk itself (and every star id) is the same everywhere.
  const stride = renderTier.genStride
  const n = Math.ceil(ch.count / stride)
  const pos = new Float32Array(n * 3)
  const mag = new Float32Array(n)
  const color = new Float32Array(n * 3)
  for (let k = 0; k < n; k++) {
    const i = k * stride
    pos.set(ch.pos.subarray(i * 3, i * 3 + 3), k * 3)
    mag[k] = ch.absMag[i]
    color.set(bvToRgb(ch.ci[i]), k * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('absMag', new THREE.BufferAttribute(mag, 1))
  g.setAttribute('color', new THREE.BufferAttribute(color, 3))
  const p = new THREE.Points(g, material)
  p.scale.setScalar(KM_PER_PC)
  p.frustumCulled = false
  p.renderOrder = -10
  return p
}

/** The streamed stars of whatever galaxy the camera is in: one point cloud per chunk, faded in as it arrives. */
export function GenStars() {
  const dpr = useThree(s => s.viewport.dpr)
  const group = useMemo(() => new THREE.Group(), [])
  const live = useMemo(() => new Map<string, Live>(), [])
  const version = useRef(-1)

  useEffect(
    () => () => {
      for (const l of live.values()) {
        l.points.geometry.dispose()
        ;(l.points.material as THREE.Material).dispose()
      }
      live.clear()
    },
    [live],
  )

  useFrame(({ clock }) => {
    stepUniverse()
    const now = clock.elapsedTime
    if (universe.version !== version.current) {
      version.current = universe.version
      for (const [key, l] of live)
        if (!universe.loaded.has(key)) {
          group.remove(l.points)
          l.points.geometry.dispose()
          ;(l.points.material as THREE.Material).dispose()
          live.delete(key)
        }
      for (const [key, ch] of universe.loaded)
        if (!live.has(key) && ch.count) {
          const m = makeStarMaterial()
          m.uniforms.uFade.value = 0
          m.uniforms.uMagLimit.value = 8.5
          const points = build(ch, m)
          points.userData.origin = ch.origin
          group.add(points)
          live.set(key, { points, born: now })
        }
    }
    for (const l of live.values()) {
      const o = l.points.userData.origin as number[]
      l.points.position.set(o[0] - cam.pos[0], o[1] - cam.pos[1], o[2] - cam.pos[2])
      const m = l.points.material as THREE.ShaderMaterial
      m.uniforms.uFade.value = Math.min(1, (now - l.born) / FADE_IN_S)
      m.uniforms.uPixelRatio.value = dpr
    }
  })

  return <primitive object={group} />
}
