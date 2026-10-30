import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BODIES } from '../lib/space/bodies'
import { KM_PER_PC } from '../lib/space/units'
import { len, scale } from '../lib/space/vec'
import { cam } from '../state/camera'
import { glowTexture, loadTexture } from './textures'

/** The Sun: a glowing textured globe, a halo, a light, and a star-like point once you are far away. */
export function Sun() {
  const group = useRef<THREE.Group>(null)
  const point = useRef<THREE.Sprite>(null)
  const surface = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 1.0), toneMapped: false }), [])
  const glow = useMemo(() => glowTexture(), [])
  const haloMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(1.4, 1.15, 0.85), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [glow],
  )
  const pointMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(1.3, 1.15, 0.9), blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false, toneMapped: false }),
    [glow],
  )

  useEffect(() => {
    loadTexture(BODIES.sun.texture!).then(t => {
      surface.map = t
      surface.needsUpdate = true
    })
  }, [surface])

  useFrame(() => {
    const rel = scale(cam.pos, -1)
    group.current?.position.set(rel[0], rel[1], rel[2])
    if (point.current) {
      // Fade the star-like point with apparent magnitude, like any other star (absolute magnitude 4.83).
      const pc = Math.max(len(rel) / KM_PER_PC, 1e-9)
      const m = 4.83 + 5 * Math.log10(pc) - 5
      const s = Math.min(0.12, Math.max(0.012, 0.05 * Math.pow(10, -0.2 * (m - 1))))
      point.current.scale.setScalar(s)
      pointMat.opacity = Math.max(0, Math.min(1, (7.5 - m) / 3))
    }
  })

  const r = BODIES.sun.radiusKm
  return (
    <group ref={group} name="sun">
      <mesh material={surface} scale={r}>
        <sphereGeometry args={[1, 64, 32]} />
      </mesh>
      <sprite material={haloMat} scale={r * 9} />
      <sprite ref={point} material={pointMat} renderOrder={-5} />
      <pointLight intensity={2.3} decay={0} color="#fff4e2" />
    </group>
  )
}
