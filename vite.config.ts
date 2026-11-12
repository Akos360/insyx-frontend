/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    // The React Query persister's cache buster (src/lib/queryPersist.ts).
    // Includes a build-time timestamp, not just package.json's version —
    // this app's version is a static "0.0.0" with no release process that
    // bumps it, so the version alone would never actually change and the
    // buster would never bust anything. Date.now() here runs once when this
    // config is evaluated (once per `vite build`/Docker image), so it's
    // identical for every user of a given deployed build and changes on
    // every new one — a deploy that changes a response shape discards the
    // whole persisted cache instead of risking an old-shaped response.
    __APP_VERSION__: JSON.stringify(`${pkg.version}-${Date.now()}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      // Without this, the plugin falls back to its own defaults (the
      // literal package name as both name/short_name, Vue's default
      // #42b883 theme color, and no icons at all) — failing the standard
      // PWA installability checks outright. Icons are generated from the
      // existing globe.svg favicon via scripts/generate-pwa-icons.mjs.
      manifest: {
        name: 'Insyx',
        short_name: 'Insyx',
        description: 'Bibliometric / science-of-science explorer',
        theme_color: '#0B0F14',
        background_color: '#0B0F14',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        // This app's main entry chunk (echarts-gl/three.js/maplibre-gl, etc.)
        // exceeds Workbox's 2 MiB default precache limit — raised with
        // headroom so the whole app shell (Goal 2 of the caching design)
        // actually gets precached instead of silently being skipped.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Belt-and-suspenders alongside the runtimeCaching allowlist above:
        // the SW's SPA-shell fallback must never intercept a direct
        // navigation to the backend API.
        navigateFallbackDenylist: [/^\/works\//, /^\/auth\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
