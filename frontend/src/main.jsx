// import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BreadcrumbProvider } from './components/navigation_and_controls/BreadcrumbContext.jsx'
import './index.css'

const root = createRoot(document.getElementById('root'))

root.render(
  <BrowserRouter>
    <BreadcrumbProvider>
      <App />
    </BreadcrumbProvider>
  </BrowserRouter>,
)
