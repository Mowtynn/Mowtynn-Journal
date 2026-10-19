import { StrictMode } from 'react';
import { MotionConfig } from 'motion/react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { GlobalErrorFilter } from './components/GlobalErrorFilter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PasswordGate } from './components/PasswordGate.tsx';
import App from './App.tsx';
import { MetricProvider } from './context/MetricContext.tsx';
import './lib/firebase.ts'; // Eagerly initialize Firebase auth in the background

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorFilter>
      <ErrorBoundary>
        <PasswordGate>
          <MotionConfig reducedMotion="user">
            <MetricProvider>
              <App />
            </MetricProvider>
          </MotionConfig>
        </PasswordGate>
      </ErrorBoundary>
    </GlobalErrorFilter>
  </StrictMode>,
);
