import React, { useMemo } from "react";
import { setupQualityTier } from "../../lib/setupQuality";
import { normalizeNewsDays } from "../../constants/constants";
import { Layers, ShieldCheck, Zap, TrendingUp, Clock, Flag, Newspaper, Compass, MoveHorizontal, Waves, Timer } from "lucide-react";
import { ASIA_RANGE_TYPES, ASIA_RANGE_FORM_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg } from './shared';

/* Asia Range seçeneklerinin görünümü */
const ASIA_RANGE_META: Record<(typeof ASIA_RANGE_TYPES)[number], { icon: typeof Compass; active: string }> = {
  Range: { icon: MoveHorizontal, active: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  Trend: { icon: TrendingUp, active: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  Swept: { icon: Waves, active: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
};

/* ================= 2. SÜTUN: KURULUM ÇİPLERİ ================= */
export const SetupChips = React.memo(function SetupChips({
  titles,
  newsDays,
  planFidelities,
  planFidelity,
  setPlanFidelity,
  trendTypes,
  selectedTrend,
  setSelectedTrend,
  newsDay,
  setNewsDay,
  newsDayError,
  setNewsDayError,
  asiaRange,
  setAsiaRange,
  sweepTime,
  setSweepTime,
  asiaRangeFvgs,
  selectedAsiaFvg,
  setSelectedAsiaFvg,
  sessions,
  selectedSession,
  setSelectedSession,
  entryModels,
  selectedEntries,
  setSelectedEntries,
  tpTargets,
  selectedTpTargets,
  setSelectedTpTargets,
  premiumDiscounts,
  premiumDiscount,
  setPremiumDiscount,
}: {
  titles: Titles;
  newsDays: string[];
  planFidelities: string[];
  planFidelity: string | null;
  setPlanFidelity: SetState<string | null>;
  trendTypes: string[];
  selectedTrend: string;
  setSelectedTrend: SetState<string>;
  newsDay: boolean | null;
  setNewsDay: SetState<boolean | null>;
  newsDayError: boolean;
  setNewsDayError: SetState<boolean>;
  asiaRange: string;
  setAsiaRange: SetState<string>;
  sweepTime: string;
  setSweepTime: SetState<string>;
  asiaRangeFvgs: string[];
  selectedAsiaFvg: string;
  setSelectedAsiaFvg: SetState<string>;
  sessions: string[];
  selectedSession: string;
  setSelectedSession: SetState<string>;
  entryModels: string[];
  selectedEntries: string[];
  setSelectedEntries: SetState<string[]>;
  tpTargets: string[];
  selectedTpTargets: string[];
  setSelectedTpTargets: SetState<string[]>;
  premiumDiscounts: string[];
  premiumDiscount: string;
  setPremiumDiscount: SetState<string>;
}) {
  const { L, H } = titles;
  const [newsYesLabel, newsNoLabel] = useMemo(() => normalizeNewsDays(newsDays), [newsDays]);

  // Üst bölümler (Setup Kalitesi, News Day, Asia Range) sıkı durur. Kart komşularından kısa kalırsa artan boşluk
  // yalnızca alttaki kurulum ızgarasının satırları arasına dağılır (Target altında tek büyük boşluk kalmaz)
  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm h-full">
      
      {/* 1-2. SETUP KALİTESİ + TREND YAPISI (yan yana) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {/* 1. SETUP KALİTESİ */}
        <div>
          <label lang="en" className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={13} className="text-blue-400" />
            {H("planFidelities", "SETUP KALİTESİ")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner">
            {planFidelities.map((item) => {
              const isSelected = planFidelity === item;
              const tier = setupQualityTier(item);
              const activeStyle = tier === "high" ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs"
                : tier === "low" ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs"
                : "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs";
              return (
                <button lang="en"
                  key={item}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setPlanFidelity(isSelected ? null : item)}
                  className={`min-w-0 h-full flex items-center justify-center px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border cursor-pointer ${
                    isSelected ? activeStyle : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. TREND YAPISI */}
        <div>
          <label lang="en" className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            <TrendingUp size={13} className="text-blue-400" />
            {H("trendTypes", "TREND")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 h-9 sm:h-10 shadow-inner">
            {(trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"]).map((tr, idx) => {
              const isSelected = selectedTrend === tr;
              const lower = tr.toLowerCase();
              const isContinuation = lower.includes("continuation") || lower.includes("devam") || lower.includes("trend");
              const isReversal = lower.includes("reversal") || lower.includes("dönüş") || lower.includes("ters");

              const activeStyle = (isReversal || (!isContinuation && idx === 1))
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs"
                : "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs";

              return (
                <button lang="en"
                  key={tr}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setSelectedTrend(isSelected ? "" : tr)}
                  aria-label={tr}
                  className={`min-w-0 h-full flex items-center justify-center px-1 rounded-lg text-[11px] font-sans font-bold tracking-normal uppercase transition-ui duration-150 select-none border cursor-pointer ${
                    isSelected
                      ? activeStyle
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="truncate">{tr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2b. NEWS DAY / BANK HOLIDAY (zorunlu) + sağında ASIA RANGE FVG — ikisi de butonlu seçim */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div id="news-day-field">
          <label lang="en" className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans ${newsDayError ? "text-rose-400" : "text-zinc-300"}`}>
            <Newspaper size={13} className="text-blue-400" />
            {H("newsDays", "NEWS DAY/BANK HOLIDAY")}
          </label>
          <div className={`w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner ${newsDayError ? "border-rose-500/60" : "border-zinc-800/90"}`}>
            {([
              { value: true, label: newsYesLabel, active: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
              { value: false, label: newsNoLabel, active: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
            ] as const).map((opt) => {
              const isSelected = newsDay === opt.value;
              return (
                <button lang="en"
                  key={String(opt.value)}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => {
                    setNewsDay(opt.value);
                    setNewsDayError(false);
                  }}
                  className={`min-w-0 h-full flex items-center justify-center px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border cursor-pointer ${
                    isSelected
                      ? `${opt.active} font-bold shadow-xs`
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label lang="en" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans text-zinc-300">
            <Layers size={13} className="text-blue-400" />
            {L("asiaRangeFvgs")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner">
            {withSelected(asiaRangeFvgs, selectedAsiaFvg ? [selectedAsiaFvg] : []).map((fv) => {
              const isSelected = fv === selectedAsiaFvg;
              return (
                <button lang="en"
                  key={fv}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setSelectedAsiaFvg(isSelected ? "" : fv)}
                  className={`min-w-0 h-full flex items-center justify-center px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border cursor-pointer ${
                    isSelected
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs"
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="truncate">{fv}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ASIA RANGE: Range · Trend (geniş, rahat butonlar) */}
      <div>
        <label lang="en" className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
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
                className={`min-w-0 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border cursor-pointer ${
                  isSelected
                    ? `${meta.active} shadow-xs`
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KURULUM SIRASI: POI Sweep Time · Session · Entry Model · Confirmations · Target (tam genişlik) */}
      <div className="flex-1 grid grid-cols-2 content-between gap-x-4 gap-y-4 pt-1 border-t border-zinc-800/60">
        {/* SWEEP TIME (NY) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Timer size={12} className="text-blue-400 shrink-0" />
            {L("sweepTime")}
          </span>
          <SweepTimePicker value={sweepTime} onChange={setSweepTime} />
        </div>

        {/* SESSION */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Clock size={12} className="text-blue-400 shrink-0" />
            {H("sessions", "SESSION")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sessions.map((sess, idx) => (
              <button lang="en"
                key={idx}
                type="button"
                data-selected={sess === selectedSession}
                onClick={() => setSelectedSession(sess === selectedSession ? "" : sess)}
                className={`${CHIP_BASE} ${
                  sess === selectedSession
                    ? "text-blue-300 border-transparent"
                    : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {sess === selectedSession && <SlideBg id="sessionSlide" rounded="rounded-xl" className="bg-blue-500/20 border-blue-500/60 shadow-xs" />}
                <span className="relative z-10">{sess}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ENTRY MODEL (çoklu) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Zap size={12} className="text-blue-400 shrink-0" />
            {H("entryModels", "ENTRY MODEL")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {entryModels.map((em, idx) => {
              const isActive = selectedEntries.includes(em);
              return (
                <button lang="en"
                  key={idx}
                  type="button"
                  data-selected={isActive}
                  onClick={() =>
                    setSelectedEntries(
                      isActive
                        ? selectedEntries.filter((x) => x !== em)
                        : [...selectedEntries, em]
                    )
                  }
                  className={`px-3 py-1.5 text-[11px] rounded-xl transition-ui font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {em}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONFIRMATIONS (eski adı Premium / Discount) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={12} className="text-blue-400 shrink-0" />
            {H("premiumDiscounts", "CONFIRMATIONS")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {withSelected(premiumDiscounts, premiumDiscount ? [premiumDiscount] : []).map((zone) => {
              const isSelected = premiumDiscount === zone;
              return (
                <button lang="en"
                  key={zone}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setPremiumDiscount(isSelected ? "" : zone)}
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


        {/* TARGET — çıkış hedefi (çoklu). En altta tam genişlik: seçenekler yan yana uzar, sıkışmaz */}
        <div className="col-span-2 flex flex-col pt-3 border-t border-zinc-800/60">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Flag size={12} className="text-blue-400 shrink-0" />
            {H("tpTargets", "TARGET")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {withSelected(tpTargets, selectedTpTargets).map((tp) => {
              const isActive = selectedTpTargets.includes(tp);
              return (
                <button lang="en"
                  key={tp}
                  type="button"
                  data-selected={isActive}
                  onClick={() =>
                    setSelectedTpTargets(
                      isActive
                        ? selectedTpTargets.filter((x) => x !== tp)
                        : [...selectedTpTargets, tp]
                    )
                  }
                  className={`px-3 py-1.5 text-[11px] rounded-xl transition-ui font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {tp}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
});
