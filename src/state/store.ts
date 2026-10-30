import { create } from 'zustand'
import type { InstrumentId } from '../lib/music/instruments'
import type { ScaleId } from '../lib/music/scales'
import type { BodyId } from '../lib/space/bodies'
import type { StarId } from '../lib/space/starId'
import { audio } from '../lib/music/audio'
import { HUES, newId, tapStar, undoLast, type Constellation } from '../lib/constellations'
import { randomName } from '../lib/names'

export interface Settings {
  instrument: InstrumentId
  scale: ScaleId
  muted: boolean
  figures: boolean
  labels: boolean
}

export type Selection =
  | { kind: 'body'; id: BodyId }
  | { kind: 'star'; id: StarId }
  | { kind: 'figure'; abbr: string }
  | { kind: 'galaxy'; id: string }

export type Panel = null | 'settings' | 'share' | 'help' | 'about'

interface Saved {
  constellations: Constellation[]
  activeId: string | null
  settings: Settings
  welcomed: boolean
}

export interface SkyState extends Saved {
  mode: 'explore' | 'draw'
  selected: Selection | null
  playing: string[]
  panel: Panel
  /** True while looking at a sky opened from a link; nothing is saved until the viewer keeps it. */
  shared: boolean
  toast: { id: number; text: string } | null
}

export const STORAGE_KEY = 'starloom:sky:v2'

const DEFAULT_SETTINGS: Settings = { instrument: 'chimes', scale: 'pentatonic', muted: false, figures: true, labels: true }

function blank(): Saved {
  return { constellations: [], activeId: null, settings: DEFAULT_SETTINGS, welcomed: false }
}

/** The saved sky, or a fresh one. Star ids are checked against the catalogue later (see resolveSky). */
export function loadSaved(): Saved {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (d && Array.isArray(d.constellations)) {
      const constellations = (d.constellations as Constellation[]).filter(
        c => c && typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.stars) && Array.isArray(c.seq),
      )
      return {
        constellations,
        activeId: constellations.some(c => c.id === d.activeId) ? d.activeId : null,
        settings: { ...DEFAULT_SETTINGS, ...d.settings },
        welcomed: !!d.welcomed,
      }
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return blank()
}

const initial = typeof localStorage === 'undefined' ? blank() : loadSaved()
audio.instrument = initial.settings.instrument
audio.muted = initial.settings.muted

export const useSky = create<SkyState>()(() => ({
  ...initial,
  mode: 'explore',
  selected: null,
  playing: [],
  panel: null,
  shared: false,
  toast: null,
}))

const set = useSky.setState
const get = useSky.getState

let saveTimer = 0
useSky.subscribe(s => {
  if (s.shared || typeof localStorage === 'undefined') return
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const { constellations, activeId, settings, welcomed } = get()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ constellations, activeId, settings, welcomed }))
    } catch {
      /* storage full or blocked */
    }
  }, 300)
})

export const active = (s: SkyState = get()) => s.constellations.find(c => c.id === s.activeId) ?? null

function replace(c: Constellation) {
  set(s => ({ constellations: s.constellations.map(x => (x.id === c.id ? c : x)) }))
}

let toastId = 0

/** The viewer's own sky, kept aside while they look at a shared one. */
let ownSky: Saved | null = null

export const sky = {
  setSettings(patch: Partial<Settings>) {
    const settings = { ...get().settings, ...patch }
    audio.instrument = settings.instrument
    audio.muted = settings.muted
    set({ settings })
  },

  select(selected: Selection | null) {
    set({ selected })
  },

  toggleDraw() {
    const mode = get().mode === 'draw' ? 'explore' : 'draw'
    set({ mode })
    if (mode === 'draw' && !active()) sky.newConstellation()
  },

  /** Join a star to the active constellation (starting one if needed). Returns whether anything changed. */
  tapStar(id: StarId): boolean {
    let c = active()
    if (!c) {
      sky.newConstellation()
      c = active()!
    }
    const next = tapStar(c, id)
    if (next === c) return false
    replace(next)
    return true
  },

  newConstellation() {
    const s = get()
    const c = active(s)
    if (c && !c.stars.length) {
      replace({ ...c, name: randomName() })
      return
    }
    const fresh: Constellation = { id: newId(), name: randomName(), hue: s.constellations.length % HUES.length, stars: [], seq: [] }
    set({ constellations: [...s.constellations, fresh], activeId: fresh.id })
  },

  /** Undo the last link; an empty constellation is removed. */
  undo() {
    const s = get()
    const c = active(s)
    if (!c) return
    if (!c.seq.length) {
      sky.remove(c.id)
      return
    }
    replace(undoLast(c))
  },

  remove(id: string) {
    const rest = get().constellations.filter(x => x.id !== id)
    set({ constellations: rest, activeId: rest[rest.length - 1]?.id ?? null })
  },

  rename(name: string) {
    const c = active()
    if (c) replace({ ...c, name })
  },

  setActive(id: string) {
    set({ activeId: id })
  },

  /** Add a finished constellation (a copy of a real figure) and make it the active one. */
  add(c: Constellation) {
    set(s => ({ constellations: [...s.constellations, { ...c, hue: s.constellations.length % HUES.length }], activeId: c.id }))
  },

  openPanel(panel: Panel) {
    set(s => ({ panel: s.panel === panel ? null : panel }))
  },

  welcome() {
    set({ welcomed: true })
  },

  toast(text: string) {
    const id = ++toastId
    set({ toast: { id, text } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2800)
  },

  /** Show a sky from a link without touching the viewer's own (nothing is saved meanwhile). */
  loadShared(constellations: Constellation[], patch: Partial<Settings>) {
    const s = get()
    if (!s.shared) ownSky = { constellations: s.constellations, activeId: s.activeId, settings: s.settings, welcomed: s.welcomed }
    const settings = { ...s.settings, ...patch }
    audio.instrument = settings.instrument
    set({ shared: true, constellations, activeId: constellations[0]?.id ?? null, settings, welcomed: true })
  },

  /** Merge the shared constellations into the viewer's own sky and start saving again. */
  keepShared() {
    const s = get()
    const own = ownSky ?? loadSaved()
    const ids = new Set(own.constellations.map(c => c.id))
    ownSky = null
    set({ shared: false, constellations: [...own.constellations, ...s.constellations.filter(c => !ids.has(c.id))], activeId: s.activeId })
  },

  leaveShared() {
    const own = ownSky ?? loadSaved()
    ownSky = null
    audio.instrument = own.settings.instrument
    set({ ...own, shared: false, playing: [] })
  },

  /** Replace the constellations after their stars were checked (unknown ones dropped). */
  setConstellations(constellations: Constellation[]) {
    set(s => ({ constellations, activeId: constellations.some(c => c.id === s.activeId) ? s.activeId : (constellations[constellations.length - 1]?.id ?? null) }))
  },
}

/** A selection as a single string, the form picking and labels use. */
export function selectionKey(s: Selection | null): string | null {
  if (!s) return null
  return s.kind === 'body' ? `body:${s.id}` : s.kind === 'star' ? `star:${s.id}` : s.kind === 'figure' ? `fig:${s.abbr}` : `gal:${s.id}`
}

export function parseSelectionKey(k: string): Selection | null {
  const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)]
  if (kind === 'body') return { kind: 'body', id: id as BodyId }
  if (kind === 'star') return { kind: 'star', id }
  if (kind === 'fig') return { kind: 'figure', abbr: id }
  if (kind === 'gal') return { kind: 'galaxy', id }
  return null
}
