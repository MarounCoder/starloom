import { describe, expect, it } from 'vitest'
import { webglSupport } from './webgl'

const canvas = (getContext: (kind: string) => unknown) => () => ({ getContext }) as unknown as HTMLCanvasElement

describe('webglSupport', () => {
  it('says none when neither WebGL 2 nor WebGL is available', () => {
    expect(webglSupport(canvas(() => null))).toBe('none')
  })
  it('says ok when WebGL 2 is available', () => {
    expect(webglSupport(canvas(k => (k === 'webgl2' ? {} : null)))).toBe('ok')
  })
  it('says none when only WebGL 1 is available (three.js needs WebGL 2)', () => {
    expect(webglSupport(canvas(k => (k === 'webgl' ? {} : null)))).toBe('none')
  })
  it('says none when asking for a context throws', () => {
    expect(
      webglSupport(
        canvas(() => {
          throw new Error('blocked')
        }),
      ),
    ).toBe('none')
  })
})
