import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tj-icon-v5-64.png', 'tj-icon-v5.ico', 'tj-icon-v5.svg', 'tj-icon-v5-180.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // /api istekleri asla index.html ile cevaplanmasın (SPA fallback bunları yutuyordu)
        navigateFallbackDenylist: [/^\/api\//],
        // Yeni sürüm yayınlanınca eski önbellek temizlensin ve yeni SW hemen devralsın
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        id: '/',
        name: 'Trading Journal by Mowtynn',
        short_name: 'TradingJournal',
        description: 'Gelişmiş İşlem Takip, Analiz ve Psikoloji Günlüğü',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/tj-icon-v5-64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/tj-icon-v5.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: '/tj-icon-v5-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/tj-icon-v5-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/tj-icon-v5-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/tj-icon-v5-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    }),],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: true,
      reportCompressedSize: false,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Not: önceki `id.includes('react')` kontrolü lucide-react, react-virtuoso,
            // react-hot-toast gibi paketleri de vendor-react içine çekiyordu. Artık yalnızca çekirdek paketler.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion';
            if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'vendor-firebase';
            if (/node_modules\/lucide-react\//.test(id)) return 'vendor-icons';
            // Dışa aktarma kütüphaneleri (xlsx, html-to-image) bilerek burada YOK:
            // yalnızca dinamik import ile, kullanıldıkları anda indirilirler; Rollup her birini kendi parçasına ayırır.
          }
        }
      }
    },
    server: {
      // Canlı yenileme (HMR). Yerelde Vite sayfanın kendi portunu kullanır; HTTPS proxy arkasında çalışırken
      // HMR_CLIENT_PORT=443 verilir. Eski sabit 443 ayarı yerelde bağlantıyı her açılışta düşürüyordu.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : { overlay: false, ...(process.env.HMR_CLIENT_PORT ? { clientPort: Number(process.env.HMR_CLIENT_PORT) } : {}) },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
