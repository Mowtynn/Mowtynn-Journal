import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

let lastQuotaToastAt = 0;
function notifyStorageFull(key: string, err: unknown) {
  console.error(`Failed to save ${key} to localStorage:`, err);
  const now = Date.now();
  if (now - lastQuotaToastAt < 30000) return; // aynı uyarı arka arkaya yığılmasın
  lastQuotaToastAt = now;
  toast.error('Tarayıcı hafızası dolu! Veriler yerel olarak kaydedilemedi; bulut ile senkronize edebilirsiniz.');
}

/**
 * State'i localStorage ile eşler. Yazma gecikmeli (debounce) yapılır; sekme kapanırken,
 * gizlenirken veya yenilenirken bekleyen yazma anında tamamlanır, böylece son değişiklik kaybolmaz.
 * Kayıt/silme fonksiyonları artık kendileri localStorage'a yazmaz; tek yazım noktası burasıdır.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  delay: number = 300,
  skipSaveWhenUserPresent: boolean = false,
  user: any = null
) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error(`Failed to load ${key} from localStorage:`, err);
    }
    return defaultValue;
  });

  const latestRef = useRef(state);
  latestRef.current = state;
  const dirtyRef = useRef(false);
  const skipRef = useRef(false);
  skipRef.current = skipSaveWhenUserPresent && !!user;
  const firstRunRef = useRef(true);

  const write = () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      localStorage.setItem(key, JSON.stringify(latestRef.current));
    } catch (err) {
      notifyStorageFull(key, err);
    }
  };

  useEffect(() => {
    if (skipSaveWhenUserPresent && user) return;
    // İlk render'da (değer zaten depodan okundu) gereksiz yazma yapma
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    dirtyRef.current = true;
    const timer = setTimeout(write, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, key, delay, skipSaveWhenUserPresent, user]);

  useEffect(() => {
    const flush = () => {
      if (!skipRef.current) write();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [state, setState] as const;
}
