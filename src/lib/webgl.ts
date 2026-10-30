/** Whether this browser can give us a WebGL 2 context (three.js no longer supports WebGL 1). */
export function webglSupport(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): 'ok' | 'none' {
  try {
    const gl = createCanvas().getContext('webgl2') as WebGL2RenderingContext | null
    if (!gl) return 'none'
    // Give the probe context back straight away; browsers allow only a few at once.
    gl.getExtension?.('WEBGL_lose_context')?.loseContext()
    return 'ok'
  } catch {
    return 'none'
  }
}
