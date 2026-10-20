import { useEffect } from 'react';

let activeModalCount = 0;
let prevHtmlOverflow = '';
let prevBodyPaddingRight = '';

/**
 * Modal / overlay açıkken arka plan kaydırmasını kilitler.
 * - Sayaç sayesinde iç içe modallar sorunsuz çalışır.
 * - <body> kaydırma kabı yapılmaz: üst navigasyon çubuğu (sticky) pencere açıkken de yerinde kalır.
 * - Kaydırma çubuğu kaybolunca sayfanın genişleyip içeriğin kaymasını (arka planın
 *   "sıkışma/zıplama" hissi) engeller: `scrollbar-gutter: stable` (index.css) yoksa,
 *   çubuk genişliği kadar padding-right ile telafi edilir.
 */
export function useBodyScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalCount++;
    if (activeModalCount === 1) {
      const html = document.documentElement;
      const body = document.body;

      prevHtmlOverflow = html.style.overflow;
      prevBodyPaddingRight = body.style.paddingRight;

      const supportsGutter =
        typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('scrollbar-gutter: stable');
      const scrollbarWidth = window.innerWidth - html.clientWidth;

      if (!supportsGutter && scrollbarWidth > 0) {
        const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + scrollbarWidth}px`;
      }

      // Yalnızca <html> kilitlenir. <body>'ye overflow verilirse body kendi kaydırma kabı olur ve
      // `position: sticky` üst çubuk kaydırılmış sayfada görünümden kaybolur.
      html.style.overflow = 'hidden';
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.paddingRight = prevBodyPaddingRight;
      }
    };
  }, [isOpen]);
}
