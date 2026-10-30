import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KM_PER_PC } from '../lib/space/units'
import { cam } from '../state/camera'
import { useCatalog } from '../state/catalog'
import { len } from '../lib/space/vec'
import { useSky } from '../state/store'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The 88 IAU constellation figures, drawn between the stars' true 3D positions. Like the stars,
 * the vertices are parsecs around the Sun, so they stretch out of shape as you fly away.
 */
export function Figures({ visible = true }: { visible?: boolean }) {
  const { catalog, figures } = useCatalog()
  const lines = useRef<THREE.LineSegments>(null)
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#d6b26e', transparent: true, opacity: 0.32, depthWrite: false }),
    [],
  )
  const geometry = useMemo(() => {
    if (!catalog || !figures.length) return null
    const n = figures.reduce((k, f) => k + f.segs.length, 0)
    const pos = new Float32Array(n * 6)
    let o = 0
    for (const f of figures)
      for (const [a, b] of f.segs) {
        pos.set(catalog.pos.subarray(a * 3, a * 3 + 3), o)
        pos.set(catalog.pos.subarray(b * 3, b * 3 + 3), o + 3)
        o += 6
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [catalog, figures])

  useEffect(() => () => geometry?.dispose(), [geometry])

  const selected = useSky(s => (s.selected?.kind === 'figure' ? s.selected.abbr : null))
  const highlight = useMemo(() => {
    const f = figures.find(x => x.abbr === selected)
    if (!catalog || !f) return null
    const pos = new Float32Array(f.segs.length * 6)
    f.segs.forEach(([a, b], k) => {
      pos.set(catalog.pos.subarray(a * 3, a * 3 + 3), k * 6)
      pos.set(catalog.pos.subarray(b * 3, b * 3 + 3), k * 6 + 3)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [catalog, figures, selected])
  const hiMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#f0cf8a', transparent: true, opacity: 0.85, depthWrite: false }), [])
  const hiLines = useRef<THREE.LineSegments>(null)

  useEffect(() => () => highlight?.dispose(), [highlight])

  useFrame(() => {
    lines.current?.position.set(-cam.pos[0], -cam.pos[1], -cam.pos[2])
    hiLines.current?.position.set(-cam.pos[0], -cam.pos[1], -cam.pos[2])
    // Far from home all 88 figures collapse into a tangle, so they fade; a selected one stays bright.
    const pc = len(cam.pos) / KM_PER_PC
    material.opacity = 0.32 * (1 - 0.9 * smooth(8, 60, pc)) * (1 - smooth(1500, 4000, pc))
  })

  if (!geometry) return null
  return (
    <>
      <lineSegments ref={lines} geometry={geometry} material={material} scale={KM_PER_PC} frustumCulled={false} renderOrder={-11} visible={visible} />
      {highlight && <lineSegments ref={hiLines} geometry={highlight} material={hiMaterial} scale={KM_PER_PC} frustumCulled={false} renderOrder={-11} />}
    </>
  )
}
