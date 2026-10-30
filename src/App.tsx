import { Universe } from './scene/Universe'
import { Brand } from './components/Brand'

export function App() {
  return (
    <>
      <Universe />
      <div className="hud">
        <header className="hud__top">
          <Brand />
        </header>
      </div>
    </>
  )
}
