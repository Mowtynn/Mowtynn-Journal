import { createElement, lazy, useRef, type ComponentType } from 'react';

/**
 * React.lazy + önceden indirme: `C.preload()` parçayı indirir ama çizmez.
 * Parça önceden indirilmişse bileşen ASKIYA ALINMADAN, ilk karede doğrudan çizilir
 * (düz React.lazy, indirilmiş olsa bile ilk çizimde bir kez "yükleniyor"a düşer ve içerik geç gelir).
 */
export type PreloadableComponent<T extends ComponentType<any>> = T & { preload: () => Promise<unknown> };

export function lazyWithPreload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): PreloadableComponent<T> {
  let pending: Promise<{ default: T }> | null = null;
  let loaded: T | null = null;
  const load = () =>
    (pending ??= factory().then(
      (m) => {
        loaded = m.default;
        return m;
      },
      (err) => {
        // Başarısız indirme önbellekte kalmasın: bir sonraki denemede yeniden indirilir
        pending = null;
        throw err;
      },
    ));
  const Lazy = lazy(load);
  function Preloadable(props: any) {
    // Bileşen türü bağlandığı anda sabitlenir: sonradan değişip alt ağacı yeniden kurmaz
    const type = useRef<ComponentType<any> | null>(null);
    if (!type.current) type.current = (loaded as ComponentType<any> | null) ?? (Lazy as unknown as ComponentType<any>);
    return createElement(type.current, props);
  }
  const C = Preloadable as unknown as PreloadableComponent<T>;
  C.preload = load;
  return C;
}

/** Adlandırılmış dışa aktarımı lazy için default'a çevirir */
export const named = <M, K extends keyof M>(p: Promise<M>, key: K): Promise<{ default: M[K] }> => p.then((m) => ({ default: m[key] }));

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };

/**
 * Tarayıcı boşta kaldıkça parçaları sırayla indirir; ilk ekranı yavaşlatmaz.
 * Dönen fonksiyon bekleyen indirmeleri iptal eder.
 */
export function preloadWhenIdle(loaders: Array<() => Promise<unknown>>, startDelayMs = 1200): () => void {
  let cancelled = false;
  let i = 0;
  const w = window as IdleWindow;
  const schedule = (fn: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 3000 }) : window.setTimeout(fn, 200));
  const next = () => {
    if (cancelled || i >= loaders.length) return;
    const load = loaders[i++];
    load().catch(() => undefined).finally(() => schedule(next));
  };
  const t = window.setTimeout(() => schedule(next), startDelayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(t);
  };
}
