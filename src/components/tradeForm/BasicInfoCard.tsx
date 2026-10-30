import { POPOVER } from '../../lib/motion';
import { smartUpper } from '../../constants/constants';
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { stageLabel, ACCOUNT_STATUS_LABEL } from "../../lib/propAccounts";
import { canonicalAsset } from "../../lib/tradeModel";
import { TurkishDateTimePicker } from "../TurkishDateTimePicker";
import { ScrollStrip } from "../common/ScrollStrip";
import { Search, Layers, Check, Shield, X, Plus } from "lucide-react";
import { NO_ACCOUNT, RISK_PRESETS, Num, SetState, AccountOption, Titles, SlideBg } from './shared';
import { isNyWallTimeValid, nyInputToTs, toNyInput } from '../../lib/tradingTime';

/* ================= 1. KART: TEMEL BİLGİLER (parite, yön, hesap, risk, tarih) ================= */
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
  accountOptions,
  accountChoice,
  setAccountChoice,
  accountError,
  setAccountError,
  selectedAccount,
  riskChoice,
  setRiskChoice,
  customRiskPct,
  setCustomRiskPct,
  riskError,
  setRiskError,
  riskDollar,
  tradeDate,
  setTradeDate,
  exitDate,
  setExitDate,
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
  accountOptions: AccountOption[];
  accountChoice: string | null;
  setAccountChoice: SetState<string | null>;
  accountError: boolean;
  setAccountError: SetState<boolean>;
  selectedAccount: AccountOption | undefined;
  riskChoice: number | "CUSTOM" | null;
  setRiskChoice: SetState<number | "CUSTOM" | null>;
  customRiskPct: Num;
  setCustomRiskPct: SetState<Num>;
  riskError: boolean;
  setRiskError: SetState<boolean>;
  riskDollar: number | null;
  tradeDate: string;
  setTradeDate: SetState<string>;
  exitDate: string;
  setExitDate: SetState<string>;
}) {
  const { L, H } = titles;
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const customRiskRef = useRef<HTMLInputElement>(null);
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
          <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">
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
              onFocus={() => {
                setIsAssetDropdownOpen(true);
                setAssetActiveIndex(0);
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
          <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">{L("direction")}</label>
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

      {/* Satır 2: Hesap (aktif prop hesapları + Hesapsız) */}
      <div id="account-field">
        <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">
          {H("platforms", "HESAP")}
        </label>
        {/* Tek satır segmentli seçim (İşlem Durumu ile aynı dil). Sığmayan hesaplar ok butonları ve fare tekerleğiyle
            kaydırılır; "Hesapsız" sağda sabit. Renkli nokta = hesap türü (yeşil Funded, mavi değerlendirme). */}
        <div
          role="radiogroup"
          aria-invalid={accountError || undefined}
          className={`flex items-stretch h-10 gap-1 bg-zinc-950/80 border rounded-xl p-1 shadow-inner transition-ui ${accountError ? "border-rose-500/60" : "border-zinc-700/70"}`}
        >
          <ScrollStrip className="flex-1" activeKey={accountChoice} ariaLabel="Hesaplar">
            {accountOptions.map((a) => {
              const sel = accountChoice === a.id;
              const funded = a.stage === 0;
              const sizeLabel = typeof a.size === "number" && a.size > 0 ? (a.size >= 1000 ? `${Math.round(a.size / 1000)}K` : `$${a.size}`) : null;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  data-selected={sel}
                  data-strip-active={sel}
                  onClick={() => {
                    setAccountChoice(a.id);
                    setAccountError(false);
                  }}
                  title={`${a.label} · ${stageLabel(a)}${sizeLabel ? ` · ${sizeLabel}` : ""}${a.status && a.status !== "ACTIVE" ? ` · ${ACCOUNT_STATUS_LABEL[a.status]}` : ""}`}
                  className={`shrink-0 px-2.5 rounded-lg text-xs font-semibold font-sans flex items-center gap-1.5 whitespace-nowrap transition-ui cursor-pointer ${
                    sel
                      ? funded
                        ? "bg-blue-500/15 text-emerald-50 ring-1 ring-inset ring-blue-500/40"
                        : "bg-blue-500/15 text-blue-50 ring-1 ring-inset ring-blue-500/40"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${funded ? "bg-blue-400" : "bg-blue-400"}`} />
                  <span className="max-w-[9rem] truncate">{a.label}</span>
                  <span className={`shrink-0 text-[10px] font-bold px-1 rounded ${sel ? (funded ? "bg-blue-500/25 text-blue-200" : "bg-blue-500/25 text-blue-200") : "bg-zinc-800 text-zinc-400"}`}>
                    {funded ? "F" : `P${a.stage}`}
                  </span>
                </button>
              );
            })}
          </ScrollStrip>
          <span aria-hidden className="w-px my-1 bg-zinc-800 shrink-0" />
          <button
            type="button"
            role="radio"
            aria-checked={accountChoice === NO_ACCOUNT}
            data-selected={accountChoice === NO_ACCOUNT}
            onClick={() => {
              setAccountChoice(NO_ACCOUNT);
              setAccountError(false);
              setRiskError(false);
            }}
            title="Demo / backtest: risk seçilmez, yalnızca R"
            className={`shrink-0 px-2.5 rounded-lg text-xs font-semibold font-sans flex items-center gap-1 whitespace-nowrap transition-ui cursor-pointer ${
              accountChoice === NO_ACCOUNT
                ? "bg-blue-500/15 text-amber-50 ring-1 ring-inset ring-blue-500/40"
                : "text-zinc-500 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Shield size={12} className="text-blue-400 shrink-0" />
            Hesapsız
          </button>
        </div>
        {accountOptions.length === 0 && (
          <p className="text-[10px] text-zinc-500 mt-1 font-sans">Aktif prop hesabı yok. Prop sekmesinden ekleyebilirsin.</p>
        )}
      </div>

      {/* Risk satırı: her zaman yerinde durur (hesap ↔ Hesapsız geçişinde pencere yeniden boyutlanmasın).
          Prop hesabı seçili değilse çipler görünür ama seçilemez. % başlangıç bakiyesi üzerinden; $ karşılığı salt okunur */}
      {(() => {
        const riskDisabled = !selectedAccount;
        const chipBase = "h-9 rounded-lg border text-[11px] font-bold font-sans transition-ui";
        const chipIdle = riskDisabled
          ? "bg-zinc-950/40 border-zinc-800/70 text-zinc-600 cursor-not-allowed"
          : "bg-zinc-950/80 border-zinc-700/70 text-zinc-300 hover:border-zinc-500 hover:text-white cursor-pointer";
        const chipOn = "bg-blue-500/15 border-blue-500/45 text-blue-100 cursor-pointer";
        const showCustom = !riskDisabled && riskChoice === "CUSTOM";
        return (
          <div id="risk-field" aria-disabled={riskDisabled || undefined}>
            <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-2 block font-sans transition-colors ${riskDisabled ? "text-zinc-500" : "text-zinc-300"}`}>
              Risk (başlangıç bakiyesinin %'si)
            </label>
            {/* Tek satır, sarmaz: [$ karşılığı] [0.50] [0.75] [1.00] [% / elle giriş] — chipler kalan genişliği paylaşır */}
            <div
              role="radiogroup"
              aria-invalid={riskError || undefined}
              title={riskDisabled ? (accountChoice === NO_ACCOUNT ? "Hesapsız işlemde risk seçilmez; yalnızca R girilir" : "Önce bir prop hesabı seçin") : undefined}
              className={`flex flex-nowrap items-center gap-1.5 rounded-xl transition-ui ${riskError && !riskDisabled ? "ring-1 ring-rose-500/60 ring-offset-2 ring-offset-zinc-900" : ""}`}
            >
              <span
                className={`h-9 flex-[1.35] min-w-0 px-2 rounded-lg border border-dashed text-[11px] font-bold font-sans tabular-nums flex items-center justify-center gap-1 truncate ${riskDisabled ? "border-zinc-800 bg-zinc-950/30 text-zinc-600" : riskDollar !== null ? "border-blue-500/30 bg-blue-500/5 text-blue-200" : "border-zinc-700/70 bg-zinc-900/60 text-zinc-400"}`}
                title={selectedAccount?.size ? `Başlangıç bakiyesi $${selectedAccount.size.toLocaleString("en-US")} · riskin $ karşılığı` : "Riskin $ karşılığı"}
                aria-live="polite"
              >
                {riskDollar !== null ? `$${riskDollar.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "$ —"}
              </span>
              {RISK_PRESETS.map((pct) => {
                const sel = !riskDisabled && riskChoice === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    data-selected={sel}
                    disabled={riskDisabled}
                    onClick={() => {
                      setRiskChoice(pct);
                      setRiskError(false);
                    }}
                    className={`${chipBase} flex-1 min-w-0 px-1 tabular-nums ${sel ? chipOn : chipIdle}`}
                  >
                    {pct.toFixed(2)}
                  </button>
                );
              })}
              {showCustom ? (
                /* Elle yüzde: % düğmesinin yerine geçer, ayrıca yer kaplamaz */
                <div className="relative shrink-0 w-[4.75rem]">
                  <input
                    ref={customRiskRef}
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    inputMode="decimal"
                    placeholder="0.4"
                    aria-label="Risk yüzdesi"
                    value={customRiskPct}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomRiskPct(v !== "" && Number.isFinite(Number(v)) ? Math.abs(Number(v)) : "");
                      setRiskError(false);
                    }}
                    className="h-9 w-full bg-blue-500/10 border border-blue-500/45 focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 rounded-lg pl-2 pr-5 text-xs text-blue-100 focus:outline-none placeholder-blue-300/40 font-sans font-bold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-300/70">%</span>
                </div>
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked={false}
                  data-selected={false}
                  disabled={riskDisabled}
                  onClick={() => {
                    setRiskChoice("CUSTOM");
                    setRiskError(false);
                    window.setTimeout(() => customRiskRef.current?.focus(), 0);
                  }}
                  title={riskDisabled ? undefined : "Yüzdeyi elle gir"}
                  className={`${chipBase} w-9 shrink-0 ${chipIdle}`}
                >
                  %
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Satır 3: Giriş ve çıkış — New York saatiyle (yaz/kış saati geçişinde var olmayan saat uyarılır) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            {smartUpper("Giriş")}
          </label>
          <div className="h-9 flex items-center">
            <TurkishDateTimePicker value={tradeDate} onChange={setTradeDate} className="w-full" />
          </div>
        </div>
        <div className="min-w-0">
          <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            Çıkış
            <span className="text-[9px] text-zinc-500 normal-case tracking-normal font-medium">isteğe bağlı</span>
          </label>
          {exitDate ? (
            <div className="h-9 flex items-center gap-1.5">
              <TurkishDateTimePicker value={exitDate} onChange={setExitDate} className="w-full min-w-0" />
              <button
                type="button"
                onClick={() => setExitDate("")}
                aria-label="Çıkış saatini kaldır"
                title="Çıkış saatini kaldır"
                className="h-9 w-9 shrink-0 rounded-lg border border-zinc-700/70 bg-zinc-950/80 text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExitDate(tradeDate)}
              className="h-9 w-full rounded-lg border border-dashed border-zinc-700/70 text-[11px] font-semibold text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center gap-1.5 cursor-pointer transition-ui"
            >
              <Plus size={13} /> Çıkış Saati Ekle
            </button>
          )}
        </div>
      </div>
      <DstNote label="Giriş" value={tradeDate} />
      {exitDate && <DstNote label="Çıkış" value={exitDate} />}
    </div>
  );
});

/** NY'de saat ileri alındığı gece (mart) 02:00–02:59 hiç yaşanmaz: kullanıcıya hangi saate kaydedileceği söylenir */
function DstNote({ label, value }: { label: string; value: string }) {
  if (!value || isNyWallTimeValid(value)) return null;
  const ts = nyInputToTs(value);
  const fixed = ts !== null ? toNyInput(ts).slice(11, 16) : '—';
  return (
    <p className="-mt-1 text-[10px] text-blue-300/90 font-sans">
      {label}: {value.slice(11, 16)} yaz saati geçişinde yok (saat ileri alındı); {fixed} olarak kaydedilir.
    </p>
  );
}
