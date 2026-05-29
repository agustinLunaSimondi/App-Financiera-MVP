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
      // 'prompt' (no 'autoUpdate'): el SW nuevo espera y avisamos al usuario con
      // un toast "Recargar". iOS standalone no chequea updates solo de forma
      // confiable; con prompt + registration.update() periódico, el celular deja
      // de quedar pegado a un bundle viejo sin que el user se entere.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Vuelto — Tu plata, en serio',
        short_name: 'Vuelto',
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
