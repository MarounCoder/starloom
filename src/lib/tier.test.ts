import { describe, expect, it } from 'vitest'
import { deviceTier } from './tier'

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

describe('deviceTier', () => {
  it('treats phones as low', () => {
    expect(deviceTier({ userAgent: iphone, hardwareConcurrency: 6 }, 390)).toBe('low')
  })
  it('treats four cores or fewer as low', () => {
    expect(deviceTier({ userAgent: desktop, hardwareConcurrency: 4 }, 1440)).toBe('low')
  })
  it('treats small windows as low', () => {
    expect(deviceTier({ userAgent: desktop, hardwareConcurrency: 8 }, 650)).toBe('low')
  })
  it('treats a proper computer as high', () => {
    expect(deviceTier({ userAgent: desktop, hardwareConcurrency: 8 }, 1440)).toBe('high')
    expect(deviceTier({ userAgent: desktop }, 1440)).toBe('high')
  })
})
