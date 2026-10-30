import { describe, expect, it } from 'vitest'
import { catalogState, loadCatalog } from './catalog'

function tinyCatalog(): ArrayBuffer {
  const buf = new ArrayBuffer(8 + 25)
  const dv = new DataView(buf)
  'SLM1'.split('').forEach((c, i) => dv.setUint8(i, c.charCodeAt(0)))
  dv.setUint32(4, 1, true)
  dv.setUint32(8 + 12, 7, true)
  return buf
}

const ok = (body: unknown) => ({ ok: true, arrayBuffer: async () => body, json: async () => body }) as unknown as Response
const good: typeof fetch = async url => (String(url).endsWith('.bin') ? ok(tinyCatalog()) : String(url).includes('constellations') ? ok([]) : ok({}))
const offline: typeof fetch = async () => {
  throw new Error('offline')
}
const notFound: typeof fetch = async () => ({ ok: false, status: 404 }) as Response

describe('loading the catalogue', () => {
  it('can try again after a failed load', async () => {
    await expect(loadCatalog(offline)).rejects.toThrow()
    expect(catalogState().status).toBe('error')
    await expect(loadCatalog(notFound)).rejects.toThrow()
    const c = await loadCatalog(good)
    expect(c.count).toBe(1)
    expect(catalogState().status).toBe('ready')
  })
})
