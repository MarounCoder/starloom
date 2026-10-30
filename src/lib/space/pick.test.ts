import { describe, expect, it } from 'vitest'
import { pickAt, type Candidate } from './pick'

describe('pickAt', () => {
  it('prefers a bright star a little further away over a faint one right under the finger', () => {
    const c: Candidate[] = [
      { id: 'faint', x: 104, y: 100, weight: 0.01 },
      { id: 'bright', x: 114, y: 100, weight: 2 },
    ]
    expect(pickAt(c, 100, 100, 30)).toBe('bright')
  })
  it('picks nothing outside the radius', () => {
    expect(pickAt([{ id: 'a', x: 200, y: 200, weight: 5 }], 100, 100, 18)).toBeNull()
  })
  it('lets a body beat a star at the same distance', () => {
    const c: Candidate[] = [
      { id: 'star', x: 110, y: 100, weight: 5 },
      { id: 'body', x: 90, y: 100, weight: 10 },
    ]
    expect(pickAt(c, 100, 100, 18)).toBe('body')
  })
})
