import React from "react";
import { TrendingUp, Compass, MoveHorizontal, Waves, Timer, Crosshair, Layers, Scale, Globe, RotateCcw } from "lucide-react";
import { ASIA_RANGE_TYPES, ASIA_RANGE_FORM_TYPES } from "../../types";
import { SweepTimePicker } from "./SweepTimePicker";
import { CHIP_BASE, SetState, withSelected, Titles, SlideBg } from './shared';
import { FlowStep, FlowProgress, flowSteps } from '../setupFlow/SetupFlow';

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
 * Girdiler bir akış rayında dizilir: 1. Asia Range → 2. İşlem Tipi → 3. POI (sweep saati · session · timeframe) →
 * 4. Confirmations. Session her zaman görünür: POI Sweep saatinden otomatik seçilir, tıklanarak değiştirilebilir.
 */
export const SetupChips = React.memo(function SetupChips({
  titles,
  trendTypes,
  selectedTrend,
  setSelectedTrend,
  asiaRange,
  setAsiaRange,
  sweepTime,
  setSweepTime,
  session = "",
  sessionAuto = "",
  sessions = [],
  onSessionChange,
  poiTimeframes,
  poiTimeframe,
  setPoiTimeframe,
  premiumDiscounts,
  selectedConfirmations,
  setSelectedConfirmations,
  required = [],
  flagMissing = false,
  className = "",
}: {
  titles: Titles;
  trendTypes: string[];
  selectedTrend: string;
  setSelectedTrend: SetState<string>;
  asiaRange: string;
  setAsiaRange: SetState<string>;
  sweepTime: string;
  setSweepTime: SetState<string>;
  /** Geçerli session (otomatik ya da kullanıcının seçtiği) */
  session?: string;
  /** POI Sweep saatinden otomatik çıkan session */
  sessionAuto?: string;
  /** Seçilebilir session listesi */
  sessions?: string[];
  /** Session seçildiğinde; boş değer ya da otomatik olanın seçilmesi otomatiğe döndürür */
  onSessionChange?: (v: string) => void;
  poiTimeframes: string[];
  poiTimeframe: string;
  setPoiTimeframe: SetState<string>;
  premiumDiscounts: string[];
  selectedConfirmations: string[];
  setSelectedConfirmations: SetState<string[]>;
  /** Zorunlu alanlar (Tanımlamalar > Zorunlu Alanlar): başlıkta * ile işaretlenir */
  required?: readonly string[];
  /** Kaydetme denendi ve zorunlu alan eksik: boş zorunlu alanlar kırmızı görünür */
  flagMissing?: boolean;
  className?: string;
}) {
  const { L, H } = titles;
  const tfOptions = withSelected(poiTimeframes, poiTimeframe ? [poiTimeframe] : []);
  const trendOptions = trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"];
  const steps = flowSteps({ asiaRange, sweepTime, poiTimeframe, confirmations: selectedConfirmations, trend: selectedTrend });
  // Session seçenekleri: tanımlı liste + (eski kayıtta listede olmayan) mevcut değer
  const sessionOptions = withSelected(sessions, session ? [session] : []);
  const sessionManual = !!session && session !== sessionAuto;
  // Zorunlu alan işareti ve (kaydetme denendikten sonra) eksik vurgusu
  const isReq = (id: string) => required.includes(id);
  const miss = {
    asiaRange: flagMissing && isReq("asiaRange") && !asiaRange,
    trend: flagMissing && isReq("trend") && !selectedTrend,
    sweepTime: flagMissing && isReq("sweepTime") && !sweepTime,
    poiTimeframe: flagMissing && isReq("poiTimeframe") && !poiTimeframe,
    premiumDiscount: flagMissing && isReq("premiumDiscount") && selectedConfirmations.length === 0,
  };
  const lbl = (err: boolean) => (err ? LABEL.replace("text-zinc-300", "text-rose-300") : LABEL);
  const star = (id: string) =>
    isReq(id) ? <span aria-label="zorunlu" title="Zorunlu alan" className="-ml-0.5 text-rose-400/80">*</span> : null;
  // Session seçeneği çoksa (4+) saat seçicinin yanına sığmaz: alt alta tam genişlikte dizilir
  const stackPoi = sessionOptions.length > 3;

  return (
    <div className={`tf-card ${className} bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-4 shadow-sm`}>
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Crosshair size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("setupCard")}</span>
        <FlowProgress steps={steps} />
      </div>

      <div className="flex flex-col">
        {/* 1. ASIA RANGE: Range · Trend ("Swept" yalnızca o değeri taşıyan eski bir kayıt düzenlenirken görünür) */}
        <FlowStep n={1} done={steps[0]} error={miss.asiaRange}>
          <label lang="en" className={lbl(miss.asiaRange)}>
            <Compass size={13} className="text-blue-400" />
            {L("asiaRange")}
            {star("asiaRange")}
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

        {/* 2. İŞLEM TİPİ: Continuation · Reversal */}
        <FlowStep n={2} done={steps[1]} error={miss.trend}>
          <label lang="en" className={lbl(miss.trend)}>
            <TrendingUp size={13} className="text-blue-400" />
            {H("trendTypes", "İŞLEM TİPİ")}
            {star("trend")}
          </label>
          <div role="radiogroup" className={`${SEGMENT} h-10`}>
            {trendOptions.map((tr) => {
              const on = selectedTrend === tr;
              return (
                <button lang="en" key={tr} type="button" role="radio" aria-checked={on} data-selected={on} aria-label={tr} onClick={() => setSelectedTrend(on ? "" : tr)} className={segBtn(on)}>
                  {on && <SlideBg id="trendSlide" className={SEG_ON} />}
                  <span className="relative z-10 truncate">{tr}</span>
                </button>
              );
            })}
          </div>
        </FlowStep>

        {/* 3. POI: SWEEP TIME (NY) · SESSION, altında POI TIMEFRAME.
            Session her zaman görünür: sweep saatinden otomatik seçilir (küçük "OTO" işareti), tıklanarak değiştirilebilir. */}
        <FlowStep n={3} done={steps[2]} error={miss.sweepTime || miss.poiTimeframe}>
          <div className="flex flex-col gap-3.5">
            <div className={`grid grid-cols-1 ${stackPoi ? "" : "sm:grid-cols-2"} gap-x-4 gap-y-3.5`}>
              <div className="min-w-0">
                <span lang="en" className={lbl(miss.sweepTime)}>
                  <Timer size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">{L("sweepTime")}</span>
                  {star("sweepTime")}
                </span>
                <SweepTimePicker value={sweepTime} onChange={setSweepTime} />
              </div>

              <div className="min-w-0">
                <span lang="en" className={LABEL}>
                  <Globe size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">{H("sessions", "SESSION")}</span>
                  {sessionManual ? (
                    <button
                      type="button"
                      onClick={() => onSessionChange?.("")}
                      title={sessionAuto ? `Otomatiğe dön (${sessionAuto})` : "Seçimi kaldır"}
                      className="ml-auto inline-flex items-center gap-1 normal-case tracking-normal font-semibold text-amber-300/90 hover:text-amber-200 cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      {sessionAuto ? "Otomatiğe dön" : "Kaldır"}
                    </button>
                  ) : (
                    <span className="ml-auto normal-case tracking-normal font-semibold text-zinc-500 truncate">
                      {sessionAuto ? "Sweep saatinden" : "Saatten otomatik"}
                    </span>
                  )}
                </span>
                {sessionOptions.length === 0 ? (
                  <div className="h-10 flex items-center px-3 rounded-xl border border-dashed border-zinc-800 text-label text-zinc-500">
                    Tanımlamalar'dan session ekle
                  </div>
                ) : (
                <div role="radiogroup" aria-label="Session" className={`${SEGMENT} h-10`}>
                  {sessionOptions.map((opt) => {
                    const on = session === opt;
                    const auto = opt === sessionAuto;
                    return (
                      <button
                        lang="en"
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        data-selected={on}
                        title={auto ? "POI Sweep saatine göre otomatik" : undefined}
                        onClick={() => onSessionChange?.(on && sessionManual ? "" : opt)}
                        className={segBtn(on, sessionManual ? "text-amber-200" : "text-blue-300")}
                      >
                        {on && <SlideBg id="sessionSlide" className={sessionManual ? "bg-amber-500/15 border-amber-500/40 shadow-xs" : SEG_ON} />}
                        <span className="relative z-10 truncate">{opt}</span>
                        {auto && (
                          <span aria-hidden className={`relative z-10 ml-1 shrink-0 text-[9px] font-bold tracking-wider ${on ? "text-blue-300/80" : "text-zinc-500"}`}>OTO</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <span lang="en" className={lbl(miss.poiTimeframe)}>
                <Layers size={13} className="text-blue-400 shrink-0" />
                {H("poiTimeframes", "POI TIMEFRAME")}
                {star("poiTimeframe")}
              </span>
              <div role="radiogroup" className={`${SEGMENT} h-10`}>
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

        {/* 4. CONFIRMATIONS (çoklu) */}
        <FlowStep n={4} done={steps[3]} error={miss.premiumDiscount} last>
          <span lang="en" className={lbl(miss.premiumDiscount)}>
            <Scale size={13} className="text-blue-400 shrink-0" />
            {H("premiumDiscounts", "CONFIRMATIONS")}
            {star("premiumDiscount")}
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
      </div>
    </div>
  );
});
