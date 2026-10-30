/** The real star catalogue, decoded from public/data/stars.bin (see scripts/build-stars.mjs). */
export interface StarCatalog {
  count: number
  /** Parsecs, equatorial J2000, Sun at the origin; 3 per star. */
  pos: Float32Array
  hyg: Uint32Array
  hip: Uint32Array
  absMag: Float32Array
  /** B–V colour index. */
  ci: Float32Array
  /** Index into IAU, 255 = none. */
  con: Uint8Array
  byHyg: Map<number, number>
  byHip: Map<number, number>
}

const BYTES_PER_STAR = 12 + 4 + 4 + 2 + 2 + 1

export function parseCatalog(buf: ArrayBuffer): StarCatalog {
  const bad = () => new Error('bad star catalogue')
  if (buf.byteLength < 8) throw bad()
  const head = new Uint8Array(buf, 0, 4)
  if (String.fromCharCode(...head) !== 'SLM1') throw bad()
  const n = new DataView(buf).getUint32(4, true)
  if (buf.byteLength !== 8 + n * BYTES_PER_STAR) throw bad()

  let o = 8
  const pos = new Float32Array(buf, o, n * 3)
  o += n * 12
  const hyg = new Uint32Array(buf, o, n)
  o += n * 4
  const hip = new Uint32Array(buf, o, n)
  o += n * 4
  const abs16 = new Int16Array(buf, o, n)
  o += n * 2
  const ci16 = new Int16Array(buf, o, n)
  o += n * 2
  const con = new Uint8Array(buf, o, n)

  const absMag = Float32Array.from(abs16, v => v / 100)
  const ci = Float32Array.from(ci16, v => v / 1000)
  const byHyg = new Map<number, number>()
  const byHip = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    byHyg.set(hyg[i], i)
    if (hip[i]) byHip.set(hip[i], i)
  }
  return { count: n, pos, hyg, hip, absMag, ci, con, byHyg, byHip }
}
