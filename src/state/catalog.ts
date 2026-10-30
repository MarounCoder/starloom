import { useSyncExternalStore } from 'react'
import { parseCatalog, type StarCatalog } from '../lib/space/catalog'
import { apparentMag } from '../lib/space/photometry'
import { KM_PER_PC } from '../lib/space/units'

export interface Figure {
  abbr: string
  /** Pairs of catalogue indices. */
  segs: [number, number][]
}

export type StarNames = Record<string, [proper: string | null, bayer: string | null, flamsteed: string | null]>

interface CatalogState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  catalog: StarCatalog | null
  figures: Figure[]
  names: StarNames
}

let state: CatalogState = { status: 'idle', catalog: null, figures: [], names: {} }
const listeners = new Set<() => void>()
const emit = (patch: Partial<CatalogState>) => {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}

const url = (f: string) => `${import.meta.env.BASE_URL}data/${f}`

let loading: Promise<StarCatalog> | null = null

/** Fetch the real stars, figures and names once. Called after the first frame so the page paints first. */
export function loadCatalog(): Promise<StarCatalog> {
  if (loading) return loading
  emit({ status: 'loading' })
  loading = (async () => {
    const [bin, figs, names] = await Promise.all([
      fetch(url('stars.bin')).then(r => r.arrayBuffer()),
      fetch(url('constellations.json')).then(r => r.json() as Promise<{ abbr: string; lines: [number, number][] }[]>),
      fetch(url('stars-names.json')).then(r => r.json() as Promise<StarNames>),
    ])
    const catalog = parseCatalog(bin)
    const figures = figs.map(f => ({
      abbr: f.abbr,
      segs: f.lines.flatMap(([a, b]) => {
        const i = catalog.byHip.get(a)
        const j = catalog.byHip.get(b)
        return i === undefined || j === undefined ? [] : [[i, j] as [number, number]]
      }),
    }))
    emit({ status: 'ready', catalog, figures, names })
    return catalog
  })()
  loading.catch(() => emit({ status: 'error' }))
  return loading
}

export const catalogState = () => state

export function useCatalog(): CatalogState {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
  )
}

/** A catalogue star's position in km. */
export function starKm(i: number): [number, number, number] {
  const p = state.catalog!.pos
  return [p[i * 3] * KM_PER_PC, p[i * 3 + 1] * KM_PER_PC, p[i * 3 + 2] * KM_PER_PC]
}

/** A catalogue star's apparent magnitude seen from a point (km). */
export function starMagFrom(i: number, fromKm: [number, number, number]): number {
  const s = starKm(i)
  const d = Math.hypot(s[0] - fromKm[0], s[1] - fromKm[1], s[2] - fromKm[2]) / KM_PER_PC
  return apparentMag(state.catalog!.absMag[i], d)
}

/** A star's best name: proper, Bayer, Flamsteed, then its catalogue number. */
export function starName(i: number): string {
  const n = state.names[String(state.catalog!.hyg[i])]
  return n?.[0] ?? n?.[1] ?? n?.[2] ?? `HYG ${state.catalog!.hyg[i]}`
}

/** The centre (km) of a constellation figure's stars, where its name is drawn. */
export function figureCentroidKm(abbr: string): [number, number, number] | null {
  const f = state.figures.find(x => x.abbr === abbr)
  if (!f || !state.catalog) return null
  const ids = [...new Set(f.segs.flat())]
  const c: [number, number, number] = [0, 0, 0]
  for (const i of ids) {
    const p = starKm(i)
    c[0] += p[0] / ids.length
    c[1] += p[1] / ids.length
    c[2] += p[2] / ids.length
  }
  return c
}
