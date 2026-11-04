import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    svelte(),
    // Makes the app installable and usable offline: a service worker precaches the app shell,
    // the dashboard chunk and the demo CSV. Workout data itself stays in IndexedDB.
    VitePWA({
      registerType: 'autoUpdate',
      // Registers from an external file rather than an inline script, which the CSP forbids.
      injectRegister: 'script-defer',
      manifest: {
        name: 'liftboard',
        short_name: 'liftboard',
        description: 'Explore your Hevy workout history in the browser.',
        theme_color: '#0E0F12',
        background_color: '#0E0F12',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Of the font files, only the Latin one is precached; other alphabets load on demand.
        globPatterns: [
          '**/*.{js,css,html,svg,png,csv,webmanifest}',
          '**/geist-latin-wght-normal-*.woff2',
        ],
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
