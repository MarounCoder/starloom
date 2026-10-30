import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BODIES, BODY_IDS, type BodyId } from '../lib/space/bodies'
import { IAU, iauIndex } from '../lib/space/iau'
import { placeLabels, type LabelReq } from '../lib/space/labels'
import { pickAt, starWeight, type Candidate } from '../lib/space/pick'
import { cam, project, screen } from '../state/camera'
import { catalogState, figureCentroidKm, starKm, starMagFrom, starName, useCatalog } from '../state/catalog'
import { positions } from '../state/clock'
import { tapHandler } from '../state/flight'
import { dist, len, type V3 } from '../lib/space/vec'
import { apparentMag } from '../lib/space/photometry'
import { resolveStar } from '../lib/space/starId'
import { universe } from '../state/universe'
import { soundStar } from '../state/player'
import { KM_PER_PC } from '../lib/space/units'
import { labelLayer } from '../state/labels'
import { parseSelectionKey, selectionKey, sky, useSky } from '../state/store'

const POOL = 48
const CHAR_W = 7.2

const bodyPriority = (id: BodyId) => (id === 'sun' ? 90 : BODIES[id].parent === 'sun' ? 80 : 60)

/** A label: the object's screen point, and its text `off` px to the right. */
type Item = LabelReq & { px: number; py: number; ring: boolean; cls: string }

