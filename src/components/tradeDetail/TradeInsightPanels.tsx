import { Activity, History } from 'lucide-react';
import { formatR, rnum } from '../../lib/format';
import { ACCOUNT_KIND_LABELS, getTradeAccountKind } from '../../constants/constants';
import type { Trade } from '../../types';
import type { TradeInsight } from '../../lib/tradeInsight';

/**
 * İşlem detayı · sonuç kartı ve kurulum geçmişi (grafiğin altında, yatay).
 */

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');


/* ---------------- Sonuç ---------------- */
const RESULT_WORD = (r: number) => (r > 0 ? 'Kazanç' : r < 0 ? 'Kayıp' : 'Breakeven');
const RESULT_BOX = (r: number) =>
  r > 0 ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : r < 0 ? 'border-rose-500/25 bg-rose-500/[0.06]' : 'border-zinc-700/70 bg-zinc-900/60';

/**
 * R cetveli: sonucun hedef ölçeğindeki yeri. Ölçek en az −1R … +3R'dir (tipik stop ve hedefler), daha büyük sonuçta genişler.
 * Sıfırdan sonuca kadar dolgu, sonuçta bir işaret; tam sayılarda ince çentikler.
 */
function RRuler({ r }: { r: number }) {
  const lo = Math.min(-1, Math.floor(r));
  const hi = Math.max(3, Math.ceil(r));
  const span = hi - lo;
  const pos = (v: number) => ((v - lo) / span) * 100;
  const z = pos(0);
  const p = pos(r);
  const step = span <= 8 ? 1 : Math.ceil(span / 6);
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v++) if (v === 0 || v === lo || v === hi || v % step === 0) ticks.push(v);
  // Etiketler: uçlar ve sıfır her zaman; aradakiler uçlara çok yakınsa yazılmaz (ör. "+8R +9R" üst üste binmesin)
  const labels = ticks.filter((v) => v === lo || v === hi || v === 0 || (hi - v >= step * 0.75 && v - lo >= step * 0.75 && Math.abs(v) >= step * 0.75));
  const fill = r > 0 ? 'bg-emerald-400/80' : r < 0 ? 'bg-rose-400/80' : 'bg-blue-300/80';
  const dot = r > 0 ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : r < 0 ? 'bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.6)]' : 'bg-blue-200 shadow-[0_0_10px_rgba(147,197,253,0.6)]';
  return (
    <div className="mt-2.5" aria-hidden>
      <div className="relative h-1.5 rounded-full bg-zinc-800/90">
        {ticks.map((v) => (
          <span key={v} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px ${v === 0 ? 'h-3 bg-zinc-500' : 'h-2 bg-zinc-700'}`} style={{ left: `${pos(v)}%` }} />
        ))}
        <span className={`absolute inset-y-0 rounded-full ${fill}`} style={{ left: `${Math.min(z, p)}%`, width: `${Math.abs(p - z)}%` }} />
        <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-zinc-950 ${dot}`} style={{ left: `${p}%` }} />
      </div>
      <div className="relative h-3 mt-1.5">
        {labels.map((v) => (
          <span
            key={v}
            className={`absolute top-0 text-label leading-none tabular-nums ${v === 0 ? 'text-zinc-300' : 'text-zinc-500'} ${v === lo ? '' : v === hi ? '-translate-x-full' : '-translate-x-1/2'}`}
            style={{ left: `${pos(v)}%` }}
          >
            {v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}R`}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Sonuç kartı: R büyük ve önde, yanında hesap türü (Prop / Hesapsız); altında R cetveli */
export function ResultPanel({ trade, realizedR }: { trade: Trade; realizedR: number }) {
  const kind = getTradeAccountKind(trade);
  return (
    <section className={`rounded-2xl border px-4 pt-3 pb-3 ${RESULT_BOX(realizedR)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="heading-3 flex items-center gap-1.5"><Activity size={12} /> Sonuç</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums leading-none ${tone(realizedR)}`}>{formatR(realizedR)}</span>
            <span className={`text-label font-bold ${tone(realizedR)}`}>{RESULT_WORD(realizedR)}</span>
          </div>
        </div>
        <span className={`whitespace-nowrap shrink-0 text-xs font-bold uppercase tracking-wider ${kind === 'PROP' ? 'text-blue-300' : 'text-amber-300'}`}>{ACCOUNT_KIND_LABELS[kind]}</span>
      </div>
      <RRuler r={realizedR} />
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

/**
 * Aynı kurulumun (Asia Range · İşlem Tipi) bu işlem hariç geçmişi.
 * Grafiğin altındaki alana sığan tek kart: solda kurulum adı ve işlem başı R, sağda hüküm.
 * fixedHeight: kart bulunduğu sabit yükseklikli alanı doldurur ve içerik tek satırda kalır (uzun metin kesilir), böylece yüksekliği içeriğe göre değişmez.
 */
export function SetupHistoryPanel({ insight, fixedHeight = false }: { insight: TradeInsight; fixedHeight?: boolean }) {
  const s = insight.setup;
  if (!s) return null;
  const e = s.others;
  const v = VERDICT[s.verdict];
  const setupName = s.labels.map((l) => l.value).join(' · ');
  return (
    <section className={`rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 flex items-center gap-4 ${fixedHeight ? 'h-full overflow-hidden' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <History size={12} className="text-zinc-500 shrink-0" />
          <span className="heading-3 text-zinc-400 shrink-0">Kurulum geçmişi</span>
          <span className="text-label font-semibold text-zinc-500 truncate min-w-0">· {setupName}</span>
        </div>
        {e.n === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">Bu kurulumla başka işlem yok, bu ilk örnek.</p>
        ) : (
          <div className={`mt-1 flex items-baseline gap-x-3 gap-y-0.5 ${fixedHeight ? 'flex-nowrap overflow-hidden' : 'flex-wrap'}`}>
            <span className={`text-lg font-bold tabular-nums leading-tight ${tone(e.expectancy)}`}>
              {formatR(e.expectancy)}
              <span className="text-label font-medium text-zinc-500"> /işlem</span>
            </span>
            <span className={`text-xs text-zinc-400 tabular-nums ${fixedHeight ? 'truncate min-w-0' : ''}`}>
              diğer {e.n} işlem · %{fmt(e.winRate, 0)} kazanma · net {formatR(e.netR)}
              {e.n > 1 ? ` · %95 aralık ${rnum(e.expLo)} – ${rnum(e.expHi)}R` : ''}
            </span>
          </div>
        )}
      </div>
      <span className={`whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg border text-label font-bold uppercase ${v.cls}`}>{v.label}</span>
    </section>
  );
}
