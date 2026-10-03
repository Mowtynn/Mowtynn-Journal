import { useEffect } from 'react';

let activeModalCount = 0;

/**
 * Custom hook to lock body scrolling when a modal or overlay window is open.
 * Uses a reference counter to support multiple/nested active modals seamlessly.
 */
export function useBodyScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalCount++;
    if (activeModalCount === 1) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);
}
