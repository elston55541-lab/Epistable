import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MarketplaceApp from './MarketplaceApp.jsx'
import { PasswordRecovery } from './marketplace/PasswordRecovery.jsx'
import { LegacyWorkspaceNotice } from './marketplace/LegacyWorkspaceNotice.jsx'
import { registerServiceWorker } from './registerServiceWorker.js'
import './styles.css'

registerServiceWorker()

const path = window.location.pathname
const resetPassword = path === '/reset-password' || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
const forgotPassword = path === '/forgot-password'
const legacyRoute = path.startsWith('/slab/') || path.startsWith('/quote/') || path.startsWith('/invite') || path.startsWith('/legacy')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {!resetPassword && path.startsWith('/legacy') && <LegacyWorkspaceNotice />}
    {resetPassword || forgotPassword ? <PasswordRecovery reset={resetPassword} /> : legacyRoute ? <App /> : <MarketplaceApp />}
  </React.StrictMode>
)
