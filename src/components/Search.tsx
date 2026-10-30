import { useEffect, useRef, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { buildIndex, query } from '../lib/space/search'
import { universe } from '../state/universe'
import { useCatalog } from '../state/catalog'
import { PLACES, go, searchIndex } from '../state/places'

/** Search for planets, stars and constellations; with an empty box, a list of places worth a visit. */
export function Search() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  // Re-render once the catalogue arrives so star names become searchable.
  useCatalog()
  const galaxies = buildIndex(
    universe.near.map(g => ({ key: `gal:${g.key}`, label: g.name.replace(' (generated)', ''), detail: g.real ? 'Our galaxy' : 'Galaxy · generated', aliases: g.real ? ['Milky Way', 'Galaxy'] : [], target: { kind: 'galaxy' as const, key: g.key }, rank: 40 })),
  )
  const results = q.trim() ? [...query(searchIndex(), q, 8), ...query(galaxies, q, 3)].slice(0, 9) : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => {
    setOpen(false)
    setQ('')
    input.current?.blur()
  }

  const items = q.trim()
    ? results.map(r => ({ key: r.key, label: r.label, detail: r.detail, run: () => go(r.target) }))
    : PLACES.map(p => ({
        key: p.label,
        label: p.label,
        detail: p.blurb,
        run: () => {
          const d = p.dest()
          if (d) go(d)
        },
      }))

  return (
    <div className="search" onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <label className="search__box">
        <SearchIcon size={15} strokeWidth={1.7} aria-hidden />
        <span className="sr-only">Search the sky</span>
        <input
          ref={input}
          type="search"
          value={q}
          placeholder="Search or pick a place  /"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQ(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') close()
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive(a => Math.min(a + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive(a => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && items[active]) {
              items[active].run()
              close()
            }
          }}
          aria-expanded={open}
          aria-controls="search-results"
        />
      </label>
      {open && (
        <ul className="search__list" id="search-results" role="listbox" aria-label={q.trim() ? 'Results' : 'Places'}>
          {!q.trim() && <li className="search__head">Places to visit</li>}
          {items.map((it, i) => (
            <li key={it.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'on' : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  it.run()
                  close()
                }}
              >
                <span className="search__label">{it.label}</span>
                <span className="search__detail">{it.detail}</span>
              </button>
            </li>
          ))}
          {q.trim() && !items.length && <li className="search__empty">Nothing by that name</li>}
        </ul>
      )}
    </div>
  )
}
