import React from "react";
import { Activity } from "lucide-react";
import { Num, Status, SetState, parsePip, Titles, SlideBg } from './shared';

const RESULT_TONE: Record<Status, { box: string; field: string; text: string; sign: string }> = {
  WIN: { box: "border-emerald-500/25 bg-emerald-500/[0.06]", field: "focus-within:border-emerald-500/70", text: "text-emerald-300", sign: "+" },
  LOSS: { box: "border-rose-500/25 bg-rose-500/[0.06]", field: "focus-within:border-rose-500/70", text: "text-rose-300", sign: "−" },
  BREAKEVEN: { box: "border-blue-500/25 bg-blue-500/[0.06]", field: "focus-within:border-blue-500/70", text: "text-blue-300", sign: "" },
};

/* ================= 2. KART: SONUÇ (durum, Asia Range Pip, R) ================= */
export const ResultCard = React.memo(function ResultCard({
  titles,
  isQuick,
  tradeStatus,
  setTradeStatus,
  rrValue,
  setRrValue,
  asiaRangePips,
  setAsiaRangePips,
}: {
  titles: Titles;
  isQuick: boolean;
  tradeStatus: Status;
  setTradeStatus: SetState<Status>;
  rrValue: Num;
  setRrValue: SetState<Num>;
  asiaRangePips: Num;
  setAsiaRangePips: SetState<Num>;
}) {
  const { L } = titles;
  const handleAsiaRangePipsChange = (val: string) => setAsiaRangePips(parsePip(val));

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
                    if (rrValue === 0 || rrValue === 1) setRrValue("");
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

      {/* ASIA RANGE PİP — tam kayıtta; hızlı kayıtta sorulmaz */}
      {!isQuick && (
        <div className="bg-zinc-950/40 px-3 py-2.5 rounded-xl border border-zinc-800/70 flex items-center gap-3">
          <label htmlFor="tf-asia-pip" className="min-w-0 flex-1 text-[10px] sm:text-[11px] font-bold text-blue-400 uppercase tracking-wide font-sans flex items-center gap-1.5 whitespace-nowrap">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="truncate">{L("asiaRangePips")}</span>
          </label>
          <input
            id="tf-asia-pip"
            type="number"
            step="any"
            min="0"
            placeholder="örn: 18.5"
            value={asiaRangePips}
            onChange={(e) => handleAsiaRangePipsChange(e.target.value)}
            className="w-[6.5rem] shrink-0 h-9 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg px-2.5 text-xs text-center text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
          />
        </div>
      )}

      {/* SONUÇ (R) — kartın asıl çıktısı: duruma göre renklenen, büyük yazılı alan. BE her zaman 0R. */}
      {(() => {
        const t = RESULT_TONE[tradeStatus];
        const [hint] =
          tradeStatus === "BREAKEVEN"
            ? ["Her zaman 0R", "Breakeven işlem her zaman 0R kaydedilir."]
            : tradeStatus === "LOSS"
              ? ["Pozitif yaz", "Kaybı pozitif sayı olarak yaz; eksi işareti durumdan gelir."]
              : ["Kazanç, R olarak", "Kazancı R cinsinden yaz."];
        return (
          <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-ui ${t.box}`}>
            <div className="min-w-0 flex-1">
              <label htmlFor="tf-result-r" className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide block font-sans ${t.text}`}>
                {L("rr")}
              </label>
              <p className="text-[10px] text-zinc-400 font-sans leading-snug mt-0.5 truncate">{hint}</p>
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
