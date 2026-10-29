import { Activity, Route, History, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { smartUpper } from '../../constants/constants';
import type { Trade } from '../../types';
import type { TradeInsight, PricePath } from '../../lib/tradeInsight';
import { UNSPECIFIED } from '../../lib/setupScorecard';
import { formatDuration, nyWallDate } from '../../lib/tradingTime';

/**
 * İşlem detayı · içgörü bölümleri (klasik detay penceresi stilinde):
 * Sonuç (plan ↔ gerçekleşen), fiyat yolu, kurulum geçmişi, disiplin rozetleri.
 */

const fmt = (v: number, d = 2) => v.toLocaleString('tr-TR', { maximumFractionDigits: d });
export const formatR = (v: number, d = 2) => `${v > 0 ? '+' : ''}${fmt(v, d)}R`;
const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');

// Yatay kart: etiket solda, değer sağda — dar panelde etiket taşmaz
const statCard = 'bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 min-w-0';
const statLabel = 'heading-3 truncate min-w-0';
const statValue = 'shrink-0 text-lg font-bold tabular-nums leading-tight';

/* ---------------- Sonuç ---------------- */
export function ResultPanel({ trade, path }: { trade: Trade; path: PricePath }) {
  const hasRisk = typeof trade.riskPct === 'number' && trade.riskPct > 0;
  return (
    <section className="flex flex-col gap-2">
      <h4 className="heading-2">
        <Activity size={12} /> SONUÇ
      </h4>
      {/* İkili ızgara; tek kalan kart tam genişlik */}
      <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
        <div className={statCard}>
          <span className={statLabel}>Gerçekleşen</span>
          <span className={`${statValue} ${tone(path.realizedR)}`}>{formatR(path.realizedR)}</span>
        </div>
        {path.plannedRR !== null && (
          <div className={statCard} title={`TP ${trade.tpPips} pip ÷ stop ${trade.stopPips} pip`}>
            <span className={statLabel}>Plan R:R</span>
            <span className={`${statValue} text-zinc-200`}>1:{fmt(path.plannedRR)}</span>
          </div>
        )}
        {hasRisk && (
          <div className={statCard}>
            <span className={statLabel}>Risk</span>
            <span className={`${statValue} text-zinc-200`}>%{fmt(trade.riskPct as number)}</span>
          </div>
        )}
        <ExitRow trade={trade} />
      </div>
    </section>
  );
}

/** İşlemde kalma süresi · çıkış saati (NY) — Target işlem bağlamında gösterilir */
function ExitRow({ trade }: { trade: Trade }) {
  const hasExit = typeof trade.exitAt === 'number' && trade.exitAt >= trade.createdAt;
  if (!hasExit) return null;
  const exitLabel = nyWallDate(trade.exitAt as number).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className={statCard} title={`Çıkış ${exitLabel}`}>
      <span className={statLabel}>Süre</span>
      <span className={`${statValue} text-zinc-200`}>{formatDuration((trade.exitAt as number) - trade.createdAt)}</span>
    </div>
  );
}

/* ---------------- Fiyat yolu (işlem bağlamının altında) ---------------- */
export function PricePathPanel({ trade, path }: { trade: Trade; path: PricePath }) {
  if (!hasPricePathContent(trade, path)) return null;
  return (
    <section className="h-full flex flex-col gap-1">
      <h4 className="heading-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5"><Route size={12} /> FİYAT YOLU</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-zinc-500">stop = −1R</span>
      </h4>
      <PricePathCard trade={trade} path={path} />
    </section>
  );
}

export function hasPricePathContent(trade: Trade, path: PricePath) {
  const hasStop = typeof trade.stopPips === 'number' && trade.stopPips > 0;
  if (!hasStop || (path.mfeR === null && path.maeR === null && path.plannedRR === null)) {
    return !(trade.maePips == null && trade.mfePips == null);
  }
  return true;
}

