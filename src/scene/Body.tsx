import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BODIES, type BodyId } from '../lib/space/bodies'
import { bodySpin } from '../lib/space/ephemeris'
import { sub } from '../lib/space/vec'
import { cam } from '../state/camera'
import { clock, positions } from '../state/clock'
import { loadTexture } from './textures'

const Z = new THREE.Vector3(0, 0, 1)
const north = new THREE.Vector3()
const node = new THREE.Vector3()
const meridian = new THREE.Vector3()
const east = new THREE.Vector3()
const basis = new THREE.Matrix4()

/**
 * Orient a globe the IAU way: its pole (sphere +Y) points at the real north pole and its
 * prime meridian (texture centre, sphere +X) sits `spin` degrees east of the equator's ascending node.
 */
function orientGlobe(q: THREE.Quaternion, id: BodyId) {
  const s = bodySpin(id, clock.now())
  north.set(s.north[0], s.north[1], s.north[2])
  node.crossVectors(Z, north).normalize()
  meridian.copy(node).applyAxisAngle(north, (s.spinDeg * Math.PI) / 180)
  east.crossVectors(meridian, north)
  basis.makeBasis(meridian, north, east)
  q.setFromRotationMatrix(basis)
}

/** A ring lies in its planet's equator: its +Z points at the pole. */
function orientRing(q: THREE.Quaternion, id: BodyId) {
  const s = bodySpin(id, clock.now())
  q.setFromUnitVectors(Z, north.set(s.north[0], s.north[1], s.north[2]))
}

/** Apply a texture to a material when it arrives; until then the body shows its flat colour. */
function useMap(mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial, name: string | undefined, slot: 'map' | 'alphaMap' = 'map') {
  useEffect(() => {
    if (!name) return
    let live = true
    loadTexture(name, slot === 'map').then(t => {
      if (!live) return
      mat[slot] = t
      if (slot === 'map') mat.color.set('#ffffff')
      mat.needsUpdate = true
    })
    return () => {
      live = false
    }
  }, [mat, name, slot])
}

export function Body({ id, segments }: { id: BodyId; segments: number }) {
  const info = BODIES[id]
  const group = useRef<THREE.Group>(null)
  const globe = useRef<THREE.Mesh>(null)
  const ringMesh = useRef<THREE.Mesh>(null)

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: info.color, roughness: 1, metalness: 0 }), [info.color])
  const clouds = useMemo(
    () => (info.clouds ? new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, depthWrite: false, roughness: 1, opacity: 0.9 }) : null),
    [info.clouds],
  )
  const ringMat = useMemo(
    () => (info.ring ? new THREE.MeshStandardMaterial({ color: '#d8c9a8', transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }) : null),
    [info.ring],
  )
  const ringGeo = useMemo(() => {
    if (!info.ring) return null
    const { inner, outer } = info.ring
    const g = new THREE.RingGeometry(inner, outer, 160, 1)
    // The ring texture is a radial strip: u runs from the inner to the outer edge.
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i))
      uv.setXY(i, (r - inner) / (outer - inner), 0.5)
    }
    return g
  }, [info.ring])

  useMap(material, info.texture)
  useMap(clouds ?? material, info.clouds && clouds ? info.clouds : undefined, 'alphaMap')
  useMap(ringMat ?? material, info.ring && ringMat ? info.ring.texture : undefined)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const rel = sub(positions()[id], cam.pos)
    g.position.set(rel[0], rel[1], rel[2])
    if (globe.current) orientGlobe(globe.current.quaternion, id)
    if (ringMesh.current) orientRing(ringMesh.current.quaternion, id)
  })

  return (
    <group ref={group} name={id}>
      <mesh ref={globe} material={material} scale={info.radiusKm}>
        <sphereGeometry args={[1, segments, segments / 2]} />
        {clouds && (
          <mesh material={clouds} scale={1.012}>
            <sphereGeometry args={[1, segments, segments / 2]} />
          </mesh>
        )}
      </mesh>
      {ringGeo && ringMat && <mesh ref={ringMesh} geometry={ringGeo} material={ringMat} />}
    </group>
  )
}
