import { useSyncExternalStore } from 'react'
import { parseCatalog, type StarCatalog } from '../lib/space/catalog'

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
