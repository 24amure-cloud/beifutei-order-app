import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite は通常 VITE_* だけをクライアントに埋め込む。
 * Vercel の Supabase 連携が付ける SUPABASE_URL / SUPABASE_ANON_KEY 等をビルド時に読み、
 * import.meta.env.VITE_* として同じ supabaseClient.js のまま使えるようにする（SERVICE_ROLE は含めない）。
 *
 * SUPABASE_KEY は公式ドキュメントや他フレームの旧例で使われる誤名の救済（値は anon / publishable のみ。secret は絶対に入れない）。
 */
function resolveSupabaseForClient(env) {
  const url = (
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim()
  const key = (
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_KEY ||
    ''
  ).trim()
  return { url, key }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const merged = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const { url: sbUrl, key: sbKey } = resolveSupabaseForClient(merged)

  return {
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey),
  },
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
        /**
         * HTML をプリキャッシュに含めない（含めると SW 更新後も古い shell が残り、
         * ビルド時に埋め込んだ Supabase URL 等が古いままになりやすい）。
         * JS/CSS はハッシュ付きファイル名のため長期キャッシュでよい。
         */
        globPatterns: ['**/*.{js,css,ico,svg,webp,woff2}'],
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
          {
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              (request.destination === 'video' || /\.(?:mp4|webm|ogg|mov)$/i.test(url.pathname)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'beifutei-video',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
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
  }
})
