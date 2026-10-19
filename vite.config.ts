import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function marketTickerPlugin(): Plugin {
  const handleTicker = async (req: any, res: any) => {
    try {
      let bodyData: any = {};
      if (req.method === 'POST') {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        if (buffers.length > 0) {
          try {
            bodyData = JSON.parse(Buffer.concat(buffers).toString());
          } catch {}
        }
      }

      const symbols = bodyData.symbols || ['OANDA:XAUUSD', 'TVC:USOIL', 'TVC:DXY'];

      const tvResponse = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          symbols: { tickers: symbols },
          columns: ['name', 'close', 'change', 'description', 'exchange', 'type']
        })
      });

      if (tvResponse.ok) {
        const tvData = await tvResponse.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(JSON.stringify({ success: true, data: tvData.data || [], timestamp: new Date().toISOString() }));
      }

      throw new Error('TradingView scanner response invalid');
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error?.message || 'Failed to fetch market ticker' }));
    }
  };

  const handleSymbols = async (req: any, res: any) => {
    try {
      const tvResponse = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          filter: [{ left: 'exchange', operation: 'in_range', right: ['OANDA', 'TVC', 'FXCM'] }],
          columns: ['name', 'close', 'change', 'description', 'exchange', 'type'],
          options: { range: [0, 500] }
        })
      });

      if (tvResponse.ok) {
        const tvData = await tvResponse.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(JSON.stringify({ success: true, data: tvData.data || [] }));
      }

      throw new Error('Failed to fetch available symbols');
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error?.message || 'Failed to fetch symbols' }));
    }
  };

  return {
    name: 'market-ticker-plugin',
    configureServer(server) {
      server.middlewares.use('/api/market-ticker', handleTicker);
      server.middlewares.use('/api/market-symbols', handleSymbols);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/market-ticker', handleTicker);
      server.middlewares.use('/api/market-symbols', handleSymbols);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), marketTickerPlugin(), VitePWA({
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
            // Not: önceki `id.includes('react')` kontrolü lucide-react, react-markdown, react-virtuoso,
            // react-hot-toast gibi paketleri de vendor-react içine çekiyordu. Artık yalnızca çekirdek paketler.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion';
            if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'vendor-firebase';
            if (/node_modules\/(recharts|d3-[^/]+)\//.test(id)) return 'vendor-charts';
            if (/node_modules\/lucide-react\//.test(id)) return 'vendor-icons';
            // Hepsi statik import; ayrı parçalar paralel indirilir ve uygulama kodu değişince önbellekten gelir.
            if (/node_modules\/(xlsx|jspdf|html2canvas|html-to-image|canvg|fflate|dompurify|svg-pathdata|rgbcolor|stackblur-canvas)\//.test(id)) return 'vendor-export';
            if (/node_modules\/(react-markdown|remark-[^/]+|rehype-[^/]+|unified|mdast-[^/]+|hast-[^/]+|micromark[^/]*|unist-[^/]+|vfile[^/]*|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities[^/]*|trim-lines|trough|bail|is-plain-obj|devlop|html-url-attributes|estree-util-[^/]+|ccount|zwitch|longest-streak|markdown-table)\//.test(id)) return 'vendor-markdown';
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: { clientPort: 443, overlay: false },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
