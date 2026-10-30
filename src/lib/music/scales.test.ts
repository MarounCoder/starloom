import { describe, expect, it } from 'vitest'
import { degreeFor, degreeToMidi, midiName, midiToFreq, STEP_WORLD } from './scales'

describe('scales', () => {
  it('puts the anchor star on degree 7', () => {
    expect(degreeFor(500, 500)).toBe(7)
  })
  it('goes one degree up per step higher on screen', () => {
    expect(degreeFor(500 - STEP_WORLD, 500)).toBe(8)
    expect(degreeFor(500 + STEP_WORLD * 2, 500)).toBe(5)
  })
  it('clamps far-away stars', () => {
    expect(degreeFor(-1e6, 0)).toBe(21)
    expect(degreeFor(1e6, 0)).toBe(0)
  })
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
