import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { setupQualityTier } from "../../lib/setupQuality";

/**
 * Kurulum akışı — işlem ekleme formu ile işlem detayının ortak dili.
 *
 * Kurulum girdileri bir kurulumun gerçek zaman sırasıyla, dikey bir ray üzerinde adım adım dizilir:
 *   1. Asia Range  →  2. İşlem Tipi · Setup Kalitesi  →  3. POI (sweep saati · session · timeframe)  →  4. Confirmations
 * Adım tamamlanınca düğümü mavi bir onay işaretine döner ve ray bir sonraki adıma doğru ışır: formda neyin eksik kaldığı,
 * detayda kurulumun nasıl geliştiği tek bakışta okunur.
 */

/** Adım düğümü + ray. Düğüm, adımın ilk satırındaki başlıkla aynı hizada durur. */
export function FlowStep({
  n,
  done,
  last = false,
  dense = false,
  children,
}: {
  n: number;
  done: boolean;
  last?: boolean;
  /** Detay görünümü: adımlar arası boşluk daha dar */
  dense?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <div className="flex flex-col items-center" aria-hidden>
        <span
          className={`-mt-[3px] w-[22px] h-[22px] shrink-0 rounded-full border flex items-center justify-center text-label font-bold tabular-nums leading-none transition-ui duration-300 ${
            done
              ? "bg-blue-500/20 border-blue-500/60 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.28)]"
              : "bg-zinc-950 border-zinc-700 text-zinc-500"
          }`}
        >
          {done ? <Check size={11} strokeWidth={3} /> : n}
        </span>
        {!last && (
          <span
            className={`w-px flex-1 mt-1 rounded-full transition-colors duration-300 ${
              done ? "bg-gradient-to-b from-blue-500/60 to-zinc-800/80" : "bg-zinc-800/80"
            }`}
          />
        )}
      </div>
      <div className={`min-w-0 ${last ? "" : dense ? "pb-3" : "pb-4"}`}>{children}</div>
    </div>
  );
}

/** Akışın ilerlemesi: dört kısa çizgi + "3/4" (tamamlanan adım sayısı) */
export function FlowProgress({ steps }: { steps: boolean[] }) {
  const done = steps.filter(Boolean).length;
  const all = done === steps.length;
  return (
    <span className="ml-auto flex items-center gap-2 select-none" title={`${done} / ${steps.length} adım tamamlandı`}>
      <span className="flex items-center gap-1" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={i}
            className={`h-1 w-4 rounded-full transition-colors duration-300 ${s ? (all ? "bg-emerald-400/80" : "bg-blue-400/80") : "bg-zinc-800"}`}
          />
        ))}
      </span>
      <span className={`text-label font-bold tabular-nums ${all ? "text-emerald-300" : done ? "text-blue-300" : "text-zinc-500"}`}>
        {done}/{steps.length}
      </span>
    </span>
  );
}

/** Setup Kalitesi kademesinin renkleri (A+ yeşil · A mavi · B-C kırmızı) — form, detay ve liste aynı renkleri kullanır */
export function qualityTone(planFidelity?: string | null) {
  const tier = setupQualityTier(planFidelity);
  if (tier === "high") return { on: "bg-emerald-500/15 border-emerald-500/45", text: "text-emerald-300", chip: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" };
  if (tier === "low") return { on: "bg-rose-500/15 border-rose-500/45", text: "text-rose-300", chip: "border-rose-500/35 bg-rose-500/10 text-rose-300" };
  return { on: "bg-blue-500/20 border-blue-500/40", text: "text-blue-300", chip: "border-blue-500/30 bg-blue-500/10 text-blue-200" };
}

/** Kurulumun dört adımının tamamlanma durumu (form ve detay aynı kuralı kullanır) */
export function flowSteps(v: {
  asiaRange?: string | null;
  sweepTime?: string | null;
  poiTimeframe?: string | null;
  confirmations: string[];
  trend?: string | null;
  planFidelity?: string | null;
}): boolean[] {
  return [
    !!v.asiaRange,
    !!v.trend && !!v.planFidelity,
    !!v.sweepTime && !!v.poiTimeframe,
    v.confirmations.length > 0,
  ];
}
