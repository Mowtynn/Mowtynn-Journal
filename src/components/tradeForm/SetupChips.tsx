import React from "react";
import { ShieldCheck, TrendingUp, Compass, MoveHorizontal, Waves, Timer, Crosshair, Layers, Scale } from "lucide-react";
import { ASIA_RANGE_TYPES, ASIA_RANGE_FORM_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg } from './shared';
import { FlowStep, FlowProgress, flowSteps, qualityTone } from '../setupFlow/SetupFlow';

/* Asia Range seçeneklerinin görünümü */
const ASIA_RANGE_META: Record<(typeof ASIA_RANGE_TYPES)[number], { icon: typeof Compass }> = {
  Range: { icon: MoveHorizontal },
  Trend: { icon: TrendingUp },
  Swept: { icon: Waves },
};

/* Kurulum kartındaki alan başlıkları ve tek seçimli düğme gruplarının ortak görünümü */
const LABEL = "text-label font-bold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5 font-sans";
const SEGMENT = "w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 shadow-inner";
const segBtn = (on: boolean, onText = "text-blue-300") =>
  `relative min-w-0 h-full flex items-center justify-center px-1.5 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-ui duration-150 select-none border border-transparent cursor-pointer ${
    on ? onText : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
  }`;
const SEG_ON = "bg-blue-500/20 border-blue-500/40 shadow-xs";

/* ================= 2. SÜTUN: KURULUM AKIŞI =================
 * Girdiler kurulumun zaman sırasıyla bir akış rayında dizilir: 1. Asia Range → 2. POI (sweep saati · timeframe) →
 * 3. Confirmations → 4. Değerlendirme (işlem tipi · setup kalitesi). Session formda yok: POI Sweep saatinden arka planda
 * çıkarılır ve saatin yanında yalnızca bilgi olarak gösterilir.
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
  sessionHint,
  poiTimeframes,
  poiTimeframe,
  setPoiTimeframe,
  premiumDiscounts,
  selectedConfirmations,
  setSelectedConfirmations,
  className = "",
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
  /** POI Sweep saatinden otomatik çıkarılan session (yalnızca bilgi) */
  sessionHint?: string;
  poiTimeframes: string[];
  poiTimeframe: string;
  setPoiTimeframe: SetState<string>;
  premiumDiscounts: string[];
  selectedConfirmations: string[];
  setSelectedConfirmations: SetState<string[]>;
  className?: string;
}) {
  const { L, H } = titles;
  const tfOptions = withSelected(poiTimeframes, poiTimeframe ? [poiTimeframe] : []);
  const trendOptions = trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"];
  const steps = flowSteps({ asiaRange, sweepTime, poiTimeframe, confirmations: selectedConfirmations, trend: selectedTrend, planFidelity });
  const quality = qualityTone(planFidelity);

  return (
    <div className={`tf-card ${className} bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-4 shadow-sm`}>
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Crosshair size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("setupCard")}</span>
        <FlowProgress steps={steps} />
      </div>

      <div className="flex flex-col">
        {/* 1. ASIA RANGE: Range · Trend ("Swept" yalnızca o değeri taşıyan eski bir kayıt düzenlenirken görünür) */}
        <FlowStep n={1} done={steps[0]}>
          <label lang="en" className={LABEL}>
            <Compass size={13} className="text-blue-400" />
            {L("asiaRange")}
          </label>
          <div role="radiogroup" className={`${SEGMENT} h-10`}>
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
        </FlowStep>

        {/* 2. POI: SWEEP TIME (NY) · POI TIMEFRAME — session saatten otomatik çıkar, etiketin yanında görünür */}
        <FlowStep n={2} done={steps[1]}>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-3.5">
            <div className="min-w-0">
              <span lang="en" className={LABEL}>
                <Timer size={13} className="text-blue-400 shrink-0" />
                <span className="truncate">{L("sweepTime")}</span>
                {sessionHint && (
                  <span
                    title="Session: POI Sweep saatinden otomatik"
                    className="ml-auto shrink-0 px-1.5 py-px rounded-md border border-zinc-700/70 bg-zinc-800/70 text-zinc-300 normal-case tracking-normal font-semibold"
                  >
                    {sessionHint}
                  </span>
                )}
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
        </FlowStep>

        {/* 3. CONFIRMATIONS (çoklu) */}
        <FlowStep n={3} done={steps[2]}>
          <span lang="en" className={LABEL}>
            <Scale size={13} className="text-blue-400 shrink-0" />
            {H("premiumDiscounts", "CONFIRMATIONS")}
            {selectedConfirmations.length > 1 && (
              <span className="ml-auto text-zinc-500 normal-case tracking-normal font-semibold tabular-nums">{selectedConfirmations.length} seçili</span>
            )}
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
        </FlowStep>

        {/* 4. DEĞERLENDİRME: İŞLEM TİPİ · SETUP KALİTESİ (kalite seçimi kademesinin rengini alır: A+ yeşil · A mavi · B-C kırmızı) */}
        <FlowStep n={4} done={steps[3]} last>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-4 gap-y-3.5">
            <div className="min-w-0">
              <label lang="en" className={LABEL}>
                <TrendingUp size={13} className="text-blue-400" />
                {H("trendTypes", "İŞLEM TİPİ")}
              </label>
              <div className={`${SEGMENT} h-9`}>
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

            <div className="min-w-0">
              <label lang="en" className={LABEL}>
                <ShieldCheck size={13} className="text-blue-400" />
                {H("planFidelities", "SETUP KALİTESİ")}
              </label>
              <div className={`${SEGMENT} h-9`}>
                {planFidelities.map((item) => {
                  const on = planFidelity === item;
                  return (
                    <button lang="en" key={item} type="button" data-selected={on} onClick={() => setPlanFidelity(on ? null : item)} className={segBtn(on, quality.text)}>
                      {on && <SlideBg id="planFidelitySlide" className={quality.on} />}
                      <span className="relative z-10 truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FlowStep>
      </div>
    </div>
  );
});
