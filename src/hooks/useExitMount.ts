import { useEffect, useState } from 'react';
import { MODAL_EXIT_MS } from '../lib/motion';

/**
 * `{open && <Modal/>}` kalıbı çıkış animasyonunu keser (bileşen anında sökülür).
 * Bu kanca, `open` false olduktan sonra çıkış animasyonu bitene kadar `true` döner;
 * böylece pencere `isOpen={false}` ile kapanış animasyonunu oynatır ve sonra sökülür.
 */
export function useExitMount(open: boolean, exitMs: number = MODAL_EXIT_MS): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);
  return open || mounted;
}
