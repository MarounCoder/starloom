/** Whole numbers with thousands separators and a proper minus sign. */
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US').replace('-', '−')

const ROWS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const SECTOR = 2000

/** A map-style grid reference for wherever the camera is, like "M3". Rows wrap every 24 sectors. */
export function sectorName(x: number, y: number): string {
  const r = Math.floor(y / SECTOR)
  const c = Math.floor(x / SECTOR)
  return `${ROWS[((r % ROWS.length) + ROWS.length) % ROWS.length]}${c < 0 ? '−' + -c : c}`
}

/** Magnitude as astronomers write it: brighter stars have smaller numbers. */
export const magnitude = (b: number) => (4.5 - b * 4.5).toFixed(1)

/** A round number near `raw` (1, 2 or 5 times a power of ten). */
export function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}
