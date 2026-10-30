import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ECL_NORTH } from '../lib/space/frames'
import { anglesFor, cam, camForward, homePose, notifyCam } from '../state/camera'
import { clock, positions, tick } from '../state/clock'
import { SolarSystem } from './SolarSystem'

Object.assign(cam, homePose(clock.now(), typeof innerWidth === 'number' ? innerWidth / innerHeight : 1.6))

/** `?debug` exposes the camera and clock to the screenshot scripts. */
const debug = typeof location !== 'undefined' && location.search.includes('debug')
const hook = { frames: 0, cam, clock, positions, anglesFor }
if (debug) (window as unknown as { __starloom: typeof hook }).__starloom = hook

/** Runs first every frame: advance time and point the camera. The camera itself never leaves the origin. */
function CameraRig() {
  useFrame(({ camera }, dt) => {
    tick(Math.min(dt, 0.1))
    const f = camForward()
    camera.position.set(0, 0, 0)
    camera.up.set(ECL_NORTH[0], ECL_NORTH[1], ECL_NORTH[2])
    camera.lookAt(f[0], f[1], f[2])
    notifyCam()
    hook.frames++
  }, -2)
  return null
}

export function Universe({ onContextLost }: { onContextLost?: () => void }) {
  return (
    <Canvas
      className="sky"
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      camera={{ near: 0.5, far: 1e27, fov: cam.fovDeg, position: [0, 0, 0] }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', e => {
          e.preventDefault()
          onContextLost?.()
        })
      }}
    >
      <color attach="background" args={['#05060d']} />
      <CameraRig />
      <SolarSystem />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.9} intensity={1.2} />
      </EffectComposer>
    </Canvas>
  )
}
