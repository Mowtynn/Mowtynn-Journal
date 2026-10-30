import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Tek satırlık yatay şerit: içerik sığmazsa sol/sağ ok butonları belirir, fare tekerleği yatay kaydırır,
 * dokunmatikte parmakla kaydırılır. Uçlara gelince ilgili ok pasifleşir ve kenarda solma gösterilir.
 * `activeKey` değişince seçili öğe ([data-strip-active]) görünür alana kaydırılır.
 */
export function ScrollStrip({
  children,
  activeKey,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  activeKey?: string | null;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((p) => (p.left === left && p.right === right ? p : { left, right }));
  }, []);

  // Boyut / içerik değişince okların durumu güncellenir
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [update, children]);

  // Dikey tekerlek hareketi yatay kaydırmaya çevrilir; şerit uca dayandıysa sayfa kaydırması engellenmez
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Seçili öğe görünür alana gelsin (düzenleme modunda sondaki hesap seçiliyse vb.)
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>("[data-strip-active='true']");
    if (!el || !active) return;
    const a = active.offsetLeft;
    const b = a + active.offsetWidth;
    if (a < el.scrollLeft) el.scrollTo({ left: a - 4, behavior: "smooth" });
    else if (b > el.scrollLeft + el.clientWidth) el.scrollTo({ left: b - el.clientWidth + 4, behavior: "smooth" });
  }, [activeKey]);

  const step = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(80, el.clientWidth * 0.7), behavior: "smooth" });
  };

  const arrow = "shrink-0 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-ui cursor-pointer disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-zinc-400";
  const overflowing = edges.left || edges.right;

  return (
    <div className={`flex items-stretch min-w-0 ${className}`}>
      {overflowing && (
        <button type="button" aria-label="Sola kaydır" onClick={() => step(-1)} disabled={!edges.left} className={arrow}>
          <ChevronLeft size={15} />
        </button>
      )}
      <div
        ref={ref}
        onScroll={update}
        aria-label={ariaLabel}
        data-fade-left={edges.left || undefined}
        data-fade-right={edges.right || undefined}
        className="scroll-strip flex-1 min-w-0 flex flex-nowrap items-stretch gap-1 overflow-x-auto no-scrollbar overscroll-x-contain"
      >
        {children}
      </div>
      {overflowing && (
        <button type="button" aria-label="Sağa kaydır" onClick={() => step(1)} disabled={!edges.right} className={arrow}>
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
