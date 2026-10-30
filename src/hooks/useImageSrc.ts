import { useEffect, useState } from 'react';
import { isImageRef, loadImage } from '../lib/imageStore';

/**
 * Görsel kaynağı: "fsimg:…" referansı Firestore'dan yüklenir (önbellekli); bağlantı ve data URL olduğu gibi döner.
 * Yüklenirken undefined, bulunamazsa null.
 */
export function useImageSrc(src: string | null | undefined): string | null | undefined {
  const [resolved, setResolved] = useState<string | null | undefined>(() => (src && !isImageRef(src) ? src : undefined));
  useEffect(() => {
    if (!src) {
      setResolved(null);
      return;
    }
    if (!isImageRef(src)) {
      setResolved(src);
      return;
    }
    let alive = true;
    setResolved(undefined);
    loadImage(src).then((v) => alive && setResolved(v));
    return () => {
      alive = false;
    };
  }, [src]);
  return resolved;
}
