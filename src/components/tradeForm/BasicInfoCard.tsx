import { POPOVER } from '../../lib/motion';
import { smartUpper } from '../../constants/constants';
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { canonicalAsset } from "../../lib/tradeModel";
import { TurkishDatePicker } from "../TurkishDateTimePicker";
import { Search, Layers, Check } from "lucide-react";
import type { AccountCategory } from "../../types";
import { SetState, Titles, SlideBg } from './shared';

/* ================= 1. KART: TEMEL BİLGİLER (parite, yön, hesap türü, tarih) ================= */
export const BasicInfoCard = React.memo(function BasicInfoCard({
  titles,
  assets,
  asset,
  setAsset,
  pairError,
  setPairError,
  assetInputRef,
  isAssetDropdownOpen,
  setIsAssetDropdownOpen,
  type,
  setType,
  accountKind,
  setAccountKind,
  accountError,
  setAccountError,
  tradeDate,
  setTradeDate,
}: {
  titles: Titles;
  assets: string[];
  asset: string;
  setAsset: SetState<string>;
  pairError: boolean;
  setPairError: SetState<boolean>;
  assetInputRef: React.RefObject<HTMLInputElement | null>;
  isAssetDropdownOpen: boolean;
  setIsAssetDropdownOpen: SetState<boolean>;
  type: "LONG" | "SHORT";
  setType: SetState<"LONG" | "SHORT">;
  accountKind: AccountCategory | null;
  setAccountKind: SetState<AccountCategory | null>;
  accountError: boolean;
  setAccountError: SetState<boolean>;
  tradeDate: string;
  setTradeDate: SetState<string>;
}) {
  const { L, H } = titles;
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const [assetActiveIndex, setAssetActiveIndex] = useState(0);
  const assetMatches = useMemo(
    () => assets.filter((x) => canonicalAsset(x).includes(canonicalAsset(asset))),
    [assets, asset],
  );

  // Parite listesi açıkken dışarı tıklanınca kapanır (dinleyici yalnızca liste açıkken)
  useEffect(() => {
    if (!isAssetDropdownOpen) return;
    const onDown = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) setIsAssetDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isAssetDropdownOpen, setIsAssetDropdownOpen]);

  const pickAsset = (a: string) => {
    setAsset(a);
    setPairError(false);
    setIsAssetDropdownOpen(false);
  };

  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Layers size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("basicInfoCard")}</span>
      </div>

      {/* Satır 1: Parite & Yön */}
      <div className="grid grid-cols-2 gap-2">
        {/* PARİTE */}
        <div className="relative" ref={assetDropdownRef}>
          <label className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">
            {H("assets", "PARİTE")}
          </label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
              <Search size={12} />
            </span>
            <input
              ref={assetInputRef}
              type="text"
              placeholder="ARA..."
              value={asset}
              autoComplete="off"
              role="combobox"
              aria-expanded={isAssetDropdownOpen}
              aria-invalid={pairError || undefined}
              onChange={(e) => {
                setAsset(e.target.value.toUpperCase());
                setPairError(false);
                setIsAssetDropdownOpen(true);
                setAssetActiveIndex(0);
              }}
              // Öneriler odakla değil tıklama / yazma / ok tuşuyla açılır: form açılırken alan kendiliğinden odaklanıyor,
              // liste pencerenin açılış animasyonuyla aynı anda açılınca takılıyordu
              onClick={() => {
                if (!isAssetDropdownOpen) {
                  setIsAssetDropdownOpen(true);
                  setAssetActiveIndex(0);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  if (!isAssetDropdownOpen) setIsAssetDropdownOpen(true);
                  const n = assetMatches.length;
                  if (n > 0) setAssetActiveIndex((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
                } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && isAssetDropdownOpen && assetMatches.length > 0) {
                  e.preventDefault();
                  pickAsset(assetMatches[Math.min(assetActiveIndex, assetMatches.length - 1)]);
                } else if (e.key === "Tab") {
                  setIsAssetDropdownOpen(false);
                }
              }}
              className={`w-full h-9 sm:h-9 pl-7.5 pr-2.5 bg-zinc-950/80 border ${pairError ? "border-rose-500/70 ring-1 ring-rose-500/30" : "border-zinc-700/70"} hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg sm:rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-ui uppercase shadow-inner font-sans font-bold`}
            />
          </div>
          <AnimatePresence>
            {isAssetDropdownOpen && (
              <motion.div
                key="asset-dropdown"
                {...POPOVER}
                className="origin-top absolute z-30 w-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl max-h-48 flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="overflow-y-auto flex-1 p-1 space-y-0.5 custom-scrollbar">
                  {(() => {
                    const matches = assetMatches;
                    if (matches.length === 0) {
                      return <div className="px-3 py-2 text-xs text-zinc-500 text-center font-sans font-bold">Bulunamadı</div>;
                    }
                    return matches.map((a, mi) => {
                      const isSel = a.toLowerCase() === asset.trim().toLowerCase();
                      const isActive = mi === assetActiveIndex;
                      return (
                        <div
                          key={a}
                          role="option"
                          aria-selected={isSel}
                          data-selected={isSel}
                          data-active={isActive || undefined}
                          onMouseEnter={() => setAssetActiveIndex(mi)}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            pickAsset(a);
                          }}
                          lang="en"
                          className={`dd-option px-2.5 py-1.5 rounded-lg text-xs font-sans font-bold uppercase cursor-pointer flex items-center justify-between gap-2 border ${
                            isSel ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : isActive ? "bg-zinc-800/90 text-white border-transparent" : "text-zinc-200 border-transparent"
                          }`}
                        >
                          <span className="truncate">{a}</span>
                          {isSel && <Check size={12} className="dd-check text-blue-400 shrink-0" strokeWidth={2.5} />}
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* YÖN (LONG/SHORT) */}
        <div>
          <label className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">{L("direction")}</label>
          <div className="grid grid-cols-2 gap-1 h-9 sm:h-9 bg-zinc-950/80 border border-zinc-700/70 rounded-lg sm:rounded-xl p-0.5 shadow-inner">
            <button lang="en"
              type="button"
              data-selected={type === "LONG"}
              onClick={() => setType("LONG")}
              className={`relative h-full rounded-md sm:rounded-lg text-xs font-sans font-bold uppercase transition-ui flex items-center justify-center cursor-pointer ${
                type === "LONG" ? "text-win font-bold" : "text-zinc-400 hover:text-zinc-200 font-bold"
              }`}
            >
              {type === "LONG" && <SlideBg id="tradeTypeSlide" rounded="rounded-md sm:rounded-lg" className="bg-win-bg border-win-border shadow-xs" />}
              <span className="relative z-10">LONG</span>
            </button>
            <button lang="en"
              type="button"
              data-selected={type === "SHORT"}
              onClick={() => setType("SHORT")}
              className={`relative h-full rounded-md sm:rounded-lg text-xs font-sans font-bold uppercase transition-ui flex items-center justify-center cursor-pointer ${
                type === "SHORT" ? "text-loss font-bold" : "text-zinc-400 hover:text-zinc-200 font-bold"
              }`}
            >
              {type === "SHORT" && <SlideBg id="tradeTypeSlide" rounded="rounded-md sm:rounded-lg" className="bg-loss-bg border-loss-border shadow-xs" />}
              <span className="relative z-10">SHORT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Satır 2: Hesap türü (Prop / Hesapsız) & Tarih (Türkiye takvim günü; saat sorulmaz, günün içindeki sıra girildiği andan gelir) */}
      <div className="grid grid-cols-2 gap-2">
        <div id="account-field">
          <label className={`text-label sm:text-label font-bold uppercase tracking-wide mb-2 block font-sans ${accountError ? "text-rose-400" : "text-zinc-300"}`}>
            {H("platforms", "Hesap")}
          </label>
          <div
            role="radiogroup"
            aria-invalid={accountError || undefined}
            className={`grid grid-cols-2 gap-1 h-9 bg-zinc-950/80 border ${accountError ? "border-rose-500/70 ring-1 ring-rose-500/30" : "border-zinc-700/70"} rounded-lg sm:rounded-xl p-0.5 shadow-inner`}
          >
            {([
              ["PROP", "Prop", "bg-blue-500/20 border-blue-500/45", "text-blue-200"],
              ["DEMO", "Hesapsız", "bg-amber-500/15 border-amber-500/40", "text-amber-200"],
            ] as const).map(([id, label, bg, fg]) => {
              const sel = accountKind === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  data-selected={sel}
                  onClick={() => {
                    setAccountKind(id);
                    setAccountError(false);
                  }}
                  className={`relative h-full rounded-md sm:rounded-lg text-xs font-sans font-bold uppercase transition-ui flex items-center justify-center cursor-pointer ${sel ? fg : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  {sel && <SlideBg id="accountKindSlide" rounded="rounded-md sm:rounded-lg" className={`${bg} shadow-xs`} />}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-w-0">
          <label className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            {smartUpper("Tarih")}
          </label>
          <div className="h-9 flex items-center">
            <TurkishDatePicker
              value={tradeDate.slice(0, 10)}
              onChange={(val) => { if (val) setTradeDate(val + (tradeDate.slice(10) || "T12:00")); }}
              className="w-full"
              showPresets={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
