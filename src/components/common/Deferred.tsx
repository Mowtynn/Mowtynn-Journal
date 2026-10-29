import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Yükleniyor işareti (klasik tema: koyu kart, mavi vurgu).
 * Kısa yüklemelerde hiç görünmez: ~120 ms gecikmeyle yumuşakça belirir, böylece anlık geçişlerde yanıp sönmez.
 */
export function PaneLoader({ minHeight = 320, label = 'Yükleniyor', compact = false }: { minHeight?: number; label?: string; compact?: boolean }) {
  return (
    <div className="pane-loader" style={{ minHeight }} role="status" aria-live="polite" aria-busy="true">
      <div className="pane-loader-badge">
        <span className="pane-loader-ring" aria-hidden="true" />
        <span className="pane-loader-label">
          {label}
          <span className="pane-loader-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
        </span>
      </div>
      {!compact && (
        <div className="pane-loader-rows" aria-hidden="true">
          <span style={{ width: '92%' }} />
          <span style={{ width: '74%' }} />
          <span style={{ width: '83%' }} />
        </div>
      )}
    </div>
  );
}

/**
 * Ekranın altında kalan ağır bölümleri, görünür alana yaklaşınca (ya da tarayıcı boşta kalınca) çizer.
 * Sekme ilk açıldığında üst kısım hemen gelir; alttaki büyük paneller kaydırma sırasında hazırlanır.
 */
export function Deferred({
  children,
  minHeight = 320,
  rootMargin = '600px 0px',
  idleMs = 2500,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  /** Görünmese bile bu süre sonra (boşta) çiz; 0 = yalnızca görününce */
  idleMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShow(true);
      },
      { rootMargin },
    );
    io.observe(el);
    let t = 0;
    if (idleMs > 0) {
      t = window.setTimeout(() => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => setShow(true), { timeout: 2000 });
        else setShow(true);
      }, idleMs);
    }
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [show, rootMargin, idleMs]);

  if (!show)
    return (
      <div ref={ref}>
        <PaneLoader minHeight={minHeight} />
      </div>
    );
  return (
    <Suspense fallback={<PaneLoader minHeight={minHeight} />}>
      <div className="pane-content-in">{children}</div>
    </Suspense>
  );
}
