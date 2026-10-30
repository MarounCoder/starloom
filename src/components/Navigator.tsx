import { useEffect, useState } from 'react'
import { Compass, House, ZoomIn, ZoomOut } from 'lucide-react'
import type { Camera } from '../lib/camera'
import { fmt, sectorName } from '../lib/format'
import { moonPhase } from '../lib/sky/moon'
import { CYCLE_MS, skyAt } from '../lib/sky/daycycle'
import { SOLAR_ORIGIN } from '../lib/sky/solarSystem'
import { getRegionObject, REGION, DEEP_LAYER } from '../lib/sky/deepsky'
import { LAYERS } from '../lib/sky/starfield'
import { clock, reduceMotion } from '../state/fx'
import { useSky } from '../state/store'
import { flyTo, HOME, useCamera, view, zoomBy } from '../state/view'
import { cx } from './cx'

const moon = moonPhase(new Date())

/** Centre the camera on an object that lives on a parallax layer. */
function cameraFor(layerId: number, x: number, y: number, zoom: number): Camera {
  const p = LAYERS[layerId].p
  return { x: x / p, y: y / p, zoom }
}

/** The nearest nebula to the camera, searching outward ring by ring. */
function nearestNebula(): Camera | null {
  const p = LAYERS[DEEP_LAYER.nebula].p
  const rx0 = Math.floor((view.cam.x * p) / REGION)
  const ry0 = Math.floor((view.cam.y * p) / REGION)
  for (let ring = 1; ring < 12; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const o = getRegionObject('nebula', rx0 + dx, ry0 + dy)
        if (o) return cameraFor(DEEP_LAYER.nebula, o.x, o.y, 1.4)
      }
    }
  }
  return null
}

interface Place {
  label: string
  hint: string
  go: () => Camera | null
}

const PLACES: Place[] = [
  { label: 'Home', hint: 'Where you started', go: () => HOME },
  { label: 'The Solar System', hint: 'Planets at their real positions today', go: () => ({ ...SOLAR_ORIGIN, zoom: 0.5 }) },
  { label: 'The Loom Nebula', hint: 'A glowing cloud of gas', go: () => cameraFor(DEEP_LAYER.nebula, 720, -260, 1) },
  { label: 'The Seven Lanterns', hint: 'A young star cluster', go: () => ({ x: -1050, y: 420, zoom: 2.4 }) },
  { label: 'The Pinwheel Drift', hint: 'A spiral galaxy, very far away', go: () => cameraFor(DEEP_LAYER.galaxy, -620, 300, 9) },
  { label: 'Nearest nebula', hint: 'Find one close to here', go: nearestNebula },
  {
    label: 'Somewhere new',
    hint: 'A random corner of the universe',
    go: () => ({ x: view.cam.x + (Math.random() - 0.5) * 40000, y: view.cam.y + (Math.random() - 0.5) * 40000, zoom: 1 }),
  },
]

export function Navigator() {
  const cam = useCamera()
  const open = useSky(s => s.panel === 'places')
  const timeMode = useSky(s => s.settings.timeMode)
  const [time, setTime] = useState('Night')

  useEffect(() => {
    if (timeMode === 'night') return
    const tick = () => setTime(skyAt(((performance.now() - clock.cycleStart) % CYCLE_MS) / CYCLE_MS).label)
    tick()
    const id = window.setInterval(tick, 3000)
    return () => window.clearInterval(id)
  }, [timeMode])

  const go = (p: Place) => {
    const target = p.go()
    if (target) flyTo(target, reduceMotion)
    useSky.setState({ panel: null })
  }

  return (
    <div className="nav">
      <div className="nav__buttons">
        <button
          type="button"
          className={cx('round', open && 'round--active')}
          onClick={() => useSky.setState({ panel: open ? null : 'places' })}
          aria-expanded={open}
          aria-label="Places to visit"
          title="Places to visit"
        >
          <Compass size={18} strokeWidth={1.6} aria-hidden />
        </button>
        <button type="button" className="round" onClick={() => zoomBy(1 / 1.6, reduceMotion)} aria-label="Zoom out" title="Zoom out (−)">
          <ZoomOut size={18} strokeWidth={1.6} aria-hidden />
        </button>
        <button type="button" className="round" onClick={() => zoomBy(1.6, reduceMotion)} aria-label="Zoom in" title="Zoom in (+)">
          <ZoomIn size={18} strokeWidth={1.6} aria-hidden />
        </button>
        <button type="button" className="round" onClick={() => flyTo(HOME, reduceMotion)} aria-label="Fly home" title="Fly home (H)">
          <House size={18} strokeWidth={1.6} aria-hidden />
        </button>
      </div>
      <p className="nav__status">
        Sector {sectorName(cam.x, cam.y)} · {fmt(cam.x)}, {fmt(cam.y)} · ×{cam.zoom.toFixed(2)}
      </p>
      <p className="nav__status">
        {timeMode === 'night' ? 'Always night' : time} · {moon.name} {Math.round(moon.illumination * 100)}%
      </p>
      {open && (
        <ul className="places" role="menu">
          {PLACES.map(p => (
            <li key={p.label} role="none">
              <button type="button" role="menuitem" onClick={() => go(p)}>
                <span className="places__label">{p.label}</span>
                <span className="places__hint">{p.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
