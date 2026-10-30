// Downloads the planet and Milky Way maps from Solar System Scope (CC BY 4.0)
// into public/textures. Run once: `node scripts/fetch-textures.mjs`. The files are committed.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../public/textures/', import.meta.url))
const BASE = 'https://www.solarsystemscope.com/textures/download/'
const FILES = [
  '2k_sun.jpg', '2k_mercury.jpg', '2k_venus_atmosphere.jpg', '2k_earth_daymap.jpg', '2k_earth_clouds.jpg',
  '2k_moon.jpg', '2k_mars.jpg', '2k_jupiter.jpg', '2k_saturn.jpg', '2k_saturn_ring_alpha.png',
  '2k_uranus.jpg', '2k_neptune.jpg', '2k_stars_milky_way.jpg', '8k_stars_milky_way.jpg',
]

await mkdir(OUT, { recursive: true })
for (const f of FILES) {
  const res = await fetch(BASE + f)
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(OUT + f, buf)
  console.log(f, (buf.length / 1024).toFixed(0), 'KB')
}
