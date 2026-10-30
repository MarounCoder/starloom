import { useSky, current } from '../state/store'
import { noteOf } from '../state/player'
import { bayer } from '../render/renderer'
import { fmt, magnitude } from '../lib/format'

export function Brand() {
  return (
    <div className="brand">
      <p className="eyebrow">An infinite sky you can play</p>
      <h1 className="wordmark">Starloom</h1>
      <Readout />
    </div>
  )
}

/** A catalogue line for the star you last touched or heard. */
function Readout() {
  const focus = useSky(s => s.focus)
  const constellations = useSky(s => s.constellations)
  useSky(s => s.settings.scale)
  const cur = useSky(s => current(s))

  const c = focus && constellations.find(x => x.id === focus.cid)
  const star = c && c.stars[focus.idx]
  if (c && star) {
    return (
      <p className="readout" aria-live="polite">
        <b>{bayer(focus.idx)}</b> {c.name} · mag {magnitude(star.b)} · <b>{noteOf(c, focus.idx).name}</b> · {fmt(star.x)}, {fmt(star.y)}
      </p>
    )
  }
  if (cur && cur.stars.length) {
    return (
      <p className="readout">
        <b>{cur.name}</b> · {cur.stars.length} star{cur.stars.length > 1 ? 's' : ''} · tap a star to hear it
      </p>
    )
  }
  return (
    <p className="readout">
      <b>Tap anywhere</b> to place a star · drag to explore
    </p>
  )
}