function PricePathCard({ trade, path }: { trade: Trade; path: PricePath }) {
  const hasStop = typeof trade.stopPips === 'number' && trade.stopPips > 0;
  if (!hasStop || (path.mfeR === null && path.maeR === null && path.plannedRR === null)) {
    if (trade.maePips == null && trade.mfePips == null) return null;
    return (
      <p className="text-[11px] text-zinc-500 flex items-start gap-1.5 px-1">
        <Info size={12} className="shrink-0 mt-px" />
        Stop pip girilirse MAE/MFE R'ye çevrilir ve fiyat yolu çizilir.
      </p>
    );
  }

  const lo = -Math.max(1, path.maeR ?? 0);
  const hi = Math.max(1, path.plannedRR ?? 0, path.mfeR ?? 0, path.realizedR);
  const span = hi - lo || 1;
  const x = (v: number) => `${((Math.max(lo, Math.min(hi, v)) - lo) / span) * 100}%`;
  const exit = path.realizedR;

  return (
    <div className="flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-3 py-2 flex flex-col justify-center gap-2">

      {/* Çizgi: SL ← giriş → TP; gezinme aralığı (MAE…MFE) ve çıkış noktası */}
      <div className="relative h-7" role="img" aria-label={`Fiyat yolu: MAE ${path.maeR ?? '—'}R, MFE ${path.mfeR ?? '—'}R, çıkış ${formatR(exit)}`}>
        <div className="absolute inset-x-0 top-1.5 h-1 rounded-full overflow-hidden flex">
          <div className="h-full bg-rose-500/15" style={{ width: x(0) }} />
          <div className="h-full flex-1 bg-emerald-500/12" />
        </div>
        {(path.maeR !== null || path.mfeR !== null) && (
          <div
            className="absolute top-1.5 h-1 rounded-full bg-gradient-to-r from-rose-400/60 via-zinc-400/50 to-emerald-400/70"
            style={{ left: x(-(path.maeR ?? 0)), width: `calc(${x(path.mfeR ?? 0)} - ${x(-(path.maeR ?? 0))})` }}
          />
        )}
        <Tick at={x(-1)} label="SL" cls="bg-rose-400" />
        <Tick at={x(0)} label="Giriş" cls="bg-zinc-300" />
        {path.plannedRR !== null && <Tick at={x(path.plannedRR)} label="TP" cls="bg-blue-400" />}
        <div
          className={`absolute top-2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 shadow ${exit > 0 ? 'bg-emerald-400' : exit < 0 ? 'bg-rose-400' : 'bg-zinc-300'}`}
          style={{ left: x(exit) }}
          title={`Çıkış ${formatR(exit)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Chip label="MAE" value={path.maePctOfStop !== null ? `%${path.maePctOfStop} stop` : '—'} sub={trade.maePips != null ? `${trade.maePips} pip` : undefined} cls={path.maePctOfStop !== null && path.maePctOfStop >= 80 ? 'text-rose-300' : 'text-zinc-200'} />
        <Chip label="MFE" value={path.mfeR !== null ? formatR(path.mfeR) : '—'} sub={trade.mfePips != null ? `${trade.mfePips} pip` : undefined} cls="text-emerald-300" />
        <Chip
          label="Masada kalan"
          value={path.leftOnTableR !== null ? `${fmt(path.leftOnTableR)}R` : '—'}
          sub="MFE − gerçekleşen"
          cls={path.leftOnTableR !== null && path.leftOnTableR >= 1 ? 'text-amber-300' : 'text-zinc-200'}
        />
        <Chip label="Yakalanan" value={path.captureRate !== null ? `%${path.captureRate}` : '—'} sub="hareketin ne kadarı" cls="text-zinc-200" />
      </div>
    </div>
  );
}

function Tick({ at, label, cls }: { at: string; label: string; cls: string }) {
  return (
    <div className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center" style={{ left: at }}>
      <span className={`w-0.5 h-2 mt-1 rounded-full ${cls} opacity-80`} />
      <span className="mt-auto text-[8px] font-semibold text-zinc-500 leading-none">{label}</span>
    </div>
  );
}

function Chip({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls: string }) {
  // Küçük metrik: etiket + değer; açıklama ipucunda
  return (
    <div className="min-w-0" title={sub ? `${label}: ${value} · ${sub}` : undefined}>
      <div className="text-[8px] leading-3 font-bold uppercase tracking-normal text-zinc-500 truncate">{smartUpper(label)}</div>
      <div className={`text-xs leading-4 font-bold tabular-nums truncate ${cls}`}>{value}</div>
    </div>
  );
}

/* ---------------- Kurulum geçmişi ---------------- */
const VERDICT: Record<string, { label: string; cls: string }> = {
  EDGE: { label: 'Kanıtlı edge', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  PROMISING: { label: 'Umut verici', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
  WEAK: { label: 'Zayıf', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  LEAK: { label: 'Sızıntı', cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  LOW_SAMPLE: { label: 'Az örneklem', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60' },
};

export function SetupHistoryPanel({ insight }: { insight: TradeInsight }) {
  const s = insight.setup;
  if (!s) return null;
  const e = s.others;
  const v = VERDICT[s.verdict];
  // Kurulum değerleri işlem bağlamında zaten görünür; burada yalnızca ipucu olarak
  const setupTitle = s.labels.map((l) => `${l.dimension}: ${l.value === UNSPECIFIED ? '—' : l.value}`).join(' · ');
  return (
    <section className="h-full flex flex-col gap-1">
      <h4 className="heading-2">
        <History size={12} /> KURULUM GEÇMİŞİ
      </h4>
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-3 py-2 flex flex-col justify-center gap-2" title={setupTitle}>
        {e.n === 0 ? (
          <p className="text-[11px] text-zinc-500">Bu kurulumla başka işlem yok — ilk örnek.</p>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-base font-bold tabular-nums leading-tight ${tone(e.expectancy)}`}>{formatR(e.expectancy)}<span className="text-[11px] font-medium text-zinc-500"> /işlem</span></div>
              <div className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                diğer {e.n} işlem · %{fmt(e.winRate, 0)} kazanma · net {formatR(e.netR, 1)}
                {e.n > 1 ? ` · GA [${fmt(e.expLo)}; ${fmt(e.expHi)}]` : ''}
              </div>
            </div>
            <span className={`shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${v.cls}`}>{v.label}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Disiplin rozetleri ---------------- */
export function RuleBadges({ insight }: { insight: TradeInsight }) {
  if (!insight.rulesMeasured) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="heading-2">
        <ShieldCheck size={12} /> DİSİPLİN
      </h4>
      {insight.violations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
          <ShieldCheck size={14} className="shrink-0" /> Kurallara Uygun İşlem
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {insight.violations.map((v) => (
            <span
              key={v.id}
              title={v.hint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200"
            >
              <ShieldAlert size={12} className="shrink-0 text-rose-300" />
              {v.title}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
