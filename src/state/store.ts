import { create } from 'zustand'
import { addStar, HUES, linkStar, newId, undoLast, type Constellation, type Star } from '../lib/constellations'
import { instantiatePreset, presetById } from '../lib/presets'
import { randomName } from '../lib/names'
import type { InstrumentId } from '../lib/music/instruments'
import type { ScaleId } from '../lib/music/scales'
import type { SharedSky } from '../lib/share'
import { audio } from '../lib/music/audio'

export interface Settings {
  instrument: InstrumentId
  scale: ScaleId
  timeMode: 'cycle' | 'night'
  muted: boolean
}

export type Panel = null | 'presets' | 'settings' | 'share' | 'help' | 'places'

interface Saved {
  constellations: Constellation[]
  currentId: string | null
  settings: Settings
  wishes: number
  welcomed: boolean
}

export interface SkyState extends Saved {
  panel: Panel
  /** Preset waiting to be dropped on the sky. */
  placing: string | null
  selectedBody: string | null
  wish: { text: string; n: number } | null
  playing: string[]
  /** True while looking at a sky opened from a link; nothing is saved until the viewer keeps it. */
  shared: boolean
  focus: { cid: string; idx: number } | null
  toast: { id: number; text: string } | null
}

const KEY = 'starloom:sky:v1'

function starterSky(): Saved {
  const orion = instantiatePreset(presetById('orion')!, -200, 40, 380, 0)
  const cas = instantiatePreset(presetById('cassiopeia')!, 340, -190, 230, 1)
  return {
    constellations: [orion, cas],
    currentId: orion.id,
    settings: { instrument: 'chimes', scale: 'pentatonic', timeMode: 'cycle', muted: false },
    wishes: 0,
    welcomed: false,
  }
}

function load(): Saved {
  const base = starterSky()
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (d && Array.isArray(d.constellations)) {
      return {
        constellations: d.constellations,
        currentId: d.currentId ?? null,
        settings: { ...base.settings, ...d.settings },
        wishes: d.wishes | 0,
        welcomed: !!d.welcomed,
      }
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return base
}

/** The viewer's own sky, kept aside while they look at a shared one. */
let ownSky: Saved | null = null

const initial = load()
audio.instrument = initial.settings.instrument
audio.muted = initial.settings.muted

export const useSky = create<SkyState>()(() => ({
  ...initial,
  panel: null,
  placing: null,
  selectedBody: null,
  wish: null,
  playing: [],
  shared: false,
  focus: null,
  toast: null,
}))

const set = useSky.setState
const get = useSky.getState

let saveTimer = 0
useSky.subscribe(s => {
  if (s.shared) return
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const { constellations, currentId, settings, wishes, welcomed } = get()
    try {
      localStorage.setItem(KEY, JSON.stringify({ constellations, currentId, settings, wishes, welcomed }))
    } catch {
      /* storage full or blocked */
    }
  }, 300)
})

export const current = (s: SkyState = get()) => s.constellations.find(c => c.id === s.currentId) ?? null

function replace(c: Constellation) {
  set(s => ({ constellations: s.constellations.map(x => (x.id === c.id ? c : x)) }))
}

function nextHue(s: SkyState) {
  return s.constellations.length % HUES.length
}

let toastId = 0

export const sky = {
  /** Place a new star; dropped-in presets are never extended, a new constellation starts instead. */
  addStarAt(x: number, y: number, b: number): { cid: string; idx: number } {
    let c = current()
    if (!c || c.preset) {
      sky.newConstellation()
      c = current()!
    }
    const next = addStar(c, { x, y, b } satisfies Star)
    replace(next)
    const idx = next.stars.length - 1
    set({ focus: { cid: next.id, idx } })
    return { cid: next.id, idx }
  },

  /** Tapping a star selects its constellation, or joins it to the current one. Returns the new seq index if a line was added. */
  tapStar(cid: string, idx: number): number | null {
    const s = get()
    set({ focus: { cid, idx } })
    if (cid !== s.currentId) {
      set({ currentId: cid })
      return null
    }
    const c = current()!
    if (c.preset) return null
    const next = linkStar(c, idx)
    if (next === c) return null
    replace(next)
    return next.seq.length - 1
  },

  newConstellation() {
    const s = get()
    const c = current(s)
    if (c && !c.stars.length) {
      replace({ ...c, name: randomName() })
      return
    }
    const fresh: Constellation = { id: newId(), name: randomName(), hue: nextHue(s), stars: [], seq: [] }
    set({ constellations: [...s.constellations, fresh], currentId: fresh.id, focus: null })
  },

  /** Undo the last link; an empty or dropped-in constellation is removed entirely. */
  undo() {
    const s = get()
    const c = current(s)
    if (!c) return
    if (c.preset || !c.seq.length) {
      const rest = s.constellations.filter(x => x.id !== c.id)
      set({ constellations: rest, currentId: rest[rest.length - 1]?.id ?? null, focus: null })
      return
    }
    replace(undoLast(c))
    set({ focus: null })
  },

  rename(name: string) {
    const c = current()
    if (c) replace({ ...c, name })
  },

  select(cid: string) {
    set({ currentId: cid })
  },

  placePreset(id: string, x: number, y: number, size: number) {
    const p = presetById(id)
    if (!p) return null
    const c = instantiatePreset(p, x, y, size, nextHue(get()))
    set(s => ({ constellations: [...s.constellations, c], currentId: c.id, placing: null }))
    return c
  },

  clearSky() {
    const fresh: Constellation = { id: newId(), name: randomName(), hue: 0, stars: [], seq: [] }
    set({ constellations: [fresh], currentId: fresh.id, focus: null, playing: [] })
  },

  setSettings(patch: Partial<Settings>) {
    const settings = { ...get().settings, ...patch }
    audio.instrument = settings.instrument
    audio.muted = settings.muted
    set({ settings })
  },

  catchWish(text: string) {
    const n = get().wishes + 1
    set({ wishes: n, wish: { text, n } })
  },

  toast(text: string) {
    const id = ++toastId
    set({ toast: { id, text } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2800)
  },

  loadShared(sh: SharedSky) {
    const s = get()
    if (!s.shared) {
      ownSky = { constellations: s.constellations, currentId: s.currentId, settings: s.settings, wishes: s.wishes, welcomed: s.welcomed }
    }
    const settings = { ...s.settings, instrument: sh.instrument, scale: sh.scale }
    audio.instrument = settings.instrument
    set({
      shared: true,
      constellations: sh.constellations,
      currentId: sh.constellations[0]?.id ?? null,
      settings,
      welcomed: true,
      focus: null,
    })
  },

  /** Merge the shared constellations into the viewer's own sky and start saving again. */
  keepShared() {
    const s = get()
    const own = ownSky ?? load()
    const ids = new Set(own.constellations.map(c => c.id))
    const merged = [...own.constellations, ...s.constellations.filter(c => !ids.has(c.id))]
    ownSky = null
    set({ shared: false, constellations: merged, currentId: s.currentId })
  },

  leaveShared() {
    const own = ownSky ?? load()
    ownSky = null
    audio.instrument = own.settings.instrument
    set({ ...own, shared: false, focus: null, playing: [] })
  },
}
