import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Galaxy } from '../lib/space/galaxy'
import { KM_PER_PC } from '../lib/space/units'
import { dist, len } from '../lib/space/vec'
import { cam } from '../state/camera'
import { universe } from '../state/universe'
import { buildImpostor } from './galaxyImpostor'
import { glowTexture } from './textures'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function makeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uProj: { value: 1 } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      attribute vec3 color;
      attribute float size;
      uniform float uProj;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // The object is scaled to km, so the sprite's world size is size × the model scale.
        float worldSize = size * length(modelMatrix[0].xyz);
        float px = worldSize / max(-mv.z, 1.0) * uProj;
        // Tiny sprites keep their light by fading instead of shrinking; huge ones fade so close-ups stay airy.
        vAlpha = uOpacity * 0.2 * min(1.0, px * px) * min(1.0, 40.0 / px);
        vColor = color;
        gl_PointSize = clamp(px, 1.0, 160.0);
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
        if (vAlpha < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        #include <logdepthbuf_fragment>
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 4.0) * vAlpha;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

interface Live {
  points: THREE.Points
  core: THREE.Sprite
  g: Galaxy
}

const coreTexture = glowTexture([[0, 'rgba(255,240,215,1)'], [0.25, 'rgba(255,225,190,0.35)'], [1, 'rgba(255,215,180,0)']])

/**
 * Every galaxy in the 3×3×3 cells around the camera, as a cloud of soft glows. As you enter one, its glow
 * thins to a haze and its streamed stars take over; near the Sun, the photographed Milky Way does instead.
 */
export function Galaxies({ points: perGalaxy = 7000 }: { points?: number }) {
  const size = useThree(s => s.size)
  const dpr = useThree(s => s.viewport.dpr)
  const group = useMemo(() => new THREE.Group(), [])
  const live = useMemo(() => new Map<string, Live>(), [])

  useEffect(
    () => () => {
      for (const l of live.values()) {
        l.points.geometry.dispose()
        ;(l.points.material as THREE.Material).dispose()
        l.core.material.dispose()
      }
      live.clear()
    },
    [live],
  )

  useFrame(() => {
    const want = new Set(universe.near.map(g => g.key))
    for (const [key, l] of live)
      if (!want.has(key)) {
        group.remove(l.points, l.core)
        l.points.geometry.dispose()
        ;(l.points.material as THREE.Material).dispose()
        l.core.material.dispose()
        live.delete(key)
      }
    let built = 0
    for (const g of universe.near) {
      if (live.has(g.key) || built >= 2) continue
      const imp = buildImpostor(g, perGalaxy)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(imp.pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(imp.color, 3))
      geo.setAttribute('size', new THREE.BufferAttribute(imp.size, 1))
      const points = new THREE.Points(geo, makeMaterial())
      points.scale.setScalar(KM_PER_PC)
      points.frustumCulled = false
      points.renderOrder = -15
      // A soft glow for the bright core, sized to the galaxy (bulge-heavy ellipticals glow more).
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }))
      core.scale.setScalar(g.radiusPc * (g.kind === 'elliptical' ? 1.1 : 0.55) * KM_PER_PC)
      core.renderOrder = -15
      core.frustumCulled = false
      group.add(points, core)
      live.set(g.key, { points, core, g })
      built++
    }
    const proj = (size.height / 2 / Math.tan((cam.fovDeg * Math.PI) / 360)) * dpr
    const fromSunPc = len(cam.pos) / KM_PER_PC
    for (const { points, core, g } of live.values()) {
      points.position.set(g.center[0] - cam.pos[0], g.center[1] - cam.pos[1], g.center[2] - cam.pos[2])
      core.position.copy(points.position)
      const d = dist(cam.pos, g.center) / KM_PER_PC / g.radiusPc
      let o = 0.3 + 0.7 * smoothstep(1.5, 3, d)
      // Near home the photographed Milky Way stands in for ours, and made-up galaxies stay out of Earth's sky.
      o *= g.key === 'mw' ? smoothstep(300, 2000, fromSunPc) : smoothstep(2000, 20000, fromSunPc)
      const m = points.material as THREE.ShaderMaterial
      m.uniforms.uOpacity.value = o
      m.uniforms.uProj.value = proj
      // The core glow belongs to the view from outside; inside, the stars take over.
      core.material.opacity = 0.45 * o * smoothstep(1.2, 3, d)
    }
  })

  return <primitive object={group} />
}
