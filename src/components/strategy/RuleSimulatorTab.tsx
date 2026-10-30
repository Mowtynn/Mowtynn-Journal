import React, { useMemo, useState } from 'react';
import { FlaskConical, Plus, X } from 'lucide-react';
import { Trade } from '../../types';
import { FilterChip, FILTER_SELECT } from '../filters/FilterControls';
import { SETUP_DIMENSIONS, verdictFor, signalStrength, type SetupDimension } from '../../lib/setupScorecard';
import { SCAN_DIMENSIONS } from '../../lib/edgeSummary';
import { ruleOptions, simulateRule, HALF_MIN, type RuleCondition, type HalfStatus } from '../../lib/ruleSimulator';
import { EDGE_PROOF_MIN } from '../../lib/sampleSize';
import type { EdgeStats } from '../../lib/asiaAnalytics';
import { useNewsDayLabels } from '../../hooks/useNewsDayLabels';

const STORAGE_KEY = 'tj_rule_sim';
const MAX_CONDS = 6;
const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
const sR = (v: number) => `${v > 0 ? '+' : ''}${fmt(v)}R`;
const labelOf = (d: SetupDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;
const toneOf = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-zinc-300');

function loadConds(): RuleCondition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RuleCondition[];
    return Array.isArray(list)
      ? list
          .filter((c) => c && SCAN_DIMENSIONS.includes(c.dim) && Array.isArray(c.values))
          .map((c) => ({ dim: c.dim, values: c.values.filter((v) => typeof v === 'string'), exclude: c.exclude === true }))
          .slice(0, MAX_CONDS)
      : [];
  } catch {
    return [];
  }
}
function saveConds(c: RuleCondition[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* depolama yoksa yalnızca bu oturumda */
  }
}

