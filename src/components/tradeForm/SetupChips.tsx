import React, { useMemo } from "react";
import { setupQualityTier } from "../../lib/discipline";
import { normalizeNewsDays } from "../../constants/constants";
import { Layers, ShieldCheck, Zap, TrendingUp, Clock, Maximize2, Target, Flag, Newspaper, Compass, MoveHorizontal, Waves, Timer } from "lucide-react";
import { ASIA_RANGE_TYPES, MANAGEMENT_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg, afterExitTpAsked } from './shared';

/* Asia Range seçeneklerinin görünümü */
const ASIA_RANGE_META: Record<(typeof ASIA_RANGE_TYPES)[number], { icon: typeof Compass; active: string }> = {
  Range: { icon: MoveHorizontal, active: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  Trend: { icon: TrendingUp, active: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  Swept: { icon: Waves, active: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
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
  management,
  setManagement,
  afterExitTp,
  setAfterExitTp,
  tradeStatus,
  asiaRangeFvgs,
  selectedAsiaFvg,
  setSelectedAsiaFvg,
  sessions,
  selectedSession,
  setSelectedSession,
  htfTimeframes,
  selectedHtfTimeframe,
  setSelectedHtfTimeframe,
  timeframes,
  selectedTimeframe,
  setSelectedTimeframe,
  confirmations,
  selectedConfirmations,
  setSelectedConfirmations,
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
  management: string[];
  setManagement: SetState<string[]>;
  afterExitTp: boolean | null;
  setAfterExitTp: SetState<boolean | null>;
  tradeStatus: string;
  asiaRangeFvgs: string[];
  selectedAsiaFvg: string;
  setSelectedAsiaFvg: SetState<string>;
  sessions: string[];
  selectedSession: string;
  setSelectedSession: SetState<string>;
  htfTimeframes: string[];
  selectedHtfTimeframe: string;
  setSelectedHtfTimeframe: SetState<string>;
  timeframes: string[];
  selectedTimeframe: string;
  setSelectedTimeframe: SetState<string>;
  confirmations: string[];
  selectedConfirmations: string[];
  setSelectedConfirmations: SetState<string[]>;
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

  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm h-full">
      
      {/* 1-2. SETUP KALİTESİ + TREND YAPISI (yan yana) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {/* 1. SETUP KALİTESİ */}
        <div>
          <label lang="en" className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={13} className="text-sky-400" />
            {H("planFidelities", "SETUP KALİTESİ")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner">
            {planFidelities.map((item) => {
              const isSelected = planFidelity === item;
              const tier = setupQualityTier(item);
              const activeStyle = tier === "high" ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs"
                : tier === "low" ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs"
                : "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs";
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
            <TrendingUp size={13} className="text-sky-400" />
            {H("trendTypes", "TREND")}
          </label>
          <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 h-9 sm:h-10 shadow-inner">
            {(trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"]).map((tr, idx) => {
              const isSelected = selectedTrend === tr;
              const lower = tr.toLowerCase();
              const isContinuation = lower.includes("continuation") || lower.includes("devam") || lower.includes("trend");
              const isReversal = lower.includes("reversal") || lower.includes("dönüş") || lower.includes("ters");

              const activeStyle = (isReversal || (!isContinuation && idx === 1))
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs"
                : "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs";

              return (
                <button lang="en"
                  key={tr}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setSelectedTrend(isSelected ? "" : tr)}
                  title={tr}
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
            <Newspaper size={13} className="text-sky-400" />
            {H("newsDays", "NEWS DAY/BANK HOLIDAY")}
          </label>
          <div className={`w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border rounded-xl p-1 gap-1.5 h-9 sm:h-10 shadow-inner ${newsDayError ? "border-rose-500/60" : "border-zinc-800/90"}`}>
            {([
              { value: true, label: newsYesLabel, active: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
              { value: false, label: newsNoLabel, active: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
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
            <Layers size={13} className="text-sky-400" />
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
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-xs"
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

      {/* ASIA RANGE: Range · Trend · Swept (geniş, rahat butonlar) */}
      <div>
        <label lang="en" className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans">
          <Compass size={13} className="text-sky-400" />
          {L("asiaRange")}
        </label>
        <div role="radiogroup" className="w-full grid grid-cols-3 bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1.5 h-10 sm:h-11 shadow-inner">
          {ASIA_RANGE_TYPES.map((opt) => {
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

      {/* KURULUM SIRASI: Sweep Time · Session · Timeframe · PD Array · Entry Timeframe · Entry Model · Target · Confirmations */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-1 border-t border-zinc-800/60">
        {/* SWEEP TIME (NY) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Timer size={12} className="text-sky-400 shrink-0" />
            {L("sweepTime")}
          </span>
          <SweepTimePicker value={sweepTime} onChange={setSweepTime} />
        </div>

        {/* SESSION */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Clock size={12} className="text-sky-400 shrink-0" />
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
                    ? "text-sky-300 border-transparent"
                    : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {sess === selectedSession && <SlideBg id="sessionSlide" rounded="rounded-xl" className="bg-sky-500/20 border-sky-500/60 shadow-xs" />}
                <span className="relative z-10">{sess}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TIMEFRAME (HTF) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Maximize2 size={12} className="text-sky-400 shrink-0" />
            {H("htfTimeframes", "TIMEFRAME")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {htfTimeframes.map((tf, idx) => (
              <button lang="en"
                key={idx}
                type="button"
                data-selected={tf === selectedHtfTimeframe}
                onClick={() => setSelectedHtfTimeframe(tf === selectedHtfTimeframe ? "" : tf)}
                className={`${CHIP_BASE} ${
                  tf === selectedHtfTimeframe
                    ? "text-sky-300 border-transparent"
                    : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {tf === selectedHtfTimeframe && <SlideBg id="htfSlide" rounded="rounded-xl" className="bg-sky-500/20 border-sky-500/60 shadow-xs" />}
                <span className="relative z-10">{tf}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PD ARRAY */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Layers size={12} className="text-sky-400 shrink-0" />
            {H("confirmations", "PD ARRAY")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {confirmations.map((c, idx) => {
              const isActive = selectedConfirmations.includes(c);
              return (
                <button lang="en"
                  key={idx}
                  type="button"
                  data-selected={isActive}
                  onClick={() =>
                    setSelectedConfirmations(
                      isActive
                        ? selectedConfirmations.filter((x) => x !== c)
                        : [...selectedConfirmations, c]
                    )
                  }
                  className={`px-3 py-1.5 text-[11px] rounded-xl transition-ui font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* ENTRY TIMEFRAME */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Target size={12} className="text-sky-400 shrink-0" />
            {H("timeframes", "ENTRY TIMEFRAME")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {timeframes.map((tf, idx) => (
              <button lang="en"
                key={idx}
                type="button"
                data-selected={tf === selectedTimeframe}
                onClick={() => setSelectedTimeframe(tf === selectedTimeframe ? "" : tf)}
                className={`${CHIP_BASE} ${
                  tf === selectedTimeframe
                    ? "text-sky-300 border-transparent"
                    : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {tf === selectedTimeframe && <SlideBg id="ltfSlide" rounded="rounded-xl" className="bg-sky-500/20 border-sky-500/60 shadow-xs" />}
                <span className="relative z-10">{tf}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ENTRY MODEL (çoklu) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Zap size={12} className="text-sky-400 shrink-0" />
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
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {em}
                </button>
              );
            })}
          </div>
        </div>

        {/* TARGET — çıkış hedefi (çoklu) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <Flag size={12} className="text-sky-400 shrink-0" />
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
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-xs"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  {tp}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONFIRMATIONS (eski adı Premium / Discount) */}
        <div className="flex flex-col">
          <span lang="en" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
            <ShieldCheck size={12} className="text-sky-400 shrink-0" />
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
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-xs"
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

      {/* İŞLEM YÖNETİMİ (çoklu) + çıkış sonrası TP sorusu aynı satırda: soru açılınca kart uzamaz */}
      <div className="pt-3 border-t border-zinc-800/60 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1 h-6">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5 font-sans">
            <Zap size={12} className="text-sky-400 shrink-0" />
            {L("management")}
          </span>
          {afterExitTpAsked(tradeStatus, management) && (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide font-sans truncate" title="Çıkıştan sonra fiyat TP'ye ulaştı mı?">
                Sonra TP'ye Gitti mi?
              </span>
              <span className="flex items-center bg-zinc-950/80 border border-zinc-800/90 rounded-lg p-0.5 gap-0.5 shrink-0">
                {([true, false] as const).map((v) => {
                  const isSelected = afterExitTp === v;
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => setAfterExitTp(isSelected ? null : v)}
                      className={`h-5 px-2 rounded-md text-[10px] font-sans font-bold uppercase transition-ui select-none border cursor-pointer ${
                        isSelected
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                          : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                      }`}
                    >
                      {v ? "Evet" : "Hayır"}
                    </button>
                  );
                })}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MANAGEMENT_TYPES.map((m) => {
            const isActive = management.includes(m);
            return (
              <button
                key={m}
                type="button"
                data-selected={isActive}
                onClick={() => {
                  if (isActive) setManagement(management.filter((x) => x !== m));
                  // "Plana Göre" tek başına; diğerleri seçilince kalkar
                  else if (m === "Plana Göre") setManagement([m]);
                  else setManagement([...management.filter((x) => x !== "Plana Göre"), m]);
                }}
                className={`${CHIP_BASE} ${
                  isActive
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-xs"
                    : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
});
