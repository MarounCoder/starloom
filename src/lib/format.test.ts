import { describe, expect, it } from 'vitest'
import { fmt, fmtDistance, fmtMag } from './format'
import { KM_PER_AU, KM_PER_LY } from './space/units'

describe('format', () => {
  it('formats numbers with a real minus sign', () => {
    expect(fmt(-1234.4)).toBe('−1,234')
    expect(fmt(5)).toBe('5')
  })
  it('picks a sensible unit for distances', () => {
    expect(fmtDistance(384_400)).toBe('384,400 km')
    expect(fmtDistance(KM_PER_AU * 5.2)).toBe('5.20 AU')
    expect(fmtDistance(KM_PER_AU * 1234)).toBe('1,234 AU')
    expect(fmtDistance(KM_PER_LY * 8.6)).toBe('8.60 ly')
    expect(fmtDistance(KM_PER_LY * 640)).toBe('640 ly')
    expect(fmtDistance(KM_PER_LY * 26_000)).toBe('26.0 kly')
    expect(fmtDistance(KM_PER_LY * 2.5e6)).toBe('2.50 Mly')
    expect(fmtDistance(KM_PER_LY * 3.1e9)).toBe('3.10 Gly')
  })
  it('writes magnitudes with a sign', () => {
    expect(fmtMag(1.23)).toBe('+1.2')
    expect(fmtMag(-0.74)).toBe('−0.7')
  })
})
