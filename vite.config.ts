import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const backendProxy = process.env.VITE_PROXY_TARGET || 'http://localhost:8787'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Nelson-GPT — Pediatric Knowledge Assistant',
        short_name: 'Nelson-GPT',
        description: 'Trusted pediatric AI with Nelson textbook citations and PWA support.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#C9843B',
        background_color: '#F8F1E8',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Clinical mode',
            short_name: 'Clinical',
            url: '/?mode=clinical',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: backendProxy,
        changeOrigin: true,
      },
    },
  },
})
