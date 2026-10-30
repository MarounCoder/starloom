import { audio } from '../lib/music/audio'
import { PLACES, go } from '../state/places'
import { sky, useSky } from '../state/store'

/** The first visit: what this is, and three ways in. */
export function Welcome() {
  const show = useSky(s => !s.welcomed && !s.shared)
  if (!show) return null
  const start = (then?: () => void) => {
    audio.ensure()
    sky.welcome()
    then?.()
  }
  const alphaCen = PLACES.find(p => p.label === 'Alpha Centauri')!
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome__card">
        <p className="eyebrow">Welcome to</p>
        <h2 id="welcome-title" className="wordmark">
          Starloom
        </h2>
        <p className="welcome__lede">The real sky, a universe beyond it, and every star a note.</p>
        <ul className="welcome__list">
          <li>
            <b>Fly anywhere.</b> Drag to look, scroll or pinch to fly. The planets are where they are today.
          </li>
          <li>
            <b>Draw.</b> Tap Draw, then tap stars to join them. Press Play to hear your constellation.
          </li>
          <li>
            <b>Travel.</b> Fly to another star and watch your constellation stretch and its melody change.
          </li>
        </ul>
        <div className="welcome__actions">
          <button type="button" className="pill pill--primary pill--big" onClick={() => start(sky.toggleDraw)} autoFocus>
            Start drawing
          </button>
          <button
            type="button"
            className="pill pill--big"
            onClick={() =>
              start(() => {
                const d = alphaCen.dest()
                if (d) go(d)
              })
            }
          >
            Take me to Alpha Centauri
          </button>
          <button type="button" className="pill pill--big pill--ghost" onClick={() => start()}>
            Just look around
          </button>
        </div>
      </div>
    </div>
  )
}