/** Labels for planets, constellations and bright named stars, plus tap picking. Runs inside the canvas. */
export function SkyOverlay() {
  const size = useThree(s => s.size)
  const { catalog, figures, names } = useCatalog()
  const settings = useSky(s => s.settings)
  const selected = useSky(s => s.selected)

  useEffect(() => {
    screen.w = size.width
    screen.h = size.height
  }, [size])

  /** Figure label anchors: the centroid of each figure's stars (km). */
  const centroids = useMemo(() => {
    if (!catalog) return []
    return figures.map(f => ({ abbr: f.abbr, pos: figureCentroidKm(f.abbr)!, name: IAU[iauIndex.get(f.abbr)!].name }))
  }, [catalog, figures])

  const namedStars = useMemo(() => {
    if (!catalog) return []
    const out: number[] = []
    for (let i = 0; i < catalog.count; i++) if (names[String(catalog.hyg[i])]?.[0]) out.push(i)
    return out
  }, [catalog, names])

  const pool = useMemo(() => {
    const els: HTMLDivElement[] = []
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement('div')
      el.className = 'label'
      el.innerHTML = '<i class="label__ring"></i><span class="label__text"></span>'
      el.style.display = 'none'
      els.push(el)
    }
    return els
  }, [])

  useEffect(() => {
    const root = labelLayer.root
    if (!root) return
    pool.forEach(el => root.appendChild(el))
    return () => pool.forEach(el => el.remove())
  }, [pool])

  // Tap picking.
  useEffect(() => {
    tapHandler.current = (x, y, touch) => {
      const cands: Candidate[] = []
      const pos = positions()
      for (const id of BODY_IDS) {
        const p = project(pos[id])
        if (p.behind) continue
        const r = BODIES[id].radiusKm * p.pxPerKm
        if (Math.hypot(p.x - x, p.y - y) <= r) {
          sky.select({ kind: 'body', id })
          return
        }
        cands.push({ id: `body:${id}`, x: p.x, y: p.y, weight: 10 })
      }
      const c = catalogState().catalog
      if (c) {
        for (let i = 0; i < c.count; i++) {
          const m = starMagFrom(i, cam.pos)
          if (m > 6.5) continue
          const p = project(starKm(i))
          if (p.behind || Math.abs(p.x - x) > 40 || Math.abs(p.y - y) > 40) continue
          cands.push({ id: `star:h${c.hyg[i]}`, x: p.x, y: p.y, weight: starWeight(m) })
        }
      }
      if (useSky.getState().settings.figures) {
        for (const f of centroids) {
          const p = project(f.pos)
          if (!p.behind) cands.push({ id: `fig:${f.abbr}`, x: p.x, y: p.y, weight: 3 })
        }
      }
      // Generated stars that look bright enough to tap.
      for (const ch of universe.loaded.values()) {
        for (let i = 0; i < ch.count; i++) {
          const sp: V3 = [ch.origin[0] + ch.pos[i * 3] * KM_PER_PC, ch.origin[1] + ch.pos[i * 3 + 1] * KM_PER_PC, ch.origin[2] + ch.pos[i * 3 + 2] * KM_PER_PC]
          const p = project(sp)
          if (p.behind || Math.abs(p.x - x) > 40 || Math.abs(p.y - y) > 40) continue
          const m = apparentMag(ch.absMag[i], dist(sp, cam.pos) / KM_PER_PC)
          if (m < 6.5) cands.push({ id: `star:g${ch.key}/${i}`, x: p.x, y: p.y, weight: starWeight(m) })
        }
      }
      // Galaxies we are outside of.
      for (const g of universe.near) {
        if (universe.active.includes(g)) continue
        const p = project(g.center)
        if (!p.behind) cands.push({ id: `gal:${g.key}`, x: p.x, y: p.y, weight: 4 })
      }
      const radius = touch ? 30 : 18
      if (useSky.getState().mode === 'draw') {
        // Drawing: only stars count, and a tap joins the star and sounds it.
        const star = pickAt(cands.filter(c => c.id.startsWith('star:')), x, y, radius)
        if (!star) {
          sky.toast('Tap a star to join it')
          return
        }
        const id = star.slice(5)
        if (sky.tapStar(id)) soundStar(id)
        return
      }
      const hit = pickAt(cands, x, y, radius)
      sky.select(hit ? parseSelectionKey(hit) : null)
    }
    return () => {
      tapHandler.current = null
    }
  }, [centroids])

  useFrame(() => {
    const items: Item[] = []
    const selKey = selectionKey(selected)
    const pos = positions()
    // Discs of nearby bodies: anything farther away that falls inside one is hidden behind it.
    const discs: { x: number; y: number; r: number; z: number }[] = []
    for (const id of BODY_IDS) {
      const p = project(pos[id])
      const r = BODIES[id].radiusKm * p.pxPerKm
      if (!p.behind && r > 2) discs.push({ x: p.x, y: p.y, r, z: p.z })
    }
    const hidden = (x: number, y: number, z: number) => discs.some(d => d.z < z && Math.hypot(x - d.x, y - d.y) < d.r)
    const add = (it: Omit<Item, 'w' | 'h' | 'x' | 'y'> & { off: number }, z = Infinity) => {
      if (hidden(it.px, it.py, z)) return
      items.push({ ...it, x: it.px + it.off, y: it.py, w: it.text.length * CHAR_W + 8, h: 14 })
    }

    for (const id of BODY_IDS) {
      const p = project(pos[id])
      if (p.behind) continue
      const rpx = BODIES[id].radiusKm * p.pxPerKm
      if (rpx > screen.h * 0.6) continue
      const key = `body:${id}`
      const sel = key === selKey
      if (!settings.labels && !sel) continue
      add({ id: key, text: BODIES[id].name, px: p.x, py: p.y, off: Math.max(rpx, 4) + 6, priority: sel ? 100 : bodyPriority(id), ring: rpx < 3 || sel, cls: 'label--body' }, p.z * 0.9999)
    }
    // Constellation names only mean something near home.
    const nearHome = len(cam.pos) / KM_PER_PC < 30
    if (settings.figures) {
      for (const f of centroids) {
        const p = project(f.pos)
        const key = `fig:${f.abbr}`
        if (p.behind || ((!settings.labels || !nearHome) && key !== selKey)) continue
        add({ id: key, text: f.name.toUpperCase(), px: p.x, py: p.y, off: 0, priority: key === selKey ? 100 : 50, ring: false, cls: 'label--figure' })
      }
    }
    if (catalog && settings.labels) {
      for (const i of namedStars) {
        if (`star:h${catalog.hyg[i]}` === selKey) continue
        const m = starMagFrom(i, cam.pos)
        if (m > 2.5) continue
        const p = project(starKm(i))
        if (p.behind) continue
        add({ id: `star:h${catalog.hyg[i]}`, text: starName(i), px: p.x, py: p.y, off: 7, priority: 40 - m, ring: false, cls: 'label--star' })
      }
    }
    for (const g of universe.near) {
      if (universe.active.includes(g) || (g.key !== 'mw' && len(cam.pos) / KM_PER_PC < 20000)) continue
      const p = project(g.center)
      if (p.behind) continue
      const key = `gal:${g.key}`
      add({ id: key, text: g.name.replace(' (generated)', ''), px: p.x, py: p.y, off: 10, priority: key === selKey ? 100 : 45, ring: key === selKey, cls: 'label--galaxy' })
    }
    if (selected?.kind === 'star' && selected.id.startsWith('g')) {
      const r = resolveStar(selected.id, null)
      const p = r && project(r.posKm)
      if (p && !p.behind) add({ id: selKey!, text: 'Uncharted star', px: p.x, py: p.y, off: 11, priority: 100, ring: true, cls: 'label--star' })
    }
    if (catalog && selected?.kind === 'star' && selected.id.startsWith('h')) {
      const i = catalog.byHyg.get(Number(selected.id.slice(1)))
      if (i !== undefined) {
        const p = project(starKm(i))
        if (!p.behind) add({ id: selKey!, text: starName(i), px: p.x, py: p.y, off: 11, priority: 100, ring: true, cls: 'label--star' })
      }
    }

    const shown = placeLabels(
      items.filter(it => it.x > -50 && it.x < screen.w + 50 && it.y > -20 && it.y < screen.h + 20),
      40,
    )
    let k = 0
    for (const it of items) {
      if (!shown.has(it.id) || k >= POOL) continue
      shown.delete(it.id)
      const el = pool[k++]
      el.style.display = ''
      el.className = `label ${it.cls}${it.ring ? ' label--ring' : ''}${it.id === selKey ? ' label--sel' : ''}`
      el.style.transform = `translate3d(${it.px.toFixed(1)}px, ${it.py.toFixed(1)}px, 0)`
      el.style.setProperty('--off', `${(it.x - it.px).toFixed(1)}px`)
      ;(el.lastChild as HTMLElement).textContent = it.text
    }
    for (; k < POOL; k++) pool[k].style.display = 'none'
  })

  return null
}
