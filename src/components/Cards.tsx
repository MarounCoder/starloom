import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { audio } from '../lib/music/audio'
import { presetById } from '../lib/presets'
import { J2000, PLANETS, SIM_DAYS_PER_SECOND, SUN, toneFor } from '../lib/sky/solarSystem'
import { clock } from '../state/fx'
import { sky, useSky } from '../state/store'

const simDate = () =>
  new Date(J2000 + clock.solarDays * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function BodyCard() {
  const id = useSky(s => s.selectedBody)
  const [date, setDate] = useState(simDate)
  useEffect(() => {
    if (!id) return
    const t = window.setInterval(() => setDate(simDate()), 500)
    return () => window.clearInterval(t)
  }, [id])
  if (!id) return null

  const planet = PLANETS.find(p => p.id === id)
  const body = planet ?? SUN
  const tone = planet ? toneFor(planet.period) : 65.41
  return (
    <aside className="card card--body" aria-label={body.name}>
      <header className="card__head">
        <span className="swatch" style={{ background: body.color }} aria-hidden />
        <h2>{body.name}</h2>
        <button type="button" className="close" onClick={() => useSky.setState({ selectedBody: null })} aria-label="Close">
          ×
        </button>
      </header>
      <p className="card__blurb">{body.blurb}</p>
      <dl className="facts">
        {planet && (
          <div>
            <dt>From the Sun</dt>
            <dd>{planet.au} AU</dd>
          </div>
        )}
        {body.facts.map(f => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="card__note">
        {planet
          ? `Its hum, ${Math.round(tone)} Hz, comes from its orbital period: slower planets sing lower, as Kepler imagined.`
          : 'Its hum is the lowest in the sky.'}
      </p>
      <footer className="card__foot">
        <button type="button" className="pill" onClick={() => audio.planet(tone)}>
          <Volume2 size={15} aria-hidden /> Hear it again
        </button>
        <span className="card__date">
          Orbits on {date} · {SIM_DAYS_PER_SECOND} days a second
        </span>
      </footer>
    </aside>
  )
}

export function WishCard() {
  const wish = useSky(s => s.wish)
  useEffect(() => {
    if (!wish) return
    const t = window.setTimeout(() => useSky.setState({ wish: null }), 9000)
    return () => window.clearTimeout(t)
  }, [wish])
  if (!wish) return null
  return (
    <div className="wish" role="status" onClick={() => useSky.setState({ wish: null })}>
      <p className="eyebrow">Wish caught · No. {wish.n}</p>
      <p className="wish__text">{wish.text}</p>
      <p className="wish__dismiss">Tap to return to the sky</p>
    </div>
  )
}

export function Welcome() {
  const show = useSky(s => !s.welcomed && !s.shared)
  if (!show) return null
  const start = () => {
    audio.ensure()
    useSky.setState({ welcomed: true })
  }
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome__card">
        <p className="eyebrow">Welcome to</p>
        <h2 id="welcome-title" className="wordmark">
          Starloom
        </h2>
        <p className="welcome__lede">An endless night sky that you can explore and play like an instrument.</p>
        <ul className="welcome__list">
          <li>
            <b>Tap the sky</b> to place a star. Each one is a note, and stars placed in a row join into a constellation.
          </li>
          <li>
            <b>Press Play</b> to hear it as a melody. Orion and Cassiopeia are already up there to try.
          </li>
          <li>
            <b>Drag and zoom</b> to wander. There is a Milky Way, nebulae, galaxies, and a solar system with today's planets.
          </li>
          <li>
            <b>Catch a shooting star</b> when one streaks past. It leaves a wish behind.
          </li>
        </ul>
        <button type="button" className="pill pill--primary pill--big" onClick={start} autoFocus>
          Start exploring
        </button>
      </div>
    </div>
  )
}

export function Notices() {
  const shared = useSky(s => s.shared)
  const placing = useSky(s => s.placing)
  const toast = useSky(s => s.toast)

  return (
    <div className="notices">
      {shared && (
        <div className="notice">
          <span>You are looking at a shared sky.</span>
          <button type="button" className="pill pill--primary" onClick={sky.keepShared}>
            Add to my sky
          </button>
          <button type="button" className="pill" onClick={sky.leaveShared}>
            Back to my sky
          </button>
        </div>
      )}
      {placing && (
        <div className="notice">
          <span>
            Tap the sky to place <b>{presetById(placing)?.name}</b>
          </span>
          <button type="button" className="pill" onClick={() => useSky.setState({ placing: null })}>
            Cancel
          </button>
        </div>
      )}
      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
