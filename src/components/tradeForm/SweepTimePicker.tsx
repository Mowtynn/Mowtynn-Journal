import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Clock, Minus, Plus, X, Check } from "lucide-react";
import { POPOVER } from "../../lib/motion";

/**
 * Sweep Time: New York saatiyle "HH:mm" seçici. Tıklayınca saat (00–23) ve dakika (5'er) ızgarası açılır;
 * dakika ±1 ile ince ayarlanır. Değer boşsa "Saat Seç" görünür, çarpı ile temizlenir.
 */
const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const POPUP_W = 300;

function parse(v: string): { h: number; m: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v || "");
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

export const SweepTimePicker = React.memo(function SweepTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const cur = parse(value);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(POPUP_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const below = r.bottom + 6;
    const estH = 330;
    const top = below + estH > window.innerHeight && r.top - estH - 6 > 8 ? r.top - estH - 6 : below;
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onMove = () => place();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  const set = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);
  const nudge = (d: number) => {
    const base = cur ? cur.h * 60 + cur.m : 0;
    const t = (base + d + 1440) % 1440;
    set(Math.floor(t / 60), t % 60);
  };

  const cell = (active: boolean) =>
    `h-8 rounded-lg text-xs font-sans font-bold tabular-nums transition-ui border cursor-pointer ${
      active
        ? "bg-blue-500/20 text-blue-200 border-blue-500/50 shadow-xs"
        : "bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-600 hover:bg-zinc-800/60"
    }`;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          ref={btnRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex-1 min-w-0 h-9 bg-zinc-950/80 hover:bg-zinc-900 border rounded-xl px-3 text-xs font-sans font-bold flex items-center justify-between gap-2 cursor-pointer transition-ui shadow-inner ${
            open ? "border-blue-500/60 ring-1 ring-blue-500/25" : cur ? "border-blue-500/40" : "border-zinc-800 hover:border-zinc-600"
          }`}
        >
          <span className={`tabular-nums tracking-wide truncate ${cur ? "text-blue-200" : "text-zinc-500"}`}>
            {cur ? value : "Saat Seç"}
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-bold text-zinc-500 border border-zinc-800 rounded-md px-1 py-px">NY</span>
            <Clock size={13} className={cur ? "text-blue-400" : "text-zinc-500"} />
          </span>
        </button>
        {cur && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Temizle"
            aria-label="Sweep Time'ı temizle"
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80 text-zinc-500 hover:text-blue-300 hover:border-blue-500/40 transition-ui cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                key="sweep-time-popup"
                {...POPOVER}
                ref={popRef}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Sweep Time seç"
                style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.min(POPUP_W, window.innerWidth - 16), zIndex: 99999 }}
                className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-3 shadow-2xl space-y-3"
              >
                {/* Seçili değer + dakika ince ayarı */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums text-zinc-100">{cur ? value : "--:--"}</span>
                    <span className="text-[10px] font-bold text-zinc-500">NY</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => nudge(-1)} aria-label="1 dakika geri" className="h-7 w-7 flex items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer transition-ui">
                      <Minus size={12} />
                    </button>
                    <button type="button" onClick={() => nudge(1)} aria-label="1 dakika ileri" className="h-7 w-7 flex items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer transition-ui">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-zinc-500 tracking-wide mb-1.5">SAAT</div>
                  <div className="grid grid-cols-6 gap-1">
                    {HOURS.map((h) => (
                      <button key={h} type="button" data-selected={cur?.h === h} onClick={() => set(h, cur?.m ?? 0)} className={cell(cur?.h === h)}>
                        {pad(h)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-zinc-500 tracking-wide mb-1.5">DAKİKA</div>
                  <div className="grid grid-cols-6 gap-1">
                    {MINUTES.map((m) => (
                      <button key={m} type="button" data-selected={cur?.m === m} onClick={() => set(cur?.h ?? 0, m)} className={cell(cur?.m === m)}>
                        {pad(m)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-800/80">
                  {cur && (
                    <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="h-7 px-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-blue-300 border border-transparent hover:border-blue-500/30 cursor-pointer transition-ui">
                      Temizle
                    </button>
                  )}
                  <button type="button" onClick={() => setOpen(false)} className="h-7 px-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/40 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 transition-ui">
                    <Check size={11} /> Tamam
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
});
