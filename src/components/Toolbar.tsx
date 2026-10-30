import { Dices, CircleQuestionMark, ListMusic, PenLine, Play, Plus, Settings, Share2, Square, Undo2 } from 'lucide-react'
import { active, sky, useSky } from '../state/store'
import { toggle, togglePlayAll } from '../state/player'
import { randomName } from '../lib/names'
import { Tool } from './ui'

/** The brass bar: draw, play, and everything about your constellation. */
export function Toolbar() {
  const cur = useSky(s => active(s))
  const playing = useSky(s => s.playing)
  const panel = useSky(s => s.panel)
  const mode = useSky(s => s.mode)
  const selected = useSky(s => s.selected)

  // Play plays your active constellation, or the real one you selected.
  const target = cur?.seq.length ? cur.id : selected?.kind === 'figure' ? `fig:${selected.abbr}` : null
  const isPlaying = !!target && playing.includes(target)

  return (
    <nav className="toolbar" aria-label="Sky controls">
      {(cur || mode === 'draw') && (
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
            placeholder="Tap stars to begin"
            value={cur?.name ?? ''}
            disabled={!cur}
            onChange={e => sky.rename(e.target.value)}
          />
          <button type="button" className="dice" onClick={() => cur && sky.rename(randomName())} disabled={!cur} title="Give it a new name" aria-label="Give it a new name">
            <Dices size={16} strokeWidth={1.6} aria-hidden />
          </button>
        </div>
      )}
      <div className="tools">
        <Tool icon={PenLine} label={mode === 'draw' ? 'Drawing' : 'Draw'} active={mode === 'draw'} keepLabel onClick={sky.toggleDraw} title="Draw: tap stars to join them (C)" />
        <Tool
          icon={isPlaying ? Square : Play}
          label={isPlaying ? 'Stop' : 'Play'}
          primary
          keepLabel
          disabled={!target}
          onClick={() => target && toggle(target)}
          title="Play this constellation (Space)"
        />
        <Tool
          icon={ListMusic}
          label={playing.length ? 'Stop all' : 'Play all'}
          active={playing.length > 1}
          onClick={() => {
            if (togglePlayAll() === 0) sky.toast('No constellations in view to play')
          }}
          title="Play every constellation in view together"
        />
        <Tool icon={Undo2} label="Undo" onClick={sky.undo} disabled={!cur} title="Undo (Ctrl+Z)" />
        <Tool icon={Plus} label="New" onClick={sky.newConstellation} title="Start a new constellation (N)" />
        <span className="tools__sep" aria-hidden />
        <Tool icon={Share2} label="Share" active={panel === 'share'} onClick={() => sky.openPanel('share')} />
        <Tool icon={Settings} label="Settings" active={panel === 'settings'} onClick={() => sky.openPanel('settings')} />
        <Tool icon={CircleQuestionMark} label="Help" active={panel === 'help'} onClick={() => sky.openPanel('help')} title="Help (?)" />
      </div>
    </nav>
  )
}
