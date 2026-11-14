import React from "react";
import { Activity } from "lucide-react";
import { Num, SetState, Titles, statusOfR } from './shared';
import { formatMoney } from '../../lib/format';
import { roundR } from '../../lib/tradeModel';

/** Tek dokunuşla en sık sonuçlar; farklı bir değer alana yazılır */
const QUICK_R = [-1, 0, 1, 2, 3] as const;

const RESULT_TONE = {
  WIN: { box: "border-emerald-500/35 bg-emerald-500/[0.07]", field: "focus-within:border-emerald-500/70", text: "text-emerald-300" },
  LOSS: { box: "border-rose-500/35 bg-rose-500/[0.07]", field: "focus-within:border-rose-500/70", text: "text-rose-300" },
  BREAKEVEN: { box: "border-blue-500/35 bg-blue-500/[0.07]", field: "focus-within:border-blue-500/70", text: "text-blue-300" },
  EMPTY: { box: "border-zinc-700/60 bg-zinc-950/80", field: "focus-within:border-blue-500/70", text: "text-zinc-300" },
} as const;

/** Yazılan metni R değerine çevirir: virgül ondalık sayılır, baştaki eksi korunur, yarım kalmış giriş ("-", "1.") bozulmaz */
const parseSignedR = (raw: string): Num | null => {
  const v = raw.replace(",", ".").replace(/[^\d.-]/g, "");
  if (v === "" || v === "-") return "";
  if (!/^-?\d*\.?\d*$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ================= 2. KART: SONUÇ (R) =================
 * Durum (WIN / LOSS / BREAKEVEN) ayrıca seçilmez: R'nin işaretinden gelir. Artı kazanç, eksi kayıp, 0 başabaş. */
export const ResultCard = React.memo(function ResultCard({
  titles,
  rrValue,
  setRrValue,
  riskDollar,
}: {
  titles: Titles;
  rrValue: Num;
  setRrValue: SetState<Num>;
  /** Seçili hesap ve riskin dolar karşılığı (1R); hesapsız işlemde yok */
  riskDollar?: number | null;
}) {
  const { L } = titles;
  // Alan yalnızca büyüklüğü tutar (2.5); işaret yanındaki Kazanç / Kayıp anahtarından gelir. Yazarken "-" ya da "+"
  // ile başlamak da işareti çevirir. Yarım girişler ("1.") metin olarak korunur, sayıya çevrilirken kaybolmaz.
  const [neg, setNeg] = React.useState<boolean>(rrValue !== "" && Number(rrValue) < 0);
  const [text, setText] = React.useState<string>(rrValue === "" ? "" : String(Math.abs(Number(rrValue))));
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    // Dışarıdan gelen değer (hızlı seçim, kopyalama, düzenleme) alandakiyle aynı değilse alanı ve işareti güncelle
    const current = text === "" ? "" : (neg ? -1 : 1) * Number(text);
    if (current === rrValue || (current !== "" && rrValue !== "" && Number(current) === Number(rrValue))) return;
    if (rrValue === "") {
      setText("");
      return;
    }
    const n = Number(rrValue);
    setText(String(Math.abs(n)));
    if (n !== 0) setNeg(n < 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rrValue]);

  // Kaydedilecek değer tek ondalık (2.08 → 2.1); durum ve dolar etkisi de onunla gösterilir
  const rounded = rrValue === "" ? null : roundR(Number(rrValue));
  const status = rounded === null ? null : statusOfR(rounded);
  const tone = RESULT_TONE[status ?? "EMPTY"];

  const onType = (raw: string) => {
    let v = raw.replace(",", ".").replace(/\s/g, "");
    let nextNeg = neg;
    if (v.startsWith("-") || v.startsWith("−")) { nextNeg = true; v = v.slice(1); }
    else if (v.startsWith("+")) { nextNeg = false; v = v.slice(1); }
    v = v.replace(/[^\d.]/g, "");
    if (!/^\d*\.?\d*$/.test(v)) return;
    setNeg(nextNeg);
    setText(v);
    const n = parseSignedR(v);
    setRrValue(n === null || n === "" ? "" : nextNeg ? -n : n);
  };
  const setSign = (nextNeg: boolean) => {
    setNeg(nextNeg);
    const n = parseSignedR(text);
    if (typeof n === "number" && n !== 0) setRrValue(nextNeg ? -n : n);
    inputRef.current?.focus();
  };

  return (
    <div className="tf-card flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/60">
        <Activity size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("financialCard")}</span>
      </div>

      {/* Gövde: giriş alanı + hızlı seçim. Kart sütunu doldurursa içerik dikeyde ortalanır (iç içe kutu ve ara boşluk yok) */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        {/* Giriş: solda Kazanç / Kayıp anahtarı, ortada sayı; sağda gerekirse kaydedilecek değer ya da dolar etkisi.
            Renk (yeşil / kırmızı / mavi) yalnızca alanın çerçevesi ve sayıda; geçişler yumuşak */}
        <div className={`relative flex items-center gap-2 h-12 pl-1.5 pr-3 rounded-xl border shadow-inner transition-ui duration-500 ease-out ${tone.box} ${tone.field}`}>
          <div role="group" aria-label="Sonucun yönü" className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <button
              type="button"
              aria-pressed={!neg}
              aria-label="Kazanç (+)"
              onClick={() => setSign(false)}
              className={`w-7 h-7 rounded-md text-sm font-bold leading-none transition-ui duration-300 ease-out cursor-pointer ${!neg ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              +
            </button>
            <button
              type="button"
              aria-pressed={neg}
              aria-label="Kayıp (−)"
              onClick={() => setSign(true)}
              className={`w-7 h-7 rounded-md text-sm font-bold leading-none transition-ui duration-300 ease-out cursor-pointer ${neg ? "bg-rose-500/20 text-rose-300" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              −
            </button>
          </div>
          {/* "−2" tek parça (işaret sayıyla aynı boyutta, aralıksız); "R" de aynı boyut ve taban çizgisinde, yalnızca soluk:
              üstü ve altı sayıyla tam aynı hizada durur */}
          <div className={`flex-1 min-w-0 flex items-baseline justify-center leading-none cursor-text transition-ui duration-500 ease-out ${tone.text}`} onClick={() => inputRef.current?.focus()}>
            <span className="text-2xl font-bold leading-none tabular-nums select-none" aria-hidden>{text !== "" && Number(text) !== 0 ? (neg ? "−" : "+") : ""}</span>
            <input
              ref={inputRef}
              id="tf-result-r"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-label={L("rr")}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onBlur={() => {
                // Alandan çıkınca tek ondalığa yuvarlanır: 2.08 → 2.1, 2.04 → 2
                if (rrValue === "") return;
                const r = roundR(Number(rrValue));
                if (r !== rrValue) setRrValue(r);
                setText(String(Math.abs(r)));
              }}
              style={{ width: `${Math.max(1, text.length || 1) + 0.15}ch` }}
              className="min-w-[1ch] max-w-full p-0 bg-transparent text-center text-2xl font-bold leading-none tabular-nums [color:inherit] focus:outline-none placeholder:text-zinc-600"
            />
            <span className="ml-1 text-2xl font-bold leading-none opacity-60 select-none" aria-hidden>R</span>
          </div>
          {/* Sağ köşe: yuvarlanacaksa kaydedilecek değer, hesaplıysa dolar etkisi (yer kaplamaz, satır eklemez) */}
          {rounded !== null && (rounded !== Number(rrValue) || riskDollar) ? (
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-500">
              {rounded !== Number(rrValue) ? `→ ${rounded}R` : formatMoney(rounded * (riskDollar || 0), true)}
            </span>
          ) : null}
        </div>

        {/* Hızlı seçim: çoğu işlem −1R, başabaş ya da tam hedef; tek dokunuş yeter */}
        <div role="group" aria-label="Hızlı sonuç" className="grid grid-cols-5 gap-2">
          {QUICK_R.map((v) => {
            const on = rrValue !== "" && Number(rrValue) === v;
            const cls = v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-blue-300";
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => setRrValue(v)}
                className={`h-9 rounded-xl border text-xs font-bold tabular-nums transition-ui duration-300 ease-out cursor-pointer ${
                  on ? `bg-zinc-800 border-zinc-500 ${cls}` : `bg-zinc-950/60 border-zinc-800 ${cls} opacity-75 hover:opacity-100 hover:border-zinc-600`
                }`}
              >
                {v === 0 ? "BE" : `${v > 0 ? "+" : "−"}${Math.abs(v)}R`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
