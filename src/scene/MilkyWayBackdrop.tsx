import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EQ_TO_GAL } from '../lib/space/frames'
import { KM_PER_PC } from '../lib/space/units'
import { len } from '../lib/space/vec'
import { cam } from '../state/camera'
import { loadTexture } from './textures'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The Milky Way as seen from the Sun, on a sphere around the camera. The panorama is in galactic
 * coordinates (centre in the middle, south at the top), so each pixel looks up its own direction.
 * It fades as you travel more than a few hundred parsecs from home, where it would no longer be true.
 */
export function MilkyWayBackdrop({ hi = true }: { hi?: boolean }) {
  const material = useMemo(() => {
    const m = EQ_TO_GAL
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null as THREE.Texture | null },
        uOpacity: { value: 0 },
        uEqToGal: { value: new THREE.Matrix3().set(m[0][0], m[0][1], m[0][2], m[1][0], m[1][1], m[1][2], m[2][0], m[2][1], m[2][2]) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        uniform mat3 uEqToGal;
        varying vec3 vDir;
        const float PI = 3.141592653589793;
        void main() {
          vec3 g = uEqToGal * normalize(vDir);
          float l = atan(g.y, g.x);
          float b = asin(clamp(g.z, -1.0, 1.0));
          vec2 uv = vec2(fract(0.5 - l / (2.0 * PI)), 0.5 - b / PI);
          vec3 c = texture2D(uMap, uv).rgb;
          gl_FragColor = vec4(c * uOpacity * 1.6, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  }, [])

  useEffect(() => {
    let live = true
    loadTexture(hi ? '8k_stars_milky_way.jpg' : '2k_stars_milky_way.jpg').then(t => {
      if (!live) return
      // No mipmaps: the longitude seam would otherwise show as a line where the lookup wraps.
      t.generateMipmaps = false
      t.minFilter = THREE.LinearFilter
      t.needsUpdate = true
      material.uniforms.uMap.value = t
    })
    return () => {
      live = false
    }
  }, [hi, material])

  useFrame(() => {
    const pc = len(cam.pos) / KM_PER_PC
    material.uniforms.uOpacity.value = material.uniforms.uMap.value ? 1 - smoothstep(300, 2000, pc) : 0
  })

  return (
    <mesh material={material} renderOrder={-20} frustumCulled={false} scale={1e24}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  )
}
