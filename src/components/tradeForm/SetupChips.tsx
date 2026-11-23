import React from "react";
import { ShieldCheck, TrendingUp, Clock, Compass, MoveHorizontal, Waves, Timer } from "lucide-react";
import { ASIA_RANGE_TYPES, ASIA_RANGE_FORM_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg } from './shared';

/* Asia Range seçeneklerinin görünümü */
const ASIA_RANGE_META: Record<(typeof ASIA_RANGE_TYPES)[number], { icon: typeof Compass }> = {
  Range: { icon: MoveHorizontal },
  Trend: { icon: TrendingUp },
  Swept: { icon: Waves },
};

/* ================= 2. SÜTUN: KURULUM ÇİPLERİ ================= */


export const SetupChips = React.memo(function SetupChips({
  titles,
  planFidelities,
  planFidelity,
  setPlanFidelity,
  trendTypes,
  selectedTrend,
  setSelectedTrend,
  asiaRange,
  setAsiaRange,
  sweepTime,
  setSweepTime,
  session,
  premiumDiscounts,
  selectedConfirmations,
  setSelectedConfirmations,
}: {
  titles: Titles;
  planFidelities: string[];
  planFidelity: string | null;
  setPlanFidelity: SetState<string | null>;
  trendTypes: string[];
  selectedTrend: string;
  setSelectedTrend: SetState<string>;
  asiaRange: string;
  setAsiaRange: SetState<string>;
  sweepTime: string;
  setSweepTime: SetState<string>;
  /** POI Sweep saatinden otomatik çıkan session (salt okunur) */
  session: string;
  premiumDiscounts: string[];
  selectedConfirmations: string[];
  setSelectedConfirmations: SetState<string[]>;
}) {
  const { L, H } = titles;

  // Bölümler doğal aralıklarıyla sıkı durur (boşluk dağıtılmaz); form boyunu bu kart belirleyecek şekilde
  // sol sütun (Temel Bilgiler + Sonuç) kısa tutulur, yan kartlar bu boya uyar
  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm h-full">
      
      {/* 1-2. SETUP KALİTESİ + İŞLEM TİPİ (yan yana) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {/* 1. SETUP KALİTESİ */}
        <div>
          <label lang="en" className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={13} className="text-blue-400" />
            {H("planFidelities", "SETUP KALİTESİ")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner">
            {planFidelities.map((item) => {
              const isSelected = planFidelity === item;
              return (
                <button lang="en"
                  key={item}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setPlanFidelity(isSelected ? null : item)}
                  className={`relative min-w-0 h-full flex items-center justify-center px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border border-transparent cursor-pointer ${
                    isSelected ? "text-blue-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {isSelected && <SlideBg id="planFidelitySlide" className="bg-blue-500/20 border-blue-500/40 shadow-xs" />}
                  <span className="relative z-10 truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. İŞLEM TİPİ */}
        <div>
          <label lang="en" className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            <TrendingUp size={13} className="text-blue-400" />
            {H("trendTypes", "TREND")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 h-9 sm:h-10 shadow-inner">
            {(trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"]).map((tr) => {
              const isSelected = selectedTrend === tr;

              return (
                <button lang="en"
                  key={tr}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setSelectedTrend(isSelected ? "" : tr)}
                  aria-label={tr}
                  className={`relative min-w-0 h-full flex items-center justify-center px-1 rounded-lg text-label font-sans font-bold tracking-normal uppercase transition-ui duration-150 select-none border border-transparent cursor-pointer ${
                    isSelected ? "text-blue-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {isSelected && <SlideBg id="trendSlide" className="bg-blue-500/20 border-blue-500/40 shadow-xs" />}
                  <span className="relative z-10 truncate">{tr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ASIA RANGE: Range · Trend (geniş, rahat butonlar) */}
      <div>
        <label lang="en" className="text-label sm:text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
          <Compass size={13} className="text-blue-400" />
          {L("asiaRange")}
        </label>
        {/* "Swept" yalnızca eski bir kayıt düzenlenirken ve o kayıtta seçiliyse görünür */}
        <div role="radiogroup" className={`w-full grid ${asiaRange === "Swept" ? "grid-cols-3" : "grid-cols-2"} bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-10 sm:h-11 shadow-inner`}>
          {(asiaRange === "Swept" ? ASIA_RANGE_TYPES : ASIA_RANGE_FORM_TYPES).map((opt) => {
            const isSelected = asiaRange === opt;
            const meta = ASIA_RANGE_META[opt];
            const Icon = meta.icon;
            return (
              <button lang="en"
                key={opt}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-selected={isSelected}
                onClick={() => setAsiaRange(isSelected ? "" : opt)}
                className={`relative min-w-0 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border border-transparent cursor-pointer ${
                  isSelected ? "text-blue-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                {isSelected && <SlideBg id="asiaRangeSlide" className="bg-blue-500/20 border-blue-500/40 shadow-xs" />}
                <Icon size={13} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KURULUM SIRASI: POI Sweep Time · Session (otomatik) · Confirmations (tam genişlik) */}
      <div className="grid grid-cols-2 content-start gap-x-4 gap-y-3 pt-1 border-t border-zinc-800/60">
        {/* SWEEP TIME (NY) */}
        <div className="flex flex-col">
          <span lang="en" className="text-label font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Timer size={12} className="text-blue-400 shrink-0" />
            {L("sweepTime")}
          </span>
          <SweepTimePicker value={sweepTime} onChange={setSweepTime} />
        </div>

        {/* SESSION: girilmez, POI Sweep saatinden gelir */}
        <div className="flex flex-col">
          <span lang="en" className="text-label font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Clock size={12} className="text-blue-400 shrink-0" />
            {H("sessions", "SESSION")}
            <span className="normal-case font-medium tracking-normal text-zinc-500">· otomatik</span>
          </span>
          <div
            aria-live="polite"
            title="POI Sweep saatinden otomatik belirlenir"
            className={`h-9 flex items-center px-3 rounded-xl border text-xs font-sans font-bold tracking-wide uppercase select-none ${
              session ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-zinc-950/80 border-zinc-800 text-zinc-500"
            }`}
          >
            <span className="truncate">{session || (sweepTime ? "Session dışı" : "Sweep saatini seç")}</span>
          </div>
        </div>

        {/* CONFIRMATIONS (çoklu) — tam genişlik */}
        <div className="col-span-2 flex flex-col">
          <span lang="en" className="text-label font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={12} className="text-blue-400 shrink-0" />
            {H("premiumDiscounts", "CONFIRMATIONS")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {withSelected(premiumDiscounts, selectedConfirmations).map((zone) => {
              const isSelected = selectedConfirmations.includes(zone);
              return (
                <button lang="en"
                  key={zone}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setSelectedConfirmations(isSelected ? selectedConfirmations.filter((x) => x !== zone) : [...selectedConfirmations, zone])}
                  className={`${CHIP_BASE} ${
                    isSelected
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {zone}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
});
