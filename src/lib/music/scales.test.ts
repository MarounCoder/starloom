import { describe, expect, it } from 'vitest'
import { degreeToMidi, midiName, midiToFreq } from './scales'

describe('scales', () => {
  it('wraps degrees into octaves', () => {
    expect(degreeToMidi('pentatonic', 0)).toBe(50)
    expect(degreeToMidi('pentatonic', 5)).toBe(62)
    expect(degreeToMidi('lydian', 3)).toBe(56)
  })
  it('names and tunes notes', () => {
    expect(midiName(62)).toBe('D4')
    expect(midiName(66)).toBe('F♯4')
    expect(midiToFreq(69)).toBeCloseTo(440)
  })
})
