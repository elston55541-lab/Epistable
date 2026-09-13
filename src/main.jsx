import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MarketplaceApp from './MarketplaceApp.jsx'
import { LegacyWorkspaceNotice } from './marketplace/LegacyWorkspaceNotice.jsx'
import { registerServiceWorker } from './registerServiceWorker.js'
import './styles.css'

registerServiceWorker()

const path = window.location.pathname
const legacyRoute = path.startsWith('/slab/') || path.startsWith('/quote/') || path.startsWith('/invite') || path.startsWith('/legacy')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {path.startsWith('/legacy') && <LegacyWorkspaceNotice />}
    {legacyRoute ? <App /> : <MarketplaceApp />}
  </React.StrictMode>
)
