import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths so the app works from any folder (e.g. GitHub Pages /LeLapinQuiParleFrancais/).
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Le Lapin qui parle français',
        short_name: 'Le Lapin',
        description: 'French flashcards',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fdf8ec',
        theme_color: '#fdf8ec',
        icons: [
          { src: 'icons/bunny-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/bunny-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/bunny-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the whole app, including all 149 card images, for offline use.
        globPatterns: ['**/*.{js,css,html,png,webp,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
