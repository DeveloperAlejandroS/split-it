import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: en iPhone, Safari solo entrega push y look de "app real" (ícono
    // propio, pantalla completa sin chrome de Safari) a sitios agregados a
    // la pantalla de inicio -- este manifest + service worker es lo que
    // hace que "Agregar a inicio" sea posible y se sienta como una app.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Split.it',
        short_name: 'Split.it',
        description: 'Gastos compartidos, presupuesto personal y cuentas por cobrar/pagar, todo en un solo lugar.',
        // Morado de marca -- coincide con el degradé del ícono, para que la
        // transición del splash screen a la app se sienta continua.
        theme_color: '#9c4df4',
        background_color: '#0b0713',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
