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
        /**
         * public 配下のメニュー画像をプリキャッシュに含めると SW 初回が数十 MB になり、
         * 店舗 Wi‑Fi / 古いタブレットで install が落ちる・途中で壊れると main の import が届かず
         * 「背景色だけ」の真っ白に近い状態になる（ローカル dev は PWA 無効のため再現しない）。
         */
        globIgnores: ['**/*.{png,jpg,jpeg,webp}'],
        /** JS/CSS/HTML 以外の巨大ファイルは globIgnores で外す前提。残りはフォント等 */
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              request.destination === 'image' &&
              /\.(?:png|webp|jpe?g|svg)$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'beifutei-media',
              expiration: { maxEntries: 260, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
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
