import { Activity, History } from 'lucide-react';
import { fixed, formatR as sharedFormatR } from '../../lib/format';
import type { Trade } from '../../types';
import type { TradeInsight, PricePath } from '../../lib/tradeInsight';

/**
 * İşlem detayı · içgörü bölümleri (klasik detay penceresi stilinde):
 * Sonuç (plan ↔ gerçekleşen) ve kurulum geçmişi.
 */

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
export const formatR = sharedFormatR;
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
        {hasRisk && (
          <div className={statCard}>
            <span className={statLabel}>Risk</span>
            <span className={`${statValue} text-zinc-200`}>%{fmt(trade.riskPct as number)}</span>
          </div>
        )}
      </div>
    </section>
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
  return (
    <section className="flex flex-col gap-2">
      <h4 className="heading-2">
        <History size={12} /> KURULUM GEÇMİŞİ
      </h4>
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-3 py-2 flex flex-col justify-center gap-2">
        {e.n === 0 ? (
          <p className="text-[11px] text-zinc-500">Bu kurulumla başka işlem yok — ilk örnek.</p>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-base font-bold tabular-nums leading-tight ${tone(e.expectancy)}`}>{formatR(e.expectancy)}<span className="text-[11px] font-medium text-zinc-500"> /işlem</span></div>
              <div className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                diğer {e.n} işlem · %{fmt(e.winRate, 0)} kazanma · net {formatR(e.netR)}
                {e.n > 1 ? ` · GA ${fixed(e.expLo)} – ${fixed(e.expHi)}` : ''}
              </div>
            </div>
            <span className={`shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${v.cls}`}>{v.label}</span>
          </div>
        )}
      </div>
    </section>
  );
}
