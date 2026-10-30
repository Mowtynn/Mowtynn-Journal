import React, { useMemo, useState } from 'react';
import { FilterChip } from '../filters/FilterControls';
import { ClipboardList, Info, TrendingDown, TrendingUp, Search } from 'lucide-react';
import { Trade } from '../../types';
import {
  buildSetupScorecard, DEFAULT_SETUP_DIMENSIONS, SETUP_DIMENSIONS, SETUP_MIN_SAMPLE,
  type SetupDimension, type SetupRow, type SetupVerdict,
} from '../../lib/setupScorecard';
import { useNewsDayLabels } from '../../hooks/useNewsDayLabels';

const STORAGE_KEY = 'tj_setup_scorecard_dims';
const MAX_DIMS = 3;

const VERDICT: Record<SetupVerdict, { label: string; cls: string; hint: string }> = {
  EDGE: { label: 'Kanıtlı edge', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', hint: 'Beklentinin %95 güven aralığı tamamen sıfırın üstünde' },
  PROMISING: { label: 'Umut verici', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10', hint: 'Beklenti pozitif ama henüz kesin değil (kanıt için en az 30 işlem ve sıfırın üstünde güven aralığı)' },
  WEAK: { label: 'Zayıf', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10', hint: 'Beklenti sıfır ya da negatif, henüz kesin değil' },
  LEAK: { label: 'Sızıntı', cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10', hint: 'Beklentinin %95 güven aralığı tamamen sıfırın altında' },
  LOW_SAMPLE: { label: 'Az örneklem', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60', hint: `En az ${SETUP_MIN_SAMPLE} işlem gerekli` },
};

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
const sR = (v: number) => `${v > 0 ? '+' : ''}${fmt(v)}R`;

function loadDims(): SetupDimension[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids = SETUP_DIMENSIONS.map((d) => d.id);
      const v = (JSON.parse(raw) as string[]).filter((x): x is SetupDimension => ids.includes(x as SetupDimension));
      if (v.length) return v.slice(0, MAX_DIMS);
    }
  } catch {
    /* tarayıcı depolaması yoksa varsayılan */
  }
  return DEFAULT_SETUP_DIMENSIONS;
}

function SetupHighlight({ row, tone }: { row: SetupRow; tone: 'good' | 'bad' }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
      <span className="text-xs font-bold text-zinc-200 truncate" title={row.labels.join(' · ')}>{row.labels.join(' · ')}</span>
      <span className={`text-xs font-extrabold tabular-nums shrink-0 ${tone === 'good' ? 'text-emerald-300' : 'text-rose-300'}`}>
        {sR(row.edge.expectancy)} · {row.edge.n}
      </span>
    </div>
  );
}

export const SetupScorecardTab = React.memo(function SetupScorecardTab({ trades }: { trades: Trade[] }) {
  const [dims, setDims] = useState<SetupDimension[]>(loadDims);
  const [hideLowSample, setHideLowSample] = useState(false);
  // İşlem öncesi kontrol: aklındaki kurulumu yaz, karnesini gör (eski Pre-Trade sekmesinin yerini alır)
  const [query, setQuery] = useState('');
  const { version } = useNewsDayLabels();

  const toggleDim = (d: SetupDimension) => {
    setDims((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : prev.length >= MAX_DIMS ? [...prev.slice(1), d] : [...prev, d];
      const safe = next.length ? next : prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
      } catch {
        /* yoksay */
      }
      return safe;
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => buildSetupScorecard(trades, dims), [trades, dims, version]);
  const judged = result.rows.filter((r) => r.verdict !== 'LOW_SAMPLE');
  const best = judged.filter((r) => r.edge.expectancy > 0).slice(0, 3);
  const worst = [...judged].reverse().filter((r) => r.edge.expectancy < 0).slice(0, 3);
  const tokens = query.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
  const matches = (r: SetupRow) => {
    const hay = r.labels.join(' ').toLocaleLowerCase('tr');
    return tokens.every((tk) => hay.includes(tk));
  };
  const rows = (hideLowSample ? judged : result.rows).filter((r) => !tokens.length || matches(r));
  const dimLabel = (d: SetupDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;

  return (
    <div className="space-y-4">
      {/* Boyut seçimi */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 font-sans flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-400" /> Kurulum Karnesi
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xl">
              İşlemlerini seçtiğin alanların birleşimine göre kurulumlara ayırır. Hüküm, beklentinin %95 güven aralığına göre verilir; {SETUP_MIN_SAMPLE} işlemden azına hüküm yok.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 cursor-pointer select-none">
            <input type="checkbox" className="accent-blue-500" checked={hideLowSample} onChange={(e) => setHideLowSample(e.target.checked)} />
            Az Örneklemi Gizle
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SETUP_DIMENSIONS.map((d) => {
            const on = dims.includes(d.id);
            return (
              <FilterChip key={d.id} check={false} active={on} onClick={() => toggleDim(d.id)}>
                {on ? `${dims.indexOf(d.id) + 1}. ` : ''}{d.label}
              </FilterChip>
            );
          })}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İşlem öncesi kontrol: kurulumu yaz (ör. London FVG)"
            aria-label="Kurulum ara"
            className="w-full h-9 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-zinc-500">
          En fazla {MAX_DIMS} alan · {result.total} işlem gruplandı
          {result.unspecifiedCount > 0 ? ` · ${result.unspecifiedCount} işlemde bu alanların hiçbiri girilmemiş` : ''}
        </p>
      </div>

      {/* En iyi / en zayıf */}
      {(best.length > 0 || worst.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
              <TrendingUp size={12} /> Önceliklendir
            </span>
            {best.length ? best.map((r) => <SetupHighlight key={r.key} row={r} tone="good" />) : <p className="text-[11px] text-zinc-500">Pozitif beklentili, yeterli örneklemli kurulum yok.</p>}
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-rose-400 flex items-center gap-1.5">
              <TrendingDown size={12} /> Azalt ya da bırak
            </span>
            {worst.length ? worst.map((r) => <SetupHighlight key={r.key} row={r} tone="bad" />) : <p className="text-[11px] text-zinc-500">Negatif beklentili, yeterli örneklemli kurulum yok.</p>}
          </div>
        </div>
      )}

      {/* Tam liste */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_56px_84px_150px_76px_56px_108px] gap-2 px-4 py-2 border-b border-zinc-800/80 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          <span>{dims.map(dimLabel).join(' · ')}</span>
          <span className="text-right">İşlem</span>
          <span className="text-right">Kazanma</span>
          <span className="text-right">Beklenti (%95 GA)</span>
          <span className="text-right">Net R</span>
          <span className="text-right">PF</span>
          <span className="text-right">Hüküm</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-center text-[11px] text-zinc-500 flex flex-col items-center gap-2">
            <Info size={16} className="text-zinc-600" />
            {tokens.length ? 'Bu kurulumla eşleşen geçmiş işlem yok — kanıtsız kurulum.' : 'Bu alanlarla gruplanacak işlem yok. İşlem formunda bu alanları doldurdukça karne dolar.'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 max-h-[560px] overflow-y-auto custom-scrollbar">
            {rows.map((r) => {
              const v = VERDICT[r.verdict];
              const e = r.edge;
              return (
                <div key={r.key} className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_56px_84px_150px_76px_56px_108px] gap-x-2 gap-y-1 px-4 py-2.5 text-xs items-center hover:bg-zinc-900/60">
                  <div className="col-span-2 md:col-span-1 min-w-0 flex flex-wrap gap-1">
                    {r.labels.map((l, i) => (
                      <span key={i} className={`px-1.5 py-0.5 rounded-md border text-[11px] font-bold truncate max-w-full ${l === 'Belirtilmemiş' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-700 text-zinc-200 bg-zinc-950/40'}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                  <span className="md:text-right text-zinc-300 tabular-nums"><span className="md:hidden text-zinc-500">İşlem </span>{e.n}</span>
                  <span className="text-right text-zinc-300 tabular-nums">%{fmt(e.winRate, 0)}</span>
                  <span className={`md:text-right tabular-nums font-bold ${e.expectancy > 0 ? 'text-emerald-300' : e.expectancy < 0 ? 'text-rose-300' : 'text-zinc-400'}`}>
                    {sR(e.expectancy)}
                    {e.n > 1 && <span className="text-[10px] font-normal text-zinc-500"> {fmt(e.expLo)} – {fmt(e.expHi)}</span>}
                  </span>
                  <span className={`text-right tabular-nums ${e.netR >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{sR(e.netR)}</span>
                  <span className="md:text-right text-zinc-400 tabular-nums"><span className="md:hidden text-zinc-500">PF </span>{e.profitFactor >= 999 ? '∞' : fmt(e.profitFactor)}</span>
                  <span className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${v.cls}`}>{v.label}</span>
                    {r.drift.ready && r.drift.direction !== 'STABLE' && (
                      <span
                        className={`block mt-0.5 text-[10px] font-bold tabular-nums ${r.drift.direction === 'WEAKENING' ? 'text-rose-300' : 'text-emerald-300'}`}
                      >
                        Son 10 {r.drift.direction === 'WEAKENING' ? '↓' : '↑'} {sR(r.drift.recent!.expectancy)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
