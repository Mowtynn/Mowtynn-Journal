import React from "react";
import { ShieldCheck, TrendingUp, Compass, MoveHorizontal, Waves, Timer, Crosshair, Layers } from "lucide-react";
import { ASIA_RANGE_TYPES, ASIA_RANGE_FORM_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg } from './shared';

/* Asia Range seçeneklerinin görünümü */
const ASIA_RANGE_META: Record<(typeof ASIA_RANGE_TYPES)[number], { icon: typeof Compass }> = {
  Range: { icon: MoveHorizontal },
  Trend: { icon: TrendingUp },
  Swept: { icon: Waves },
};

/* Kurulum kartındaki alan başlıkları ve tek seçimli düğme gruplarının ortak görünümü */
const LABEL = "text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans";
const SEGMENT = "w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 shadow-inner";
const segBtn = (on: boolean) =>
  `relative min-w-0 h-full flex items-center justify-center px-1.5 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border border-transparent cursor-pointer ${
    on ? "text-blue-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
  }`;
const SEG_ON = "bg-blue-500/20 border-blue-500/40 shadow-xs";

/* ================= 2. SÜTUN: KURULUM =================
 * Girdi sırası kurulumun okunuş sırasıdır: Setup Kalitesi · İşlem Tipi → Asia Range → POI Sweep Time · POI Timeframe →
 * Confirmations. Session formda yok: POI Sweep saatinden arka planda çıkarılır.
 */
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
  poiTimeframes,
  poiTimeframe,
  setPoiTimeframe,
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
  poiTimeframes: string[];
  poiTimeframe: string;
  setPoiTimeframe: SetState<string>;
  premiumDiscounts: string[];
  selectedConfirmations: string[];
  setSelectedConfirmations: SetState<string[]>;
}) {
  const { L, H } = titles;
  const tfOptions = withSelected(poiTimeframes, poiTimeframe ? [poiTimeframe] : []);
  const trendOptions = trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"];

  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm h-full">
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Crosshair size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("setupCard")}</span>
      </div>

      {/* 1. SETUP KALİTESİ · İŞLEM TİPİ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
        <div className="min-w-0">
          <label lang="en" className={LABEL}>
            <ShieldCheck size={13} className="text-blue-400" />
            {H("planFidelities", "SETUP KALİTESİ")}
          </label>
          <div className={`${SEGMENT} h-9 sm:h-10`}>
            {planFidelities.map((item) => {
              const on = planFidelity === item;
              return (
                <button lang="en" key={item} type="button" data-selected={on} onClick={() => setPlanFidelity(on ? null : item)} className={segBtn(on)}>
                  {on && <SlideBg id="planFidelitySlide" className={SEG_ON} />}
                  <span className="relative z-10 truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <label lang="en" className={LABEL}>
            <TrendingUp size={13} className="text-blue-400" />
            {H("trendTypes", "İŞLEM TİPİ")}
          </label>
          <div className={`${SEGMENT} h-9 sm:h-10`}>
            {trendOptions.map((tr) => {
              const on = selectedTrend === tr;
              return (
                <button lang="en" key={tr} type="button" data-selected={on} aria-label={tr} onClick={() => setSelectedTrend(on ? "" : tr)} className={`${segBtn(on)} text-label tracking-normal`}>
                  {on && <SlideBg id="trendSlide" className={SEG_ON} />}
                  <span className="relative z-10 truncate">{tr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. ASIA RANGE: Range · Trend ("Swept" yalnızca o değeri taşıyan eski bir kayıt düzenlenirken görünür) */}
      <div>
        <label lang="en" className={LABEL}>
          <Compass size={13} className="text-blue-400" />
          {L("asiaRange")}
        </label>
        <div role="radiogroup" className={`${SEGMENT} h-10 sm:h-11`}>
          {(asiaRange === "Swept" ? ASIA_RANGE_TYPES : ASIA_RANGE_FORM_TYPES).map((opt) => {
            const on = asiaRange === opt;
            const Icon = ASIA_RANGE_META[opt].icon;
            return (
              <button lang="en" key={opt} type="button" role="radio" aria-checked={on} data-selected={on} onClick={() => setAsiaRange(on ? "" : opt)} className={`${segBtn(on)} gap-1.5`}>
                {on && <SlideBg id="asiaRangeSlide" className={SEG_ON} />}
                <Icon size={13} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. POI SWEEP TIME (NY) · POI TIMEFRAME */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
        <div className="min-w-0">
          <span lang="en" className={LABEL}>
            <Timer size={13} className="text-blue-400 shrink-0" />
            {L("sweepTime")}
          </span>
          <SweepTimePicker value={sweepTime} onChange={setSweepTime} />
        </div>

        <div className="min-w-0">
          <span lang="en" className={LABEL}>
            <Layers size={13} className="text-blue-400 shrink-0" />
            {H("poiTimeframes", "POI TIMEFRAME")}
          </span>
          <div role="radiogroup" className={`${SEGMENT} h-9`}>
            {tfOptions.map((tf) => {
              const on = poiTimeframe === tf;
              return (
                <button lang="en" key={tf} type="button" role="radio" aria-checked={on} data-selected={on} onClick={() => setPoiTimeframe(on ? "" : tf)} className={segBtn(on)}>
                  {on && <SlideBg id="poiTimeframeSlide" className={SEG_ON} />}
                  <span className="relative z-10 truncate">{tf}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. CONFIRMATIONS (çoklu) */}
      <div>
        <span lang="en" className={LABEL}>
          <ShieldCheck size={13} className="text-blue-400 shrink-0" />
          {H("premiumDiscounts", "CONFIRMATIONS")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {withSelected(premiumDiscounts, selectedConfirmations).map((zone) => {
            const on = selectedConfirmations.includes(zone);
            return (
              <button lang="en"
                key={zone}
                type="button"
                data-selected={on}
                onClick={() => setSelectedConfirmations(on ? selectedConfirmations.filter((x) => x !== zone) : [...selectedConfirmations, zone])}
                className={`${CHIP_BASE} ${
                  on
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
  );
});
