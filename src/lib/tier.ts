export type Tier = 'high' | 'low'

/** Phones, small windows and machines with four cores or fewer get the lighter settings. */
export function deviceTier(nav: { hardwareConcurrency?: number; userAgent: string }, screenW: number): Tier {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return 'low'
  if ((nav.hardwareConcurrency ?? 8) <= 4) return 'low'
  if (screenW < 700) return 'low'
  return 'high'
}

/** What each tier gets. */
export const TIER_SETTINGS = {
  high: { dprMax: 2, segments: 64, milkyWay: '8k_stars_milky_way.jpg', starsPerChunk: 220, galaxyPoints: 7000, bloomScale: 1 },
  low: { dprMax: 1.5, segments: 32, milkyWay: '2k_stars_milky_way.jpg', starsPerChunk: 110, galaxyPoints: 3500, bloomScale: 0.5 },
} as const
