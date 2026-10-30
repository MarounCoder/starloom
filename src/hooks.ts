import { useEffect } from 'react'
import { active, sky, useSky } from './state/store'
import { toggle } from './state/player'
import { flyTo } from './state/flight'

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** Keyboard shortcuts for everything that is not flying (WASD and arrows live in FlightInput). */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      const s = useSky.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        sky.undo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key.toLowerCase()) {
        case ' ': {
          e.preventDefault()
          const c = active(s)
          const target = c?.seq.length ? c.id : s.selected?.kind === 'figure' ? `fig:${s.selected.abbr}` : null
          if (target) toggle(target)
          break
        }
        case 'c':
          sky.toggleDraw()
          break
        case 'n':
          sky.newConstellation()
          break
        case 'f':
          sky.setSettings({ figures: !s.settings.figures })
          break
        case 'l':
          sky.setSettings({ labels: !s.settings.labels })
          break
        case 'h':
          flyTo({ kind: 'body', id: 'earth' })
          break
        case '?':
          sky.openPanel('help')
          break
        case 'escape':
          if (s.panel) sky.openPanel(s.panel)
          else if (s.mode === 'draw') sky.toggleDraw()
          else sky.select(null)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
