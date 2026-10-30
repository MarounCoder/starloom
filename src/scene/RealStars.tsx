import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bvToRgb } from '../lib/space/photometry'
import { KM_PER_PC } from '../lib/space/units'
import { cam } from '../state/camera'
import { loadCatalog, useCatalog } from '../state/catalog'
import { makeStarMaterial } from './starMaterial'
import { sky } from '../state/store'

/** Starts loading the catalogue once the first frame has been drawn, so the page paints first; retries with backoff if it fails. */
function useLoadAfterFirstFrame() {
  const started = useRef(false)
  useFrame(() => {
    if (started.current) return
    started.current = true
    const attempt = (n: number) =>
      loadCatalog().catch(() => {
        if (n === 0) sky.toast('Could not load the stars. Trying again…')
        window.setTimeout(() => attempt(n + 1), Math.min(30_000, 2000 * 2 ** n))
      })
    window.setTimeout(() => attempt(0), 0)
  })
}

/** The real star catalogue: one point cloud in parsecs, with the Sun at its origin. */
export function RealStars() {
  useLoadAfterFirstFrame()
  const { catalog } = useCatalog()
  const points = useRef<THREE.Points>(null)
  const dpr = useThree(s => s.viewport.dpr)
  const material = useMemo(() => makeStarMaterial(), [])

  const geometry = useMemo(() => {
    if (!catalog) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(catalog.pos, 3))
    g.setAttribute('absMag', new THREE.BufferAttribute(catalog.absMag, 1))
    const color = new Float32Array(catalog.count * 3)
    for (let i = 0; i < catalog.count; i++) color.set(bvToRgb(catalog.ci[i]), i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(color, 3))
    return g
  }, [catalog])

  useEffect(() => () => geometry?.dispose(), [geometry])

  useFrame(() => {
    const p = points.current
    if (!p) return
    p.position.set(-cam.pos[0], -cam.pos[1], -cam.pos[2])
    material.uniforms.uPixelRatio.value = dpr
  })

  if (!geometry) return null
  return <points ref={points} geometry={geometry} material={material} scale={KM_PER_PC} frustumCulled={false} renderOrder={-10} />
}
