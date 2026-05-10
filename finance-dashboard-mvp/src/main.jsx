import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css'
import App from './App.jsx'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// Aplicar dark mode antes del primer render para evitar el flash de tema claro.
// Lee la preferencia persistida en localStorage; si no hay nada, usa la del sistema.
(() => {
    try {
        const stored = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        const isDark = stored !== null ? stored === 'true' : prefersDark;
        document.documentElement.classList.toggle('dark', isDark);
    } catch {
        // localStorage podría no estar disponible (modo privado, sandbox, etc.)
    }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
      <Analytics />
      <SpeedInsights />
    </GoogleOAuthProvider>
  </StrictMode>,
)
