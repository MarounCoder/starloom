import { SkyCanvas } from './components/SkyCanvas'
import { Brand } from './components/Brand'
import { Navigator } from './components/Navigator'
import { Toolbar } from './components/Toolbar'
import { Panels } from './components/Panels'
import { BodyCard, Notices, Welcome, WishCard } from './components/Cards'
import { useKeyboard, useSharedLink } from './hooks'

export function App() {
  useSharedLink()
  useKeyboard()
  return (
    <>
      <SkyCanvas />
      <div className="hud">
        <header className="hud__top">
          <Brand />
          <Navigator />
        </header>
        <Notices />
        <footer className="hud__bottom">
          <Panels />
          <Toolbar />
        </footer>
      </div>
      <BodyCard />
      <WishCard />
      <Welcome />
    </>
  )
}
