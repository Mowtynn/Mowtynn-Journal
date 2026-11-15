import { Activity } from 'lucide-react';
import { formatMoney, formatR } from '../../lib/format';
import { ACCOUNT_CATEGORY_BADGE, ACCOUNT_CATEGORY_LABELS, getTradeAccountCategory, getTradeStageLabel } from '../../constants/constants';
import type { Trade } from '../../types';

/**
 * İşlem detayı · sonuç kartı (klasik detay penceresi stilinde).
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
    <section className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-4 ${RESULT_BOX(realizedR)}`}>
      <div className="min-w-0">
        <span className="heading-3 flex items-center gap-1.5"><Activity size={12} /> Sonuç</span>
        {/* R ve sonuç sözcüğü aynı satırda: kart kısa kalır, notlara yer açılır */}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums leading-none ${tone(realizedR)}`}>{formatR(realizedR)}</span>
          <span className={`text-[11px] font-bold ${tone(realizedR)}`}>{RESULT_WORD(realizedR)}</span>
        </div>
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
