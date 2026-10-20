import { useEffect, useState } from 'react';
import { MODAL_EXIT_MS } from '../lib/motion';

/**
 * Pencere açılırken ağır hesapları (tüm işlemleri tarayan seçenek listeleri, uzun bölümler) ilk karenin
 * ÇİZİLMESİNDEN SONRAYA erteler. Açılış animasyonu böylece hesapla yarışmaz, takılma hissi olmaz.
 * Pencere kapanırken çıkış animasyonu bitene kadar `true` kalır; içerik animasyon sırasında değişmez.
 */
export function useAfterPaint(active: boolean, exitMs: number = MODAL_EXIT_MS): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (active) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setReady(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    const t = window.setTimeout(() => setReady(false), exitMs);
    return () => window.clearTimeout(t);
  }, [active, exitMs]);
  return ready;
}
