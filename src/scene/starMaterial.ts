import * as THREE from 'three'
import { KM_PER_PC } from '../lib/space/units'

/**
 * Stars as GPU points. Positions are parsecs in the object's local frame; the object is scaled to
 * kilometres and placed relative to the camera, so the shader sees camera-relative kilometres.
 * Each star's apparent magnitude comes from its real distance to the camera, every frame.
 */
export function makeStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKmPerPc: { value: KM_PER_PC },
      uPixelRatio: { value: 1 },
      uMagLimit: { value: 7.8 },
      uFade: { value: 1 },
      /** Stars beyond this distance (pc) fade out; 0 = no limit. */
      uFadeFar: { value: 0 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      attribute float absMag;
      attribute vec3 color;
      uniform float uKmPerPc;
      uniform float uPixelRatio;
      uniform float uMagLimit;
      uniform float uFade;
      uniform float uFadeFar;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dPc = max(length(mv.xyz) / uKmPerPc, 1e-9);
        float m = absMag + 5.0 * log(dPc) / log(10.0) - 5.0;
        float size = clamp(2.6 * pow(10.0, -0.2 * (m - 1.0)), 1.3, 11.0);
        float alpha = clamp((uMagLimit - m) / 4.5, 0.0, 1.0) * uFade;
        if (uFadeFar > 0.0) alpha *= 1.0 - smoothstep(uFadeFar * 0.7, uFadeFar, dPc);
        vAlpha = alpha;
        // Bright stars push past 1.0 so the bloom pass catches them.
        vColor = color * (1.0 + max(0.0, 1.5 - m) * 0.45);
        gl_PointSize = size * uPixelRatio;
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
        if (alpha <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        #include <logdepthbuf_fragment>
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 7.0);
        float halo = 0.25 * exp(-d * 3.0);
        float a = (core + halo) * vAlpha * (1.0 - smoothstep(0.85, 1.0, d));
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    // Depth-tested so planets hide the stars behind them; stars never write depth.
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}
