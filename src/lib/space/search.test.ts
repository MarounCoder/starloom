import { describe, expect, it } from 'vitest'
import { buildIndex, normalize, query, type Entry } from './search'

const e = (key: string, label: string, rank: number, aliases: string[] = []): Entry<string> => ({ key, label, detail: '', aliases, target: key, rank })

const index = buildIndex([
  e('sirius', 'Sirius', 1.44, ['α CMa', 'alpha Canis Majoris']),
  e('sirrah', 'Alpheratz', -2.06, ['Sirrah', 'α And']),
  e('rigil', 'Rigil Kentaurus', 0.01, ['α¹ Cen', 'alpha1 Centauri']),
  e('orion', 'Orion', 50, ['Ori']),
  e('rigel', 'Rigel', -0.13, ['β Ori', 'beta Orionis']),
  e('jupiter', 'Jupiter', 100),
  e('epsilon', 'Épsilon Test', 0),
])

const keys = (q: string) => query(index, q).map(x => x.key)

describe('search', () => {
  it('finds Sirius first for "sir"', () => {
    expect(keys('sir')[0]).toBe('sirius')
    expect(keys('sir')).toContain('sirrah')
  })
  it('puts the constellation first for "orion"', () => {
    expect(keys('orion')[0]).toBe('orion')
    expect(keys('orion')).toContain('rigel')
  })
  it('understands spelled-out Greek letters', () => {
    expect(keys('alpha cen')).toContain('rigil')
    expect(keys('α cen')).toContain('rigil')
  })
  it('finds planets', () => {
    expect(keys('jup')).toEqual(['jupiter'])
  })
  it('returns nothing for nonsense and ignores accents', () => {
    expect(keys('zzzz')).toEqual([])
    expect(keys('é')).toEqual(keys('e'))
    expect(keys('eps')).toContain('epsilon')
  })
  it('limits the number of results', () => {
    expect(query(index, 'r', 2)).toHaveLength(2)
  })
  it('normalizes Greek letters, superscripts and accents', () => {
    expect(normalize('α¹ Cen')).toBe('alpha1 cen')
    expect(normalize('Boötes')).toBe('bootes')
  })
})
