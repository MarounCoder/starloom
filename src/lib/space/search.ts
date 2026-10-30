export interface Entry<T> {
  key: string
  label: string
  /** A short line under the label, e.g. "Star in Orion · 8.6 ly". */
  detail: string
  /** Other names it answers to: Bayer and Flamsteed designations, abbreviations. */
  aliases: string[]
  target: T
  /** Higher comes first among equally good matches. */
  rank: number
}

interface Indexed<T> {
  entry: Entry<T>
  label: string
  labelWords: string[]
  aliasWords: string[][]
}

export interface Index<T> {
  items: Indexed<T>[]
}

const GREEK: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ι: 'iota', κ: 'kappa',
  λ: 'lambda', μ: 'mu', ν: 'nu', ξ: 'xi', ο: 'omicron', π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', υ: 'upsilon',
  φ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
}
const SUP: Record<string, string> = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }

/** Lower case, no accents, Greek letters spelled out, superscripts as digits. */
export function normalize(s: string): string {
  return s
    .replace(/[α-ω]/g, c => GREEK[c] ?? c)
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, c => SUP[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const words = (s: string) => s.split(' ').filter(Boolean)

export function buildIndex<T>(entries: Entry<T>[]): Index<T> {
  return {
    items: entries.map(entry => {
      const label = normalize(entry.label)
      return { entry, label, labelWords: words(label), aliasWords: entry.aliases.map(a => words(normalize(a))) }
    }),
  }
}

/** Every query word starts some word of the name, in any order. */
const covers = (name: string[], q: string[]) => q.every(t => name.some(w => w.startsWith(t)))

export function query<T>(index: Index<T>, q: string, limit = 8): Entry<T>[] {
  const nq = normalize(q)
  if (!nq) return []
  const qw = words(nq)
  const scored: [number, Indexed<T>][] = []
  for (const it of index.items) {
    let s = 0
    if (it.label.startsWith(nq)) s = 3
    else if (covers(it.labelWords, qw)) s = 2
    else if (it.aliasWords.some(a => covers(a, qw))) s = 1
    if (s) scored.push([s, it])
  }
  scored.sort((a, b) => b[0] - a[0] || b[1].entry.rank - a[1].entry.rank)
  return scored.slice(0, limit).map(([, it]) => it.entry)
}
