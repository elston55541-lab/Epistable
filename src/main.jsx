import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import FoodApp from './FoodApp.jsx'
import { registerServiceWorker } from './registerServiceWorker.js'
import './styles.css'

registerServiceWorker()

const isFoodRoute = window.location.pathname === '/food' || window.location.pathname.startsWith('/food/')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isFoodRoute ? <FoodApp /> : <App />}
  </React.StrictMode>
)
