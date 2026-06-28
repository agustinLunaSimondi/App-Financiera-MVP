import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'autoUpdate': el SW nuevo activa skipWaiting + clientsClaim solo, sin
      // esperar click del usuario. Antes era 'prompt' (toast "Recargar"), pero
      // quedaba JS viejo + CSS nuevo mezclado hasta que alguien tocaba el toast
      // (o nunca, en iOS standalone) → UI rota (headers duplicados, layout corrido).
      // Con autoUpdate + reload forzado en PWAUpdatePrompt, el bundle se actualiza solo.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Vueltito — Tu plata, en serio',
        short_name: 'Vueltito',
        description: 'Finanzas personales para argentinos. MercadoPago + dólar blue + AI en castellano.',
        theme_color: '#10b981',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
