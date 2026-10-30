import { describe, expect, it } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import { BREAK, type Constellation } from './constellations'
import { decodeSky, encodeSky, readHash, type SharedSky } from './share'

const sky: SharedSky = {
  constellations: [
    { id: 'a', name: 'La Tasse Céleste', hue: 2, stars: ['h32263', 'gmw/2/1,-3,4/17', 'g1,0,-2.1/3/0,0,0/5'], seq: [0, 1, BREAK, 1, 2] },
  ],
  instrument: 'glass',
  scale: 'lydian',
  camera: { pos: [1.5e13, -2.25e14, 3e8], yaw: 1.2345, pitch: -0.5 },
  target: { kind: 'star', id: 'gmw/2/1,-3,4/17' },
}

describe('share links', () => {
  it('round-trip real and generated stars, the camera and the target', () => {
    const back = decodeSky(encodeSky(sky))!
    expect(back.instrument).toBe('glass')
    expect(back.scale).toBe('lydian')
    expect(back.target).toEqual(sky.target)
    expect(back.camera!.pos).toEqual(sky.camera!.pos)
    expect(back.camera!.yaw).toBeCloseTo(1.2345, 4)
    const c = back.constellations[0]
    expect(c.name).toBe('La Tasse Céleste')
    expect(c.stars).toEqual(sky.constellations[0].stars)
    expect(c.seq).toEqual(sky.constellations[0].seq)
  })
  it('reject garbage, truncated and old flat-sky links', () => {
    expect(decodeSky('not a sky')).toBeNull()
    expect(decodeSky(encodeSky(sky).slice(0, 30))).toBeNull()
    const v1 = compressToEncodedURIComponent(JSON.stringify({ v: 1, i: 'chimes', s: 'pentatonic', cam: null, c: [] }))
    expect(decodeSky(v1)).toBeNull()
  })
  it('drop only the stars whose ids are malformed, keeping a valid sequence', () => {
    const bad: Constellation = { id: 'b', name: 'x', hue: 0, stars: ['h1', 'not-a-star', 'h3'], seq: [0, 1, 2, 1, 0] }
    const back = decodeSky(encodeSky({ ...sky, constellations: [bad] }))!
    const c = back.constellations[0]
    expect(c.stars).toEqual(['h1', 'h3'])
    expect(c.seq.every(i => i === BREAK || (i >= 0 && i < c.stars.length))).toBe(true)
    expect(c.seq.filter(i => i !== BREAK)).toEqual([0, 1, 0])
  })
  it('ignore an unknown target', () => {
    const back = decodeSky(encodeSky({ ...sky, target: { kind: 'body', id: 'pluto' as never } }))!
    expect(back.target).toBeNull()
  })
  it('read the hash', () => {
    expect(readHash('#sky=abc')).toBe('abc')
    expect(readHash('#other')).toBeNull()
  })
})
