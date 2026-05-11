import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '米風亭 オーダー',
        short_name: 'オーダー',
        description: '店舗向けオーダー端末（PWA）',
        theme_color: '#FDF9F1',
        background_color: '#FDF9F1',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/',
        start_url: '/',
        /** public/favicon.svg（192/512 PNG は任意で後から追加可） */
        icons: [{ src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        /** MPA（index / master / kitchen）で document を index に吸わせない */
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        /** メニュー PNG が 2MiB 超 → Workbox 既定でビルド失敗するため上限を拡張 */
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  /** host: true で LAN の http://192.168.x.x:5173 も可。ポートが客席と違うと localStorage は共有されません */
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        master: './master.html',
        kitchen: './kitchen.html',
      },
    },
  },
})
