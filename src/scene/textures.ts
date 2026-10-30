import * as THREE from 'three'

const loader = new THREE.TextureLoader()
const cache = new Map<string, Promise<THREE.Texture>>()

/** A texture from public/textures, loaded once and shared. */
export function loadTexture(name: string, srgb = true): Promise<THREE.Texture> {
  let p = cache.get(name)
  if (!p) {
    p = loader.loadAsync(`${import.meta.env.BASE_URL}textures/${name}`).then(t => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      return t
    })
    cache.set(name, p)
  }
  return p
}

/** A soft round glow, drawn once on a canvas. */
export function glowTexture(stops: [number, string][] = [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,240,210,0.55)'], [0.5, 'rgba(255,210,150,0.12)'], [1, 'rgba(255,200,140,0)']]): THREE.Texture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [o, col] of stops) grad.addColorStop(o, col)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
