// Packs the HYG star database (v4.1, CC BY-SA 4.0) into public/data/stars.bin and stars-names.json.
// Usage (after build-lines.mjs): node scripts/build-stars.mjs [path/to/hygdata_v41.csv]   (downloads it when no path is given)
//
// stars.bin, little-endian, structure of arrays, every block aligned:
//   "SLM1", count u32, pos f32[3n] (parsecs, equatorial J2000, Sun at origin), hyg u32[n], hip u32[n],
//   absMag i16[n] (×100), ci i16[n] (B–V ×1000), con u8[n] (index into IAU, 255 = none)
// Stars are sorted by apparent magnitude, brightest first.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
const MAG_LIMIT = 7.5
const NEAR_PC = 25
const UNKNOWN_PC = 1000

const iauSrc = await readFile(ROOT + 'src/lib/space/iau.ts', 'utf8')
const ABBRS = [...iauSrc.matchAll(/abbr: '(\w+)'/g)].map(m => m[1])
if (ABBRS.length !== 88) throw new Error(`expected 88 IAU constellations, found ${ABBRS.length}`)
const conIndex = new Map(ABBRS.map((a, i) => [a, i]))

// Every star a constellation figure uses is kept, however faint (run build-lines.mjs first).
const figureHips = new Set(JSON.parse(await readFile(ROOT + 'public/data/constellations.json', 'utf8')).flatMap(c => c.lines.flat()))

const GREEK = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
}
const SUP = { 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

function bayerName(bayer, con) {
  if (!bayer || !con) return null
  const [letter, n] = bayer.split('-')
  const g = GREEK[letter]
  return g ? `${g}${n ? (SUP[n] ?? n) : ''} ${con}` : null
}

/** Split one CSV line, honouring double quotes. */
function splitCsv(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

const text = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await (await fetch(SRC)).text()
const lines = text.split(/\r?\n/)
const head = splitCsv(lines[0])
const col = Object.fromEntries(head.map((h, i) => [h, i]))

const stars = []
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue
  const r = splitCsv(lines[i])
  const id = +r[col.id]
  let dist = +r[col.dist]
  const mag = +r[col.mag]
  const inFigure = figureHips.has(+r[col.hip])
  let [x, y, z] = [+r[col.x], +r[col.y], +r[col.z]]
  let absMag = +r[col.absmag]
  if (id === 0 || !(dist > 0)) continue
  if (dist >= 100000) {
    // Unknown distance. Figure stars are kept at a nominal 1,000 pc with their real brightness from Earth.
    if (!inFigure) continue
    const k = UNKNOWN_PC / dist
    ;[x, y, z, dist, absMag] = [x * k, y * k, z * k, UNKNOWN_PC, mag - 5 * Math.log10(UNKNOWN_PC) + 5]
  }
  if (!(mag <= MAG_LIMIT || dist <= NEAR_PC || inFigure)) continue
  const con = r[col.con]
  const ci = r[col.ci] === '' ? 0.65 : +r[col.ci]
  stars.push({
    id,
    hip: +r[col.hip] || 0,
    x, y, z,
    mag,
    absMag,
    ci,
    con: conIndex.has(con) ? conIndex.get(con) : 255,
    proper: r[col.proper] || null,
    bayer: bayerName(r[col.bayer], con),
    flam: r[col.flam] && con ? `${r[col.flam]} ${con}` : null,
  })
}
stars.sort((a, b) => a.mag - b.mag)

const n = stars.length
const size = 8 + n * (12 + 4 + 4 + 2 + 2 + 1)
const buf = new ArrayBuffer(size)
const dv = new DataView(buf)
'SLM1'.split('').forEach((c, i) => dv.setUint8(i, c.charCodeAt(0)))
dv.setUint32(4, n, true)
let o = 8
for (const s of stars) {
  dv.setFloat32(o, s.x, true)
  dv.setFloat32(o + 4, s.y, true)
  dv.setFloat32(o + 8, s.z, true)
  o += 12
}
for (const s of stars) (dv.setUint32(o, s.id, true), (o += 4))
for (const s of stars) (dv.setUint32(o, s.hip, true), (o += 4))
for (const s of stars) (dv.setInt16(o, Math.round(s.absMag * 100), true), (o += 2))
for (const s of stars) (dv.setInt16(o, Math.round(Math.max(-0.5, Math.min(2.5, s.ci)) * 1000), true), (o += 2))
for (const s of stars) (dv.setUint8(o, s.con), (o += 1))

const names = {}
for (const s of stars) if (s.proper || s.bayer || s.flam) names[s.id] = [s.proper, s.bayer, s.flam]

await mkdir(ROOT + 'public/data', { recursive: true })
await writeFile(ROOT + 'public/data/stars.bin', new Uint8Array(buf))
await writeFile(ROOT + 'public/data/stars-names.json', JSON.stringify(names))
console.log(`${n} stars, ${(size / 1024).toFixed(0)} KB, ${Object.keys(names).length} named`)
