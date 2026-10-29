import { StrictMode } from 'react';
import { MotionConfig } from 'motion/react';
import { createRoot } from 'react-dom/client';
// Yazı tipi projeye gömülü (çevrimdışı da çalışır; PWA önbelleğine woff2 olarak girer)
import '@fontsource-variable/dm-sans';
import './index.css';
import { GlobalErrorFilter } from './components/GlobalErrorFilter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PasswordGate } from './components/PasswordGate.tsx';
import App from './App.tsx';
import { reloadForNewVersion } from './lib/chunkReload.ts';
import { startUppercaseFixer } from './lib/upperText.ts';
import './lib/firebase.ts'; // Eagerly initialize Firebase auth in the background

// Yeni sürüm yayınlandıktan sonra eski sekmede eksik parça: bir kez yenile
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorFilter>
      <ErrorBoundary>
        <PasswordGate>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </PasswordGate>
      </ErrorBoundary>
    </GlobalErrorFilter>
  </StrictMode>,
);

// Büyük harfli başlıklarda Türkçe / İngilizce harf kuralı (GİRİŞ, TIMEFRAME)
startUppercaseFixer();
