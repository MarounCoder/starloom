import { useEffect } from 'react'
import { decodeSky, readHash } from './lib/share'
import { current, sky, useSky } from './state/store'
import { stopAll, toggle } from './state/player'
import { reduceMotion } from './state/fx'
import { flyTo, HOME, view, zoomBy } from './state/view'

/** Open a sky from a `#sky=` link, on load and whenever the hash changes. */
export function useSharedLink() {
  useEffect(() => {
    const open = () => {
      const code = readHash(location.hash)
      if (code === null) return
      const shared = decodeSky(code)
      history.replaceState(null, '', location.pathname + location.search)
      if (!shared) {
        sky.toast('That share link looks broken, so here is your own sky.')
        return
      }
      stopAll()
      sky.loadShared(shared)
      flyTo(shared.camera ?? HOME, reduceMotion)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
}

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return
      const s = useSky.getState()
      const pan = (dx: number, dy: number) =>
        flyTo({ ...view.cam, x: view.cam.x + (dx * view.w) / view.cam.zoom, y: view.cam.y + (dy * view.h) / view.cam.zoom }, reduceMotion)

      if (e.key === 'Escape') {
        useSky.setState({ panel: null, placing: null, selectedBody: null, wish: null })
        return
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          sky.undo()
        }
        return
      }
      // Leave Space and Enter to focused buttons.
      if (t.closest('button') && (e.key === ' ' || e.key === 'Enter')) return
      switch (e.key) {
        case ' ': {
          e.preventDefault()
          const c = current(s)
          if (c?.seq.length) toggle(c.id)
          break
        }
        case 'n':
        case 'N':
          sky.newConstellation()
          break
        case 'Backspace':
          sky.undo()
          break
        case 'p':
        case 'P':
          useSky.setState({ panel: s.panel === 'presets' ? null : 'presets' })
          break
        case '?':
          useSky.setState({ panel: s.panel === 'help' ? null : 'help' })
          break
        case 'h':
        case 'H':
          flyTo(HOME, reduceMotion)
          break
        case '+':
        case '=':
          zoomBy(1.6, reduceMotion)
          break
        case '-':
        case '_':
          zoomBy(1 / 1.6, reduceMotion)
          break
        case 'ArrowLeft':
          pan(-0.25, 0)
          break
        case 'ArrowRight':
          pan(0.25, 0)
          break
        case 'ArrowUp':
          pan(0, -0.25)
          break
        case 'ArrowDown':
          pan(0, 0.25)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
