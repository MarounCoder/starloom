import { describe, expect, it } from 'vitest'
import { fmt, magnitude, niceStep, sectorName } from './format'

describe('format', () => {
  it('formats numbers with a real minus sign', () => {
    expect(fmt(-1234.4)).toBe('−1,234')
    expect(fmt(5)).toBe('5')
  })
  it('names sectors around home', () => {
    expect(sectorName(0, 0)).toBe('A0')
    expect(sectorName(-1, -1)).toBe('Z−1')
    expect(sectorName(4100, 2100)).toBe('B2')
  })
  it('gives brighter stars smaller magnitudes', () => {
    expect(Number(magnitude(1))).toBeLessThan(Number(magnitude(0.2)))
  })
  it('picks round grid steps', () => {
    expect(niceStep(130)).toBe(100)
    expect(niceStep(260)).toBe(200)
    expect(niceStep(640)).toBe(500)
  })
})
