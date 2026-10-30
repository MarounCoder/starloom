import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { encodeSky } from '../lib/share'
import { cam } from '../state/camera'
import { sky, useSky } from '../state/store'
import { Sheet } from './ui'

function ShareSheet() {
  const s = useSky()
  const [copied, setCopied] = useState(false)
  const [link] = useState(() => {
    const hash = encodeSky({
      constellations: s.constellations,
      instrument: s.settings.instrument,
      scale: s.settings.scale,
      camera: { pos: [...cam.pos], yaw: cam.yaw, pitch: cam.pitch },
      target: s.selected,
    })
    return `${location.origin}${location.pathname}#sky=${hash}`
  })
  const n = s.constellations.filter(c => c.stars.length).length
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      sky.toast('Copy the link from the box instead')
    }
  }
  return (
    <Sheet title="Share this sky" onClose={() => sky.openPanel('share')}>
      <p className="sheet__lede">
        The link carries {n ? `your ${n === 1 ? 'constellation' : `${n} constellations`}` : 'this view'}, where you are in the universe, what you have selected and your sound. Nothing is uploaded: it all lives in the link.
      </p>
      <div className="share">
        <input readOnly value={link} aria-label="Share link" onFocus={e => e.currentTarget.select()} />
        <button type="button" className="pill pill--primary" onClick={copy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </Sheet>
  )
}

export function Panels() {
  const panel = useSky(s => s.panel)
  if (panel === 'share') return <ShareSheet />
  return null
}
