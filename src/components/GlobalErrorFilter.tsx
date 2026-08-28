import React, { useEffect } from 'react';

export function GlobalErrorFilter({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || '';
      
      const msgLower = (msg || '').toLowerCase();
      // Eklenti/Adblock kaynaklı "Script error.", SpeechSynthesis ve TradingView iframe hatalarını filtrele
      const isThirdPartyNoise =
        msg === 'Script error.' || 
        msg.includes('Script error.') ||
        msgLower.includes('speechsynthesis') ||
        msgLower.includes('speech synthesis') ||
        msgLower.includes('cannot listen to the event from the provided iframe') ||
        msgLower.includes('contentwindow is not available');

      if (isThirdPartyNoise) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = (event.reason?.message || event.reason?.stack || String(event.reason || '')).toLowerCase();
      
      if (
        reasonStr.includes('speechsynthesis') ||
        reasonStr.includes('speech synthesis') ||
        reasonStr.includes('cannot listen to the event from the provided iframe') ||
        reasonStr.includes('contentwindow is not available')
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  return <>{children}</>;
}
