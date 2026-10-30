import React from "react";
import { Activity } from "lucide-react";
import { Num, Status, SetState, parsePip, Titles, SlideBg } from './shared';

const RESULT_TONE: Record<Status, { box: string; field: string; text: string; sign: string }> = {
  WIN: { box: "border-emerald-500/25 bg-emerald-500/[0.06]", field: "focus-within:border-emerald-500/70", text: "text-emerald-300", sign: "+" },
  LOSS: { box: "border-rose-500/25 bg-rose-500/[0.06]", field: "focus-within:border-rose-500/70", text: "text-rose-300", sign: "−" },
  BREAKEVEN: { box: "border-blue-500/25 bg-blue-500/[0.06]", field: "focus-within:border-blue-500/70", text: "text-blue-300", sign: "" },
};

/* ================= 2. KART: SONUÇ (durum, pipler, R) ================= */
export const ResultCard = React.memo(function ResultCard({
  titles,
  isQuick,
  tradeStatus,
  setTradeStatus,
  rrValue,
  setRrValue,
  stopPips,
  setStopPips,
  tpPips,
  setTpPips,
  maePips,
  setMaePips,
  mfePips,
  setMfePips,
  asiaRangePips,
  setAsiaRangePips,
}: {
  titles: Titles;
  isQuick: boolean;
  tradeStatus: Status;
  setTradeStatus: SetState<Status>;
  rrValue: Num;
  setRrValue: SetState<Num>;
  stopPips: Num;
  setStopPips: SetState<Num>;
  tpPips: Num;
  setTpPips: SetState<Num>;
  maePips: Num;
  setMaePips: SetState<Num>;
  mfePips: Num;
  setMfePips: SetState<Num>;
  asiaRangePips: Num;
  setAsiaRangePips: SetState<Num>;
}) {
  const { L } = titles;
  // Stop ve TP Pip girilince WIN işlemde R önerilir (TP ÷ Stop)
  const handleStopPipsChange = (val: string) => {
    const num = parsePip(val);
    setStopPips(num);
    if (typeof num === "number" && num > 0 && typeof tpPips === "number" && tradeStatus === "WIN") {
      setRrValue(parseFloat((tpPips / num).toFixed(2)));
    }
  };
  const handleTpPipsChange = (val: string) => {
    const num = parsePip(val);
    setTpPips(num);
    if (typeof num === "number" && typeof stopPips === "number" && stopPips > 0 && tradeStatus === "WIN") {
      setRrValue(parseFloat((num / stopPips).toFixed(2)));
    }
  };
  const handleAsiaRangePipsChange = (val: string) => setAsiaRangePips(parsePip(val));
  const handleMaePipsChange = (val: string) => setMaePips(parsePip(val));
  const handleMfePipsChange = (val: string) => setMfePips(parsePip(val));

  return (
    <div className="tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Activity size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("financialCard")}</span>
      </div>

      {/* DURUM: WIN / LOSS / BREAKEVEN */}
      <div>
        <label className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-2 block font-sans">{L("tradeStatus")}</label>
        <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-1 h-9 sm:h-10 w-full bg-zinc-950/80 border border-zinc-700/70 rounded-xl p-1 shadow-inner">
          {(["WIN", "LOSS", "BREAKEVEN"] as const).map((sVal) => {
            const colors: Record<string, string> = {
              WIN: "text-win font-bold",
              LOSS: "text-loss font-bold",
              BREAKEVEN: "text-brand font-bold",
            };
            const bgColors: Record<string, string> = {
              WIN: "bg-win-bg border-win-border shadow-xs",
              LOSS: "bg-loss-bg border-loss-border shadow-xs",
              BREAKEVEN: "bg-brand/10 border-brand/20 shadow-xs",
            };
            return (
              <button lang="en"
                key={sVal}
                type="button"
                data-selected={tradeStatus === sVal}
                onClick={() => {
                  setTradeStatus(sVal);
                  if (sVal === "BREAKEVEN") {
                    setRrValue(0);
                  } else if (sVal === "LOSS") {
                    setRrValue(1);
                  } else if (sVal === "WIN") {
                    if (stopPips !== "" && tpPips !== "" && typeof stopPips === 'number' && typeof tpPips === 'number' && stopPips > 0) {
                      setRrValue(parseFloat((tpPips / stopPips).toFixed(2)));
                    } else if (rrValue === 0 || rrValue === 1) {
                      setRrValue("");
                    }
                  }
                }}
                className={`relative h-full min-w-0 px-1 text-[11px] tracking-wide whitespace-nowrap font-bold font-sans rounded-lg border border-transparent uppercase transition-ui cursor-pointer ${
                  tradeStatus === sVal
                    ? colors[sVal]
                    : "bg-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tradeStatus === sVal && <SlideBg id="tradeStatusSlide" className={bgColors[sVal]} />}
                <span className="relative z-10">{sVal}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PİP HESAPLAYICI & DEĞERLERİ — hızlı kayıtta yalnızca stop/TP (plan R:R ve önerilen R için) */}
      <div className="bg-zinc-950/40 p-2 sm:p-2.5 rounded-xl border border-zinc-800/70 space-y-2">
        {/* 1. SATIR: STOP & TP */}
        <div className="grid grid-cols-2 gap-2">
          {/* STOP PİP */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-rose-400 uppercase tracking-wide font-sans flex items-center gap-1 mb-2 min-w-0 whitespace-nowrap">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span className="truncate" title={L("stopPips")}>{L("stopPips")}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="örn: 10"
              value={stopPips}
              onChange={(e) => handleStopPipsChange(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
            />
          </div>

          {/* TP PİP */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wide font-sans flex items-center gap-1 mb-2 min-w-0 whitespace-nowrap">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="truncate" title={L("tpPips")}>{L("tpPips")}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="örn: 30"
              value={tpPips}
              onChange={(e) => handleTpPipsChange(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
            />
          </div>
        </div>

        {/* 2. SATIR: MAE · MFE · ASIA RANGE (tek satır) */}
        <div className={`grid grid-cols-[1fr_1fr_1.4fr] gap-2 items-end pt-1.5 border-t border-zinc-800/60 ${isQuick ? "hidden" : ""}`}>
          {/* MAE PİP */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-orange-400 uppercase tracking-wide font-sans flex items-center gap-1 mb-2 min-w-0 whitespace-nowrap" title="Maximum Adverse Excursion - Aleyhe maksimum sapma">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              <span className="truncate">{L("maePips")}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="örn: 4.5"
              value={maePips}
              onChange={(e) => handleMaePipsChange(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
            />
          </div>

          {/* MFE PİP */}
          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wide font-sans flex items-center gap-1 mb-2 min-w-0 whitespace-nowrap" title="Maximum Favorable Excursion - Lehe maksimum potansiyel">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span className="truncate">{L("mfePips")}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="örn: 28"
              value={mfePips}
              onChange={(e) => handleMfePipsChange(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
            />
          </div>
          {/* ASIA RANGE PİP */}
          <div>
          <label className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wide font-sans flex items-center gap-1 mb-2 min-w-0 whitespace-nowrap">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="truncate" title={L("asiaRangePips")}>{L("asiaRangePips")}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="örn: 18.5"
              value={asiaRangePips}
              onChange={(e) => handleAsiaRangePipsChange(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
            />
          </div>
        </div>
      </div>

      {/* SONUÇ (R) — kartın asıl çıktısı: duruma göre renklenen, büyük yazılı alan. BE her zaman 0R. */}
      {(() => {
        const t = RESULT_TONE[tradeStatus];
        const plan = typeof stopPips === "number" && stopPips > 0 && typeof tpPips === "number" && tpPips > 0 ? tpPips / stopPips : null;
        const [hint, hintTitle] =
          tradeStatus === "BREAKEVEN"
            ? ["Her zaman 0R", "Breakeven işlem her zaman 0R kaydedilir."]
            : tradeStatus === "LOSS"
              ? ["Pozitif yaz", "Kaybı pozitif sayı olarak yaz; eksi işareti durumdan gelir."]
              : plan !== null
                ? [`Plan 1:${plan.toFixed(2)}`, "Stop ve TP Piplerinden hesaplanan plan R:R"]
                : ["Kazanç, R olarak", "Kazancı R cinsinden yaz."];
        return (
          <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-ui ${t.box}`}>
            <div className="min-w-0 flex-1">
              <label htmlFor="tf-result-r" className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide block font-sans ${t.text}`}>
                {L("rr")}
              </label>
              <p className="text-[10px] text-zinc-400 font-sans leading-snug mt-0.5 truncate" title={hintTitle}>{hint}</p>
            </div>
            {/* İşaret, değer ve "R" tek bir okunuş olarak ortada durur (+2.5R); kutunun her yerine tıklamak alana odaklar */}
            <label
              htmlFor="tf-result-r"
              className={`h-9 w-[6.5rem] shrink-0 flex items-center justify-center gap-0.5 px-2 rounded-lg bg-zinc-950/80 border border-zinc-700/60 shadow-inner transition-ui cursor-text text-[15px] font-semibold tabular-nums font-sans leading-none ${t.field} ${t.text} ${tradeStatus === "BREAKEVEN" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span aria-hidden>{t.sign}</span>
              <input
                id="tf-result-r"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder={tradeStatus === "LOSS" ? "1" : "2.5"}
                value={tradeStatus === "BREAKEVEN" ? 0 : rrValue}
                disabled={tradeStatus === "BREAKEVEN"}
                onChange={(e) => {
                  const val = e.target.value;
                  const n = val !== "" ? Math.abs(Number(val)) : "";
                  setRrValue(n);
                  // 0R yazılırsa BE (eskiden ayrı bir efekt ve ek çizimle yapılıyordu)
                  if (n === 0) setTradeStatus("BREAKEVEN");
                }}
                // Genişlik içeriğe göre: değer ile "R" arasında boşluk kalmaz
                style={{ width: `${Math.min(7, Math.max(1, String(tradeStatus === "BREAKEVEN" ? 0 : rrValue === "" ? (tradeStatus === "LOSS" ? "1" : "2.5") : rrValue).length)) + 0.4}ch` }}
                className="min-w-0 max-w-[4.5rem] h-full bg-transparent text-center [font:inherit] [color:inherit] focus:outline-none placeholder:text-current placeholder:opacity-35 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="opacity-60" aria-hidden>R</span>
            </label>
          </div>
        );
      })()}
    </div>
  );
});
