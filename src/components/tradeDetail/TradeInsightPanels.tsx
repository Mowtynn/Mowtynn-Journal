import { Activity, History } from 'lucide-react';
import { formatMoney, formatR, rnum } from '../../lib/format';
import { ACCOUNT_CATEGORY_BADGE, ACCOUNT_CATEGORY_LABELS, getTradeAccountCategory, getTradeStageLabel } from '../../constants/constants';
import type { Trade } from '../../types';
import type { TradeInsight } from '../../lib/tradeInsight';

/**
 * İşlem detayı · içgörü bölümleri (klasik detay penceresi stilinde):
 * Sonuç kartı ve kurulum geçmişi.
 */

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');


/* ---------------- Sonuç ---------------- */
const RESULT_WORD = (r: number) => (r > 0 ? 'Kazanç' : r < 0 ? 'Kayıp' : 'Breakeven');
const RESULT_BOX = (r: number) =>
  r > 0 ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : r < 0 ? 'border-rose-500/25 bg-rose-500/[0.06]' : 'border-zinc-700/70 bg-zinc-900/60';

/** Sonuç kartı: R büyük ve önde; yanında hesap, risk ve hesaba dolar etkisi (hesaplı işlemde) */
export function ResultPanel({ trade, realizedR }: { trade: Trade; realizedR: number }) {
  const cat = getTradeAccountCategory(trade);
  const stage = getTradeStageLabel(trade) || ACCOUNT_CATEGORY_LABELS[cat];
  // Ad zaten aşamayla bitiyorsa ("Fundednext 50K · Funded") aşama yalnızca rozette yazılır
  const rawName = trade.platform || '';
  const suffix = ` · ${stage}`;
  const accountName = rawName.toLocaleLowerCase('tr').endsWith(suffix.toLocaleLowerCase('tr')) ? rawName.slice(0, -suffix.length) : rawName;
  const hasRisk = typeof trade.riskPct === 'number' && trade.riskPct > 0;
  const dollars = typeof trade.riskAmount === 'number' && trade.riskAmount > 0 ? realizedR * trade.riskAmount : null;
  return (
    <section className={`rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-4 ${RESULT_BOX(realizedR)}`}>
      <div className="min-w-0">
        <span className="heading-3 flex items-center gap-1.5"><Activity size={12} /> Sonuç</span>
        <div className={`mt-1 text-3xl font-bold tabular-nums leading-none ${tone(realizedR)}`}>{formatR(realizedR)}</div>
        <div className={`mt-1.5 text-[11px] font-bold ${tone(realizedR)}`}>{RESULT_WORD(realizedR)}</div>
      </div>
      <div className="min-w-0 flex flex-col items-end gap-1.5 text-right">
        <span className="flex items-center justify-end gap-1.5 min-w-0 max-w-full text-xs font-bold text-zinc-200">
          {accountName && <span className="truncate min-w-0">{accountName}</span>}
          <span className={`whitespace-nowrap shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border ${ACCOUNT_CATEGORY_BADGE[cat]}`}>{stage}</span>
        </span>
        {(hasRisk || dollars !== null) && (
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {hasRisk && <>%{fmt(trade.riskPct as number)} risk</>}
            {hasRisk && dollars !== null && <span className="text-zinc-600"> · </span>}
            {dollars !== null && <span className={`font-bold ${tone(dollars)}`}>{formatMoney(dollars, true)}</span>}
          </span>
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
                {e.n > 1 ? ` · GA ${rnum(e.expLo)} – ${rnum(e.expHi)}` : ''}
              </div>
            </div>
            <span className={`whitespace-nowrap shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${v.cls}`}>{v.label}</span>
          </div>
        )}
      </div>
    </section>
  );
}
