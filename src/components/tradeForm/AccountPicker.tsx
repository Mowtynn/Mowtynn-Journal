import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, Search, Shield } from "lucide-react";
import { POPOVER } from "../../lib/motion";
import { NO_ACCOUNT, AccountOption } from "./shared";

/*
 * Hesap seçici: tek satırlık, sabit yükseklikte kompakt alan. Seçili hesap adı, bakiyesi ve aşamasıyla görünür;
 * tıklayınca açılan listede her hesap tam adıyla, bakiye ve aşama rozetiyle sıralanır (Hesapsız en sonda).
 * 6'dan fazla seçenekte arama kutusu çıkar. Hesap sayısı formun boyunu hiçbir zaman değiştirmez.
 */

const sizeLabel = (size?: number) =>
  typeof size === "number" && size > 0 ? (size >= 1000 ? `${Math.round(size / 1000)}K` : String(size)) : null;

function StageBadge({ stage, active }: { stage: number; active?: boolean }) {
  const funded = stage === 0;
  return (
    <span
      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
        funded ? "bg-emerald-500/15 text-emerald-300" : active ? "bg-blue-500/25 text-blue-200" : "bg-zinc-800 text-zinc-400"
      }`}
    >
      {funded ? "Funded" : `Faz ${stage}`}
    </span>
  );
}

export function AccountPicker({
  options,
  value,
  onChange,
  error,
  label,
}: {
  options: AccountOption[];
  value: string | null;
  onChange: (id: string) => void;
  error?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const showSearch = options.length + 1 > 6;

  const items = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const accs = needle ? options.filter((o) => o.label.toLocaleLowerCase("tr").includes(needle)) : options;
    const noAcc = !needle || "hesapsız".includes(needle);
    return [...accs.map((o) => ({ id: o.id, acc: o as AccountOption | null })), ...(noAcc ? [{ id: NO_ACCOUNT, acc: null }] : [])];
  }, [options, q]);

  const selected = options.find((o) => o.id === value) || null;
  const isNoAccount = value === NO_ACCOUNT;

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(Math.max(0, items.findIndex((i) => i.id === value)));
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 30);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) choose(it.id);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-invalid={error || undefined}
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-10 px-3 rounded-xl border bg-zinc-950/80 flex items-center gap-2 text-left transition-ui cursor-pointer ${
          error ? "border-rose-500/60" : open ? "border-blue-500/60 ring-1 ring-blue-500/25" : "border-zinc-700/70 hover:border-zinc-500"
        }`}
      >
        {selected ? (
          <>
            <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.stage === 0 ? "bg-emerald-400" : "bg-blue-400"}`} />
            <span className="truncate flex-1 text-xs font-semibold text-zinc-100">{selected.label}</span>
            {sizeLabel(selected.size) && <span className="shrink-0 text-[11px] font-semibold text-zinc-500 tabular-nums">{sizeLabel(selected.size)}</span>}
            <StageBadge stage={selected.stage} active />
          </>
        ) : isNoAccount ? (
          <>
            <Shield size={13} className="text-amber-400 shrink-0" />
            <span className="flex-1 text-xs font-semibold text-amber-200">Hesapsız</span>
          </>
        ) : (
          <span className="flex-1 text-xs text-zinc-500">{options.length ? "Hesap seç" : "Hesap seç (yalnızca Hesapsız)"}</span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...POPOVER}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/60 p-1.5"
          >
            {showSearch && (
              <div className="relative mb-1.5">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Hesap ara…"
                  className="w-full h-8 pl-7 pr-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60"
                />
              </div>
            )}
            <ul className="max-h-60 overflow-y-auto overscroll-contain custom-scrollbar flex flex-col gap-0.5">
              {items.map((it, i) => {
                const sel = it.id === value;
                const hl = i === active;
                return (
                  <React.Fragment key={it.id}>
                  {it.acc === null && i > 0 && <li aria-hidden className="my-1 border-t border-zinc-800/80" />}
                  <li role="option" aria-selected={sel}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(it.id)}
                      className={`w-full h-9 px-2.5 rounded-lg flex items-center gap-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                        hl ? "bg-zinc-800 text-white" : "text-zinc-300"
                      }`}
                    >
                      {it.acc ? (
                        <>
                          <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${it.acc.stage === 0 ? "bg-emerald-400" : "bg-blue-400"}`} />
                          <span className="truncate flex-1">{it.acc.label}</span>
                          {sizeLabel(it.acc.size) && <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums">{sizeLabel(it.acc.size)}</span>}
                          <StageBadge stage={it.acc.stage} active={sel} />
                        </>
                      ) : (
                        <>
                          <Shield size={12} className="text-amber-400 shrink-0" />
                          <span className="flex-1 text-amber-200/90">Hesapsız</span>
                        </>
                      )}
                      <Check size={13} className={`shrink-0 ${sel ? "text-blue-400" : "opacity-0"}`} />
                    </button>
                  </li>
                  </React.Fragment>
                );
              })}
              {items.length === 0 && <li className="px-2.5 py-2 text-[11px] text-zinc-500">Eşleşen hesap yok</li>}
            </ul>
            {options.length === 0 && (
              <p className="px-2.5 pt-1.5 text-[10px] text-zinc-500">Aktif prop hesabı yok · Prop sekmesinden ekleyebilirsin.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
