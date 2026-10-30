import { useEffect, useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { clock, resetNow, setRate } from '../state/clock'

const RATES: [number, string][] = [
  [-604800, '−1 week/s'],
  [-86400, '−1 day/s'],
  [-3600, '−1 hour/s'],
  [1, 'Real time'],
  [3600, '1 hour/s'],
  [86400, '1 day/s'],
  [604800, '1 week/s'],
]

const fmtDate = (d: Date) =>
  d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** The simulated date, faster or backwards time, and a way back to now. */
export function TimeBar() {
  const [realNow, setRealNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setRealNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const idx = Math.max(0, RATES.findIndex(([r]) => r === clock.rate))
  const step = (k: number) => setRate(RATES[Math.max(0, Math.min(RATES.length - 1, idx + k))][0])
  const live = clock.rate === 1 && Math.abs(clock.simMs - realNow) < 60_000

  return (
    <div className="timebar" role="group" aria-label="Time">
      <button type="button" className="timebar__btn" onClick={() => step(-1)} disabled={idx === 0} aria-label="Slower, or backwards">
        <ChevronsLeft size={15} aria-hidden />
      </button>
      <div className="timebar__readout">
        <span className="timebar__date">{fmtDate(clock.now())}</span>
        <span className="timebar__rate">{RATES[idx][1]}</span>
      </div>
      <button type="button" className="timebar__btn" onClick={() => step(1)} disabled={idx === RATES.length - 1} aria-label="Faster">
        <ChevronsRight size={15} aria-hidden />
      </button>
      <button type="button" className={`timebar__now${live ? ' on' : ''}`} onClick={resetNow} disabled={live}>
        Now
      </button>
    </div>
  )
}
