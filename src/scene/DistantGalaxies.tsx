import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, normal } from '../lib/rng'
import { MILKY_WAY } from '../lib/space/galaxy'
import { KM_PER_PC } from '../lib/space/units'
import { dist } from '../lib/space/vec'
import { cam } from '../state/camera'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Beyond the galaxies we stream there are always more: a faint, fixed field of far-away smudges on the
 * sky, shown once you are out of the Milky Way, so deep space is never an empty black.
 */
export function DistantGalaxies({ count = 2500 }: { count?: number }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(0xfa12)
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const v = [normal(rand), normal(rand), normal(rand)]
      const l = Math.hypot(v[0], v[1], v[2])
      pos.set([(v[0] / l) * 1e24, (v[1] / l) * 1e24, (v[2] / l) * 1e24], i * 3)
      const warm = rand()
      const k = 0.25 + rand() * 0.5
      col.set([(0.75 + 0.25 * warm) * k, (0.75 + 0.1 * warm) * k, (1 - 0.3 * warm) * k], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])
  const material = useMemo(
    () => new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    [],
  )

  useFrame(() => {
    material.opacity = smoothstep(20000, 120000, dist(cam.pos, MILKY_WAY.center) / KM_PER_PC)
  })

  return <points geometry={geometry} material={material} renderOrder={-19} frustumCulled={false} />
}
