import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from '@/lib/sentry'
import '@/i18n'

// Initialize Sentry monitoring (no-op if VITE_SENTRY_DSN not set)
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
