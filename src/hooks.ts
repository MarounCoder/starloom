import { useEffect } from 'react'
import { active, sky, useSky } from './state/store'
import { toggle } from './state/player'
import { cancelTravel, exitOrbit, flyTo } from './state/flight'
import { cam } from './state/camera'
import { catalogState, useCatalog } from './state/catalog'
import { decodeSky, readHash } from './lib/share'
import { resolveSky } from './lib/space/resolve'

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

function resolveNow(alreadyDropped = 0) {
  const { catalog } = catalogState()
  const s = useSky.getState()
  const { constellations, dropped } = resolveSky(s.constellations, catalog)
  if (dropped) sky.setConstellations(constellations)
  const n = dropped + alreadyDropped
  if (n) sky.toast(n === 1 ? 'One star could not be found and was left out' : `${n} stars could not be found and were left out`)
}

/** Once the real catalogue is in, check every saved or shared star still exists. */
export function useResolveStars() {
  const { status } = useCatalog()
  useEffect(() => {
    if (status === 'ready') resolveNow()
  }, [status])
}

/** Open a sky from a `#sky=` link: show it without touching the viewer's own, and go where it was shared from. */
export function useSharedLink() {
  useEffect(() => {
    const open = () => {
      const str = readHash(location.hash)
      if (!str) return
      history.replaceState(null, '', location.pathname + location.search)
      const shared = decodeSky(str)
      if (!shared) {
        sky.toast('That link could not be read, so here is your own sky')
        return
      }
      sky.loadShared(shared.constellations, { instrument: shared.instrument, scale: shared.scale })
      if (shared.camera) {
        exitOrbit()
        cancelTravel()
        Object.assign(cam, shared.camera)
      }
      sky.select(shared.target)
      resolveNow(shared.dropped)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
}
