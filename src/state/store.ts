import { create } from 'zustand'
import type { InstrumentId } from '../lib/music/instruments'
import type { ScaleId } from '../lib/music/scales'
import type { BodyId } from '../lib/space/bodies'
import type { StarId } from '../lib/space/starId'
import { audio } from '../lib/music/audio'

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

export interface SkyState {
  settings: Settings
  selected: Selection | null
  toast: { id: number; text: string } | null
}

export const useSky = create<SkyState>()(() => ({
  settings: { instrument: 'chimes', scale: 'pentatonic', muted: false, figures: true, labels: true },
  selected: null,
  toast: null,
}))

const set = useSky.setState
const get = useSky.getState

let toastId = 0

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

  toast(text: string) {
    const id = ++toastId
    set({ toast: { id, text } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2800)
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
