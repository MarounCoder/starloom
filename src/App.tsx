import { useState } from 'react'
import { Universe } from './scene/Universe'
import { Brand } from './components/Brand'
import { NoWebGL } from './components/NoWebGL'
import { webglSupport } from './lib/webgl'
import { InfoCard } from './components/InfoCard'
import { labelLayer } from './state/labels'

const supported = webglSupport() === 'ok'

export function App() {
  const [lost, setLost] = useState(false)
  if (!supported || lost) return <NoWebGL lost={lost} />
  return (
    <>
      <div
        className="labels"
        ref={el => {
          labelLayer.root = el
        }}
      />
      <Universe onContextLost={() => setLost(true)} />
      <div className="hud">
        <header className="hud__top">
          <Brand />
        </header>
      </div>
      <InfoCard />
    </>
  )
}
