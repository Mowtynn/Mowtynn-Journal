import { formatR } from "../../lib/format";
import { qualityTone } from "../setupFlow/SetupFlow";
import { Repeat2, TrendingUp } from "lucide-react";

const PILL = "inline-flex items-center justify-center h-[20px] px-1.5 py-0 text-center text-label font-bold rounded-full uppercase font-sans tabular-nums border transition-colors";

/** İşlem R'si: işarete göre renk, başabaş "BE" (mavi). Durum R'den geldiği için ayrı bir Sonuç rozeti gerekmez. */
export function RBadge({ rr }: { rr: unknown }) {
  if (typeof rr !== "number" || !Number.isFinite(rr)) {
    return <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-label font-medium text-zinc-500">—</span>;
  }
  const tone =
    rr > 0
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/50"
      : rr < 0
        ? "text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/50"
        : "text-blue-300 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/50";
  return <span className={`${PILL} tracking-wider w-[46px] sm:w-[54px] ${tone}`}>{rr === 0 ? "BE" : formatR(rr)}</span>;
}

/**
 * İşlem Tipi: Continuation / Reversal. İkisi de mavi; ayrımı ikon yapar
 * (Continuation: aynı yönde devam eden ok, Reversal: dönüş oku). Metin kesilmez (sütun buna göre geniş). Girilmemişse tire.
 */
export function TrendBadge({ trend }: { trend?: string }) {
  const t = (trend || "").trim();
  if (!t) return <span className="text-zinc-600">—</span>;
  const reversal = /^rev/i.test(t);
  return (
    <span className={`${PILL} gap-1 px-2 whitespace-nowrap tracking-wide text-blue-300 bg-blue-500/10 border-blue-500/25 group-hover:border-blue-500/50`}>
      {reversal ? <Repeat2 size={12} strokeWidth={2.25} aria-hidden className="shrink-0" /> : <TrendingUp size={12} strokeWidth={2.25} aria-hidden className="shrink-0" />}
      <span>{t}</span>
    </span>
  );
}

/** Setup Kalitesi: kademesinin rengiyle (A+ yeşil · A mavi · B-C kırmızı), formdaki ve detaydaki renklerle aynı */
export function QualityBadge({ value }: { value?: string | null }) {
  const v = (value || "").trim();
  if (!v) return <span className="text-zinc-600">—</span>;
  return <span lang="en" className={`${PILL} px-2 min-w-[36px] tracking-wide ${qualityTone(v).chip}`}>{v}</span>;
}

/** POI: sweep saati (NY) · session · POI timeframe — tek satırda; girilmemiş parçalar atlanır */
export function PoiCell({ sweepTime, session, timeframe }: { sweepTime?: string; session?: string; timeframe?: string }) {
  if (!sweepTime && !session && !timeframe) return <span className="text-zinc-600">—</span>;
  return (
    <span lang="en" className="inline-flex items-center justify-center gap-1.5 max-w-full min-w-0 font-sans">
      {sweepTime && <span className="text-zinc-200 font-bold tabular-nums">{sweepTime}</span>}
      {session && <span className="text-zinc-400 font-semibold truncate">{session}</span>}
      {timeframe && (
        <span className={`${PILL} px-1.5 min-w-[30px] text-zinc-300 bg-zinc-800/70 border-zinc-700/70 group-hover:border-zinc-500`}>{timeframe}</span>
      )}
    </span>
  );
}
