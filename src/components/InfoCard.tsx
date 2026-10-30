import { Navigation, Volume2, X } from 'lucide-react'
import { BODIES } from '../lib/space/bodies'
import { IAU } from '../lib/space/iau'
import { spectralFromBv } from '../lib/space/photometry'
import { audio } from '../lib/music/audio'
import { fmtDistance, fmtMag } from '../lib/format'
import { dist } from '../lib/space/vec'
import { useCamSnapshot } from '../state/camera'
import { starKm, starMagFrom, starName, useCatalog } from '../state/catalog'
import { positions } from '../state/clock'
import { flyTo } from '../state/flight'
import { sky, useSky, type Selection } from '../state/store'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Card({ eyebrow, title, sub, children, actions }: { eyebrow: string; title: string; sub?: string; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <aside className="card" aria-label={title}>
      <button type="button" className="close" onClick={() => sky.select(null)} aria-label="Close">
        <X size={16} aria-hidden />
      </button>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="card__title">{title}</h2>
      {sub && <p className="card__sub">{sub}</p>}
      <dl className="facts">{children}</dl>
      <div className="card__actions">{actions}</div>
    </aside>
  )
}

function BodyCard({ id }: { id: Extract<Selection, { kind: 'body' }>['id'] }) {
  const camSnap = useCamSnapshot()
  const b = BODIES[id]
  const d = dist(camSnap.pos, positions()[id]) - b.radiusKm
  return (
    <Card
      eyebrow={b.parent === 'sun' ? 'Planet' : b.parent ? `Moon of ${BODIES[b.parent].name}` : 'Star'}
      title={b.name}
      sub={b.blurb}
      actions={
        <>
          <button type="button" className="pill" onClick={() => flyTo({ kind: 'body', id })}>
            <Navigation size={14} aria-hidden /> Fly here
          </button>
          <button type="button" className="pill pill--ghost" onClick={() => audio.planet(b.tone)}>
            <Volume2 size={14} aria-hidden /> Hear it
          </button>
        </>
      }
    >
      {b.facts.map(([label, value]) => (
        <Fact key={label} label={label} value={value} />
      ))}
      <Fact label="From here" value={fmtDistance(Math.max(0, d))} />
    </Card>
  )
}

function StarCard({ id }: { id: string }) {
  const camSnap = useCamSnapshot()
  const { catalog, names } = useCatalog()
  const i = catalog && id.startsWith('h') ? catalog.byHyg.get(Number(id.slice(1))) : undefined
  if (!catalog || i === undefined) return null
  const n = names[String(catalog.hyg[i])]
  const others = [n?.[1], n?.[2]].filter((x): x is string => !!x && x !== starName(i))
  const con = catalog.con[i] < 88 ? IAU[catalog.con[i]].name : null
  const earth = positions().earth
  return (
    <Card
      eyebrow={con ? `Star in ${con}` : 'Star'}
      title={starName(i)}
      sub={others.join(' · ') || undefined}
      actions={
        <button type="button" className="pill" onClick={() => flyTo({ kind: 'star', id })}>
          <Navigation size={14} aria-hidden /> Fly here
        </button>
      }
    >
      <Fact label="Distance here" value={fmtDistance(dist(camSnap.pos, starKm(i)))} />
      <Fact label="Distance from Earth" value={fmtDistance(dist(earth, starKm(i)))} />
      <Fact label="Magnitude here" value={fmtMag(starMagFrom(i, camSnap.pos))} />
      <Fact label="Magnitude from Earth" value={fmtMag(starMagFrom(i, earth))} />
      <Fact label="Absolute" value={fmtMag(catalog.absMag[i])} />
      <Fact label="Class" value={`≈${spectralFromBv(catalog.ci[i])} (from colour)`} />
    </Card>
  )
}

function FigureCard({ abbr }: { abbr: string }) {
  const { figures } = useCatalog()
  const c = IAU.find(x => x.abbr === abbr)
  const f = figures.find(x => x.abbr === abbr)
  if (!c || !f) return null
  return (
    <Card eyebrow="Constellation" title={c.name} sub={`${c.genitive} · ${abbr}`} actions={null}>
      <Fact label="Stars in the figure" value={String(new Set(f.segs.flat()).size)} />
      <Fact label="Lines" value={String(f.segs.length)} />
    </Card>
  )
}

export function InfoCard() {
  const s = useSky(st => st.selected)
  if (!s) return null
  if (s.kind === 'body') return <BodyCard id={s.id} />
  if (s.kind === 'star') return <StarCard id={s.id} />
  if (s.kind === 'figure') return <FigureCard abbr={s.abbr} />
  return null
}
