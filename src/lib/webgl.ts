/** Whether this browser can give us a WebGL context at all. */
export function webglSupport(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): 'ok' | 'none' {
  try {
    const c = createCanvas()
    return c.getContext('webgl2') || c.getContext('webgl') ? 'ok' : 'none'
  } catch {
    return 'none'
  }
}
