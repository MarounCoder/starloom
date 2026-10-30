import { useState } from 'react'
import { Dices, Image, ListMusic, Play, Plus, Settings, Share2, Square, Star, Undo2 } from 'lucide-react'
import { current, sky, useSky } from '../state/store'
import { toggle, togglePlayAll } from '../state/player'
import { clock } from '../state/fx'
import { view } from '../state/view'
import { randomName } from '../lib/names'
import { exportPoster } from '../render/poster'
import { Tool } from './ui'

export function Toolbar() {
  const cur = useSky(s => current(s))
  const playing = useSky(s => s.playing)
  const panel = useSky(s => s.panel)
  const [saving, setSaving] = useState(false)

  const isPlaying = !!cur && playing.includes(cur.id)
  const openPanel = (p: typeof panel) => useSky.setState({ panel: panel === p ? null : p, placing: null })

  const poster = async () => {
    setSaving(true)
    const s = useSky.getState()
    try {
      await exportPoster({
        cam: view.cam,
        screenW: view.w,
        screenH: view.h,
        constellations: s.constellations,
        currentId: s.currentId,
        solarDays: clock.solarDays,
      })
      sky.toast('Poster saved to your downloads')
    } catch {
      sky.toast('The poster could not be created in this browser')
    } finally {
      setSaving(false)
    }
  }

  return (
    <nav className="toolbar" aria-label="Sky controls">
      <div className="namefield">
        <label htmlFor="constellation-name" className="sr-only">
          Constellation name
        </label>
        <input
          id="constellation-name"
          type="text"
          maxLength={48}
          autoComplete="off"
          spellCheck={false}
          placeholder="Tap the sky to begin"
          value={cur?.name ?? ''}
          disabled={!cur}
          onChange={e => sky.rename(e.target.value)}
        />
        <button type="button" className="dice" onClick={() => cur && sky.rename(randomName())} disabled={!cur} title="Give it a new name" aria-label="Give it a new name">
          <Dices size={16} strokeWidth={1.6} aria-hidden />
        </button>
      </div>
      <div className="tools">
        <Tool
          icon={isPlaying ? Square : Play}
          label={isPlaying ? 'Stop' : 'Play'}
          primary
          keepLabel
          disabled={!cur || !cur.seq.length}
          onClick={() => cur && toggle(cur.id)}
          title="Play this constellation (Space)"
        />
        <Tool
          icon={ListMusic}
          label={playing.length ? 'Stop all' : 'Play all'}
          active={playing.length > 1}
          onClick={() => {
            const n = togglePlayAll()
            if (n === 0) sky.toast('No constellations in view to play')
          }}
          title="Play every constellation in view together"
        />
        <Tool icon={Undo2} label="Undo" onClick={sky.undo} disabled={!cur} title="Undo (Ctrl+Z)" />
        <Tool icon={Plus} label="New" onClick={sky.newConstellation} title="Start a new constellation (N)" />
        <span className="tools__sep" aria-hidden />
        <Tool icon={Star} label="Presets" active={panel === 'presets'} onClick={() => openPanel('presets')} title="Drop in a famous constellation (P)" />
        <Tool icon={Share2} label="Share" active={panel === 'share'} onClick={() => openPanel('share')} />
        <Tool icon={Image} label={saving ? 'Saving…' : 'Poster'} disabled={saving} onClick={poster} title="Save this view as a star chart poster" />
        <Tool icon={Settings} label="Settings" active={panel === 'settings'} onClick={() => openPanel('settings')} />
      </div>
    </nav>
  )
}
