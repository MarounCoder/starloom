import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { encodeSky } from '../lib/share'
import { cam } from '../state/camera'
import { sky, useSky } from '../state/store'
import { Sheet } from './ui'
import { INSTRUMENTS, type InstrumentId } from '../lib/music/instruments'
import { SCALES, midiToFreq, type ScaleId } from '../lib/music/scales'
import { audio } from '../lib/music/audio'

function ShareSheet() {
  const s = useSky()
  const [copied, setCopied] = useState(false)
  const [link] = useState(() => {
    const hash = encodeSky({
      constellations: s.constellations,
      instrument: s.settings.instrument,
      scale: s.settings.scale,
      camera: { pos: [...cam.pos], yaw: cam.yaw, pitch: cam.pitch },
      target: s.selected,
    })
    return `${location.origin}${location.pathname}#sky=${hash}`
  })
  const n = s.constellations.filter(c => c.stars.length).length
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      sky.toast('Copy the link from the box instead')
    }
  }
  return (
    <Sheet title="Share this sky" onClose={() => sky.openPanel('share')}>
      <p className="sheet__lede">
        The link carries {n ? `your ${n === 1 ? 'constellation' : `${n} constellations`}` : 'this view'}, where you are in the universe, what you have selected and your sound. Nothing is uploaded: it all lives in the link.
      </p>
      <div className="share">
        <input readOnly value={link} aria-label="Share link" onFocus={e => e.currentTarget.select()} />
        <button type="button" className="pill pill--primary" onClick={copy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </Sheet>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={v === value} className={v === value ? 'on' : undefined} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

const onOff = (b: boolean) => (b ? 'on' : 'off')

function SettingsSheet() {
  const st = useSky(s => s.settings)
  return (
    <Sheet title="Settings" onClose={() => sky.openPanel('settings')}>
      <Segmented
        label="Instrument"
        value={st.instrument}
        options={Object.entries(INSTRUMENTS).map(([k, v]) => [k as InstrumentId, v.label])}
        onChange={instrument => {
          sky.setSettings({ instrument })
          audio.play(midiToFreq(62), { velocity: 0.7 })
        }}
      />
      <Segmented label="Scale" value={st.scale} options={Object.entries(SCALES).map(([k, v]) => [k as ScaleId, v.label])} onChange={scale => sky.setSettings({ scale })} />
      <Segmented label="Sound" value={onOff(!st.muted)} options={[['on', 'On'], ['off', 'Muted']]} onChange={v => sky.setSettings({ muted: v === 'off' })} />
      <Segmented label="Constellation lines (F)" value={onOff(st.figures)} options={[['on', 'Shown'], ['off', 'Hidden']]} onChange={v => sky.setSettings({ figures: v === 'on' })} />
      <Segmented label="Labels (L)" value={onOff(st.labels)} options={[['on', 'Shown'], ['off', 'Hidden']]} onChange={v => sky.setSettings({ labels: v === 'on' })} />
      <Segmented label="Glow effects" value={onOff(st.effects)} options={[['on', 'On'], ['off', 'Off (faster)']]} onChange={v => sky.setSettings({ effects: v === 'on' })} />
    </Sheet>
  )
}

const KEYS: [string, string][] = [
  ['Drag', 'Look around (or turn a planet you are circling)'],
  ['Scroll / pinch', 'Fly toward the pointer, or back'],
  ['W A S D / arrows', 'Fly; Q and E go down and up'],
  ['Shift', 'Four times faster'],
  ['Tap', 'What is that? A star, planet, galaxy or constellation'],
  ['C', 'Draw: tap stars to join them'],
  ['Space', 'Play or stop'],
  ['N', 'New constellation'],
  ['Ctrl + Z', 'Undo'],
  ['F / L', 'Constellation lines / labels'],
  ['H', 'Back to Earth'],
  ['/', 'Search'],
  ['Esc', 'Close, stop drawing, let go of a planet'],
]

function HelpSheet() {
  return (
    <Sheet title="How to play" onClose={() => sky.openPanel('help')}>
      <p className="sheet__lede">
        Fly anywhere: the closer you are to something, the slower you go, so crossing the Solar System and the space between galaxies both take seconds. Tap <b>Draw</b>, then tap stars to join them into a constellation. Every star is a note: higher in the sky sings higher, and as you travel the shape and the melody bend.
      </p>
      <dl className="keys">
        {KEYS.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="sheet__h3">Real and imagined</h3>
      <p className="sheet__note">
        Near home everything is real: the planets are where they are right now, and the 27,000 brightest stars and the 88 constellations come from astronomers’ catalogues. Further out, Starloom imagines the rest. Stars marked <i>generated</i>, the nebulae and every other galaxy are made up, but they are always the same when you come back.
      </p>
      <h3 className="sheet__h3">Credits</h3>
      <ul className="credits">
        <li>Stars: the HYG database v4.1 by David Nash (astronexus), CC BY-SA 4.0.</li>
        <li>Constellation figures: the Stellarium “modern” sky culture, CC BY-SA 4.0.</li>
        <li>Planet, Moon, Sun and Milky Way images: Solar System Scope, CC BY 4.0.</li>
        <li>Planet positions: astronomy-engine by Don Cross, MIT.</li>
        <li>
          Starloom is open source under the MIT licence: <a href="https://github.com/MarounCoder/starloom">github.com/MarounCoder/starloom</a>.
        </li>
      </ul>
    </Sheet>
  )
}

export function Panels() {
  const panel = useSky(s => s.panel)
  if (panel === 'share') return <ShareSheet />
  if (panel === 'settings') return <SettingsSheet />
  if (panel === 'help' || panel === 'about') return <HelpSheet />
  return null
}
