import { Canvas } from '@react-three/fiber'

/** The 3D sky. The camera stays at the origin; every object is placed relative to it each frame. */
export function Universe() {
  return (
    <Canvas
      className="sky"
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      camera={{ near: 0.5, far: 1e27, fov: 50, position: [0, 0, 0] }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#05060d']} />
    </Canvas>
  )
}
