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

  const handleCalendar = async (req: any, res: any) => {
    try {
      const tvResponse = await fetch('https://economic-calendar.tradingview.com/events?from=' + new Date().toISOString() + '&to=' + new Date(Date.now() + 86400000).toISOString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (tvResponse.ok) {
        const tvData = await tvResponse.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(JSON.stringify({ success: true, data: Array.isArray(tvData) ? tvData : (tvData.result || []) }));
      }

      throw new Error('Failed to fetch calendar');
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error?.message || 'Failed to fetch economic calendar' }));
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
      server.middlewares.use('/api/economic-calendar', handleCalendar);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/market-ticker', handleTicker);
      server.middlewares.use('/api/market-symbols', handleSymbols);
      server.middlewares.use('/api/economic-calendar', handleCalendar);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), marketTickerPlugin(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tj-icon-v5-64.png', 'tj-icon-v5.ico', 'tj-icon-v5.svg', 'tj-icon-v5-180.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000
      },
      manifest: {
        name: 'Trading Journal App',
        short_name: 'Trading Journal',
        description: 'Advanced Trading Journal Application',
        theme_color: '#121214',
        background_color: '#121214',
        display: 'standalone',
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
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('html2canvas')) {
                return 'vendor-canvas';
              }
              if (id.includes('react-markdown')) {
                return 'vendor-markdown';
              }
            }
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
