import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Keyboard, Trash, Volume2, VolumeX } from 'lucide-react'
import { PRESETS, type Preset } from '../lib/presets'
import { BREAK } from '../lib/constellations'
import { INSTRUMENTS, type InstrumentId } from '../lib/music/instruments'
import { degreeToMidi, midiToFreq, SCALES, type ScaleId } from '../lib/music/scales'
import { audio } from '../lib/music/audio'
import { encodeSky } from '../lib/share'
import { sky, useSky } from '../state/store'
import { stopAll } from '../state/player'
import { view } from '../state/view'
import { cx } from './cx'
import { Sheet } from './ui'

const close = () => useSky.setState({ panel: null })

export function Panels() {
  const panel = useSky(s => s.panel)
  if (panel === 'presets') return <PresetsPanel />
  if (panel === 'settings') return <SettingsPanel />
  if (panel === 'share') return <SharePanel />
  if (panel === 'help') return <HelpPanel />
  return null
}

function PresetThumb({ p }: { p: Preset }) {
  const pts = useMemo(() => {
    const xs = p.stars.map(s => s[0])
    const ys = p.stars.map(s => s[1])
    const k = 52 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2
    const my = (Math.min(...ys) + Math.max(...ys)) / 2
    return p.stars.map(([x, y, m]) => ({ x: 32 + (x - mx) * k, y: 32 + (y - my) * k, r: Math.max(0.9, 2.6 - m * 0.45) }))
  }, [p])
  const lines: [number, number][] = []
  for (let i = 1; i < p.seq.length; i++) if (p.seq[i - 1] !== BREAK && p.seq[i] !== BREAK) lines.push([p.seq[i - 1], p.seq[i]])
  return (
    <svg viewBox="0 0 64 64" className="thumb" aria-hidden>
      {lines.map(([a, b], i) => (
        <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} />
      ))}
      {pts.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} />
      ))}
    </svg>
  )
}

function PresetsPanel() {
  return (
    <Sheet title="Famous constellations" onClose={close}>
      <p className="sheet__lede">Pick one, then tap the sky where you want it.</p>
      <div className="presets">
        {PRESETS.map(p => (
          <button key={p.id} type="button" className="preset" onClick={() => useSky.setState({ placing: p.id, panel: null })}>
            <PresetThumb p={p} />
            <span className="preset__name">{p.name}</span>
            <span className="preset__blurb">{p.blurb}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** A short rising phrase so you can hear what a setting sounds like. */
function preview(instrument: InstrumentId, scale: ScaleId) {
  audio.ensure()
  ;[5, 7, 8, 10, 12].forEach((d, i) => audio.play(midiToFreq(degreeToMidi(scale, d)), { instrument, when: i * 0.12, velocity: 0.7 }))
}

function SettingsPanel() {
  const settings = useSky(s => s.settings)
  const [confirmClear, setConfirmClear] = useState(false)
  const timer = useRef(0)

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      timer.current = window.setTimeout(() => setConfirmClear(false), 3500)
      return
    }
    window.clearTimeout(timer.current)
    stopAll()
    sky.clearSky()
    setConfirmClear(false)
    sky.toast('The sky is clear. Tap anywhere to start again.')
  }

  return (
    <Sheet title="Settings" onClose={close}>
      <div className="field">
        <span className="field__label" id="instrument-label">Instrument</span>
        <div className="segmented" role="radiogroup" aria-labelledby="instrument-label">
          {(Object.keys(INSTRUMENTS) as InstrumentId[]).map(id => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.instrument === id}
              className={cx(settings.instrument === id && 'on')}
              onClick={() => {
                sky.setSettings({ instrument: id })
                preview(id, settings.scale)
              }}
            >
              {INSTRUMENTS[id].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label" id="scale-label">Scale</span>
        <div className="segmented" role="radiogroup" aria-labelledby="scale-label">
          {(Object.keys(SCALES) as ScaleId[]).map(id => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.scale === id}
              className={cx(settings.scale === id && 'on')}
              onClick={() => {
                sky.setSettings({ scale: id })
                preview(settings.instrument, id)
              }}
            >
              {SCALES[id].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label" id="time-label">Sky</span>
        <div className="segmented" role="radiogroup" aria-labelledby="time-label">
          <button type="button" role="radio" aria-checked={settings.timeMode === 'cycle'} className={cx(settings.timeMode === 'cycle' && 'on')} onClick={() => sky.setSettings({ timeMode: 'cycle' })}>
            Dusk to dawn
          </button>
          <button type="button" role="radio" aria-checked={settings.timeMode === 'night'} className={cx(settings.timeMode === 'night' && 'on')} onClick={() => sky.setSettings({ timeMode: 'night' })}>
            Always night
          </button>
        </div>
      </div>
      <div className="sheet__actions">
        <button type="button" className="pill" onClick={() => sky.setSettings({ muted: !settings.muted })} aria-pressed={settings.muted}>
          {settings.muted ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
          {settings.muted ? 'Sound off' : 'Sound on'}
        </button>
        <button type="button" className="pill" onClick={() => useSky.setState({ panel: 'help' })}>
          <Keyboard size={15} aria-hidden /> Shortcuts
        </button>
        <button type="button" className={cx('pill', confirmClear && 'pill--warn')} onClick={clear}>
          <Trash size={15} aria-hidden /> {confirmClear ? 'Tap again to clear everything' : 'Clear sky'}
        </button>
      </div>
    </Sheet>
  )
}

function SharePanel() {
  const constellations = useSky(s => s.constellations)
  const settings = useSky(s => s.settings)
  const [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const link = useMemo(() => {
    const code = encodeSky({ constellations, instrument: settings.instrument, scale: settings.scale, camera: view.cam })
    return `${location.origin}${location.pathname}#sky=${code}`
  }, [constellations, settings.instrument, settings.scale])
  const count = constellations.filter(c => c.stars.length).length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      input.current?.select()
    }
  }

  return (
    <Sheet title="Share this sky" onClose={close}>
      <p className="sheet__lede">
        The link holds all {count} constellation{count === 1 ? '' : 's'}, your instrument and this view. Nothing is uploaded: the whole sky lives
        in the link.
      </p>
      <div className="share">
        <label htmlFor="share-link" className="sr-only">
          Share link
        </label>
        <input id="share-link" ref={input} readOnly value={link} onFocus={e => e.target.select()} />
        <button type="button" className="pill pill--primary" onClick={copy}>
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {link.length > 6000 && <p className="sheet__note">This is a big sky, so the link is long. It still works in most apps.</p>}
    </Sheet>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Tap / click', 'Place a star, or join an existing one'],
  ['Drag', 'Explore the sky'],
  ['Scroll / pinch', 'Zoom'],
  ['Space', 'Play or stop this constellation'],
  ['N', 'Start a new constellation'],
  ['Ctrl + Z', 'Undo'],
  ['P', 'Famous constellations'],
  ['+ / −', 'Zoom in and out'],
  ['Arrow keys', 'Pan'],
  ['H', 'Fly home'],
  ['Esc', 'Close or cancel'],
]

function HelpPanel() {
  return (
    <Sheet title="How to play" onClose={close}>
      <p className="sheet__lede">
        Every star is a note. Higher stars sing higher, measured from the first star of each constellation. Catch a shooting star for a wish, and
        go looking for the planets.
      </p>
      <dl className="keys">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  )
}