const VERDICT_TEXT: Record<string, { label: string; cls: string }> = {
  EDGE: { label: 'Kanıtlı Edge', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  PROMISING: { label: 'Umut Verici', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
  WEAK: { label: 'Zayıf', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  LEAK: { label: 'Sızıntı', cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  LOW_SAMPLE: { label: 'Az Veri', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60' },
};

const HALF_TEXT: Record<HalfStatus, { label: string; cls: string; hint: string }> = {
  CONSISTENT: { label: 'İki Yarıda Tutarlı', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', hint: 'Kural işlemlerin hem ilk hem ikinci yarısında aynı yönde sonuç veriyor.' },
  MIXED: { label: 'Şans Olabilir', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10', hint: 'Yarılardan birinde sonuç ters yönde: bulgu tesadüf olabilir, yeni veriyle doğrula.' },
  THIN: { label: 'Yarı Testi İçin Az Veri', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60', hint: `Her yarıda en az ${HALF_MIN} işlem gerekir.` },
};

function Stat({ label, value, sub, cls = 'text-zinc-100' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="p-2.5 bg-zinc-950/50 border border-zinc-800/80 rounded-xl min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 block font-bold truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${cls}`}>{value}</span>
      {sub && <span className="text-[10px] text-zinc-500 block tabular-nums truncate">{sub}</span>}
    </div>
  );
}

function Curve({ points }: { points: Array<{ all: number; rule: number }> }) {
  if (points.length < 2) return null;
  const w = 600;
  const h = 140;
  const vals = points.flatMap((p) => [p.all, p.rule]);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 6 - ((v - min) / span) * (h - 12);
  const path = (k: 'all' | 'rule') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36" preserveAspectRatio="none" role="img" aria-label="Sermaye eğrisi: tüm işlemler ve kural">
        <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-zinc-800" strokeDasharray="4 4" />
        <path d={path('all')} fill="none" stroke="currentColor" className="text-zinc-500" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d={path('rule')} fill="none" stroke="currentColor" className="text-blue-400" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded" /> Kural</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-zinc-500 rounded" /> Tüm İşlemler</span>
      </div>
    </div>
  );
}

const ci = (e: EdgeStats) => (e.n > 1 ? `%95: ${fmt(e.expLo)} – ${fmt(e.expHi)}` : undefined);

export const RuleSimulatorTab = React.memo(function RuleSimulatorTab({ trades }: { trades: Trade[] }) {
  const [conds, setConds] = useState<RuleCondition[]>(loadConds);
  const { version } = useNewsDayLabels();
  const update = (next: RuleCondition[]) => {
    setConds(next);
    saveConds(next);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => Object.fromEntries(SCAN_DIMENSIONS.map((d) => [d, ruleOptions(trades, d)])) as Record<SetupDimension, string[]>, [trades, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const res = useMemo(() => simulateRule(trades, conds), [trades, conds, version]);

  const used = new Set(conds.map((c) => c.dim));
  const free = SCAN_DIMENSIONS.filter((d) => !used.has(d) && options[d]?.length);
  const active = conds.filter((c) => c.values.length > 0);
  const v = VERDICT_TEXT[verdictFor(res.taken)];
  const half = HALF_TEXT[res.halves.status];
  const takenPct = res.total ? Math.round((res.taken.n / res.total) * 100) : 0;
  const ruleText = active.length
    ? active.map((c) => `${labelOf(c.dim)} ${c.exclude ? '≠' : '='} ${c.values.join(' / ')}`).join(' · ')
    : 'Koşul yok: tüm işlemler';

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans flex items-center gap-2">
            <FlaskConical size={16} className="text-blue-400" /> Kural Simülatörü
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 max-w-2xl">
            "Yalnızca şu koşullarla işlem alsaydım" sorusunu geçmiş işlemlerinle cevaplar. Koşullar birlikte uygulanır; her koşulda seçilen
            değerlerden herhangi biri yeter. Yalnızca girişten önce bilinen alanlar kullanılır.
          </p>
        </div>

        <div className="space-y-2">
          {conds.map((c, i) => (
            <div key={c.dim} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={c.dim}
                  aria-label="Alan"
                  onChange={(e) => update(conds.map((x, j) => (j === i ? { dim: e.target.value as SetupDimension, values: [], exclude: x.exclude } : x)))}
                  className={FILTER_SELECT}
                >
                  {[c.dim, ...free].map((d) => (
                    <option key={d} value={d}>{labelOf(d)}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <FilterChip check={false} active={!c.exclude} onClick={() => update(conds.map((x, j) => (j === i ? { ...x, exclude: false } : x)))}>Yalnızca</FilterChip>
                  <FilterChip check={false} tone="loss" active={!!c.exclude} onClick={() => update(conds.map((x, j) => (j === i ? { ...x, exclude: true } : x)))}>Hariç</FilterChip>
                </div>
                <button
                  type="button"
                  onClick={() => update(conds.filter((_, j) => j !== i))}
                  aria-label="Koşulu kaldır"
                  className="ml-auto h-7 w-7 flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-rose-300 hover:border-rose-500/40 transition-ui cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(options[c.dim] || []).map((o) => {
                  const on = c.values.includes(o);
                  return (
                    <FilterChip
                      key={o}
                      tone={c.exclude ? 'loss' : 'brand'}
                      active={on}
                      onClick={() => update(conds.map((x, j) => (j === i ? { ...x, values: on ? x.values.filter((y) => y !== o) : [...x.values, o] } : x)))}
                    >
                      {o}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {conds.length < MAX_CONDS && free.length > 0 && (
            <button
              type="button"
              onClick={() => update([...conds, { dim: free[0], values: [] }])}
              className="h-8 px-3 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 text-xs font-bold flex items-center gap-1.5 transition-ui cursor-pointer"
            >
              <Plus size={13} /> Koşul Ekle
            </button>
          )}
          {conds.length > 0 && (
            <button type="button" onClick={() => update([])} className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-ui cursor-pointer">
              Temizle
            </button>
          )}
          <span className="ml-auto text-[11px] font-medium text-zinc-500 truncate max-w-full" title={ruleText}>{ruleText}</span>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${v.cls}`}>{v.label}</span>
          {res.taken.n > 0 && signalStrength(res.taken) === 'EARLY' && res.taken.expectancy > 0 && (
            <span className="text-[10px] text-zinc-500">Kanıt için en az {EDGE_PROOF_MIN} işlem ve sıfırın üstünde güven aralığı gerekir.</span>
          )}
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${half.cls}`}>{half.label}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <Stat label="Kurala Uyan" value={`${res.taken.n} İşlem`} sub={`Tümünün %${takenPct}'i`} />
          <Stat label="Beklenti" value={`${sR(res.taken.expectancy)}/İşlem`} sub={ci(res.taken)} cls={toneOf(res.taken.expectancy)} />
          <Stat label="Net R" value={sR(res.taken.netR)} sub={`Tümü ${sR(res.all.netR)}`} cls={toneOf(res.taken.netR)} />
          <Stat label="Kazanma Oranı" value={`%${fmt(res.taken.winRate, 1)}`} sub={`Tümü %${fmt(res.all.winRate, 1)}`} />
          <Stat label="Maks. DD" value={`${fmt(res.taken.maxDrawdownR)}R`} sub={`Tümü ${fmt(res.all.maxDrawdownR)}R`} />
          <Stat label="Vazgeçilen" value={`${res.skipped.n} İşlem`} sub={res.skipped.n ? `${sR(res.skipped.netR)} · ${sR(res.skipped.expectancy)}/İşlem` : undefined} cls={toneOf(-res.skipped.netR)} />
        </div>

        <Curve points={res.curve} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([['İlk Yarı', res.halves.first], ['İkinci Yarı', res.halves.second]] as const).map(([l, e]) => (
            <div key={l} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-xs">
              <span className="text-zinc-400 font-bold">{l}</span>
              <span className={`tabular-nums font-bold ${toneOf(e.expectancy)}`}>
                {e.n ? `${sR(e.expectancy)}/İşlem` : '-'} <span className="text-zinc-500 font-normal">· {e.n} işlem</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500">
          Yarılar zamana göre: tüm işlemlerin ilk yarısı ve ikinci yarısı. Kural iki yarıda da aynı yönde sonuç vermiyorsa bulduğun fark tesadüf olabilir.
          Vazgeçilen işlemlerin R'ı negatifse kural seni o kayıptan korurdu.
        </p>
      </div>
    </div>
  );
});
