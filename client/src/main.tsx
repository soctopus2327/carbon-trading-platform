import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// imports React
// imports ReactDOM
// imports global CSS (indexe.css)
// imports the root component (App)
// Mounts the React app into the HTML DOM
