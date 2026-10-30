import { create } from 'zustand'
import type { InstrumentId } from '../lib/music/instruments'
import type { ScaleId } from '../lib/music/scales'
import { audio } from '../lib/music/audio'

export interface Settings {
  instrument: InstrumentId
  scale: ScaleId
  muted: boolean
}

export interface SkyState {
  settings: Settings
  toast: { id: number; text: string } | null
}

export const useSky = create<SkyState>()(() => ({
  settings: { instrument: 'chimes', scale: 'pentatonic', muted: false },
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

  toast(text: string) {
    const id = ++toastId
    set({ toast: { id, text } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2800)
  },
}
