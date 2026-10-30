// Builds public/data/constellations.json from Stellarium's "modern" sky culture (data CC BY-SA 4.0).
// Usage: node scripts/build-lines.mjs [path/to/index.json]   (downloads it when no path is given)
// Output: [{ abbr: "Ori", lines: [[hipA, hipB], ...] }] for all 88 IAU constellations.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = 'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/modern/index.json'

const json = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await (await fetch(SRC)).text()
const data = JSON.parse(json)

const out = []
for (const c of data.constellations) {
  const abbr = c.id.split(' ').pop()
  const pairs = new Set()
  const lines = []
  for (const poly of c.lines) {
    const hips = poly.filter(v => typeof v === 'number')
    for (let i = 1; i < hips.length; i++) {
      const [a, b] = [hips[i - 1], hips[i]]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (a === b || pairs.has(key)) continue
      pairs.add(key)
      lines.push([a, b])
    }
  }
  out.push({ abbr, lines })
}
out.sort((a, b) => (a.abbr < b.abbr ? -1 : 1))
await writeFile(ROOT + 'public/data/constellations.json', JSON.stringify(out))
console.log(`${out.length} constellations, ${out.reduce((n, c) => n + c.lines.length, 0)} segments`)
