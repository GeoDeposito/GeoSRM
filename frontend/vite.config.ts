import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-geomiel.png', 'icon-geomiel.png', 'icon-192.png', 'icon-512.png', 'icons.svg'],
      manifest: {
        name: 'APICULTOR SRM - GeoMiel',
        short_name: 'GeoSRM',
        description: 'Plataforma de gestión de proveedores apícolas, trazabilidad de mieles y control de envases vacíos de GeoMiel.',
        theme_color: '#08201A',
        background_color: '#FBF9F8',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
