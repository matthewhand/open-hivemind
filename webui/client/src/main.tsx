import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Temporarily use simple app to test Tailwind
import App from './App-simple'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
