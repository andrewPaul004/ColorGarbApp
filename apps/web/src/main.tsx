// import { StrictMode } from 'react' // Disabled to prevent double API calls in development
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


createRoot(document.getElementById('root')!).render(
  <App />
)
