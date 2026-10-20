import { useEffect, useState } from 'react';
import { getNewsDayLabels, NEWS_DAYS_EVENT } from '../constants/constants';

/** Var / Yok etiketleri Tanımlamalar'dan değişince bunu kullanan ekranlar yeniden çizilir. */
export function useNewsDayLabels() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const h = () => setVersion((v) => v + 1);
    window.addEventListener(NEWS_DAYS_EVENT, h);
    return () => window.removeEventListener(NEWS_DAYS_EVENT, h);
  }, []);
  return { labels: getNewsDayLabels(), version };
}
