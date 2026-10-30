import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/italiana/400.css'
import '@fontsource/spectral/300.css'
import '@fontsource/spectral/300-italic.css'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/400-italic.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/app.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
