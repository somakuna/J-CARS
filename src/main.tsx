import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { captureInstallPrompt } from './lib/install'
import { registerServiceWorker } from './lib/push'

// Chrome/Edge javljaju mogućnost instalacije odmah pri učitavanju – događaj se sprema za gumb u Postavkama.
captureInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: rad nakon instalacije i push obavijesti i kad aplikacija nije otvorena.
void registerServiceWorker()
