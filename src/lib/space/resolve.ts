import { withoutStars, type Constellation } from '../constellations'
import type { StarCatalog } from './catalog'
import { resolveStar } from './starId'

/** Check every star still exists (catalogue or generator); drop the ones that do not, and empty constellations. */
export function resolveSky(constellations: Constellation[], catalog: StarCatalog | null): { constellations: Constellation[]; dropped: number } {
  let dropped = 0
  const out: Constellation[] = []
  for (const c of constellations) {
    const missing = new Set<number>()
    c.stars.forEach((id, i) => {
      // Real stars can only be checked once the catalogue is in.
      if (id.startsWith('h') && !catalog) return
      if (!resolveStar(id, catalog)) missing.add(i)
    })
    dropped += missing.size
    const clean = withoutStars(c, missing)
    if (clean.stars.length) out.push(clean)
  }
  return { constellations: out, dropped }
}
