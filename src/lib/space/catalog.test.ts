import { describe, expect, it } from 'vitest'
import { parseCatalog } from './catalog'

function build(magic: string, stars: { x: number; y: number; z: number; hyg: number; hip: number; abs: number; ci: number; con: number }[]) {
  const n = stars.length
  const buf = new ArrayBuffer(8 + n * 25)
  const dv = new DataView(buf)
  magic.split('').forEach((c, i) => dv.setUint8(i, c.charCodeAt(0)))
  dv.setUint32(4, n, true)
  let o = 8
  const put = (fn: (s: (typeof stars)[number]) => void, step: number) => {
    for (const s of stars) {
      fn(s)
      o += step
    }
  }
  put(s => {
    dv.setFloat32(o, s.x, true)
    dv.setFloat32(o + 4, s.y, true)
    dv.setFloat32(o + 8, s.z, true)
  }, 12)
  put(s => dv.setUint32(o, s.hyg, true), 4)
  put(s => dv.setUint32(o, s.hip, true), 4)
  put(s => dv.setInt16(o, s.abs * 100, true), 2)
  put(s => dv.setInt16(o, s.ci * 1000, true), 2)
  put(s => dv.setUint8(o, s.con), 1)
  return buf
}

const two = [
  { x: 1, y: 2, z: 3, hyg: 7, hip: 32349, abs: 1.45, ci: 0.009, con: 9 },
  { x: -4, y: 0.5, z: 0, hyg: 9, hip: 0, abs: -5.85, ci: 1.85, con: 255 },
]

describe('parseCatalog', () => {
  it('reads every field back', () => {
    const c = parseCatalog(build('SLM1', two))
    expect(c.count).toBe(2)
    expect([...c.pos.slice(0, 3)]).toEqual([1, 2, 3])
    expect(c.hyg[1]).toBe(9)
    expect(c.hip[0]).toBe(32349)
    expect(c.absMag[0]).toBeCloseTo(1.45)
    expect(c.ci[1]).toBeCloseTo(1.85)
    expect(c.con[1]).toBe(255)
    expect(c.byHyg.get(9)).toBe(1)
    expect(c.byHip.get(32349)).toBe(0)
    expect(c.byHip.has(0)).toBe(false)
  })
  it('rejects the wrong magic and truncated files', () => {
    expect(() => parseCatalog(build('XXXX', two))).toThrow('bad star catalogue')
    expect(() => parseCatalog(build('SLM1', two).slice(0, 40))).toThrow('bad star catalogue')
  })
})
