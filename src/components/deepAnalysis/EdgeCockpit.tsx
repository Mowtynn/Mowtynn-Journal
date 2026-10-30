import React, { useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Newspaper,
  Percent,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react';
import { Trade } from '../../types';
import { computeEdgeSummary, PAIR_MIN_LIFT, type DimensionSlice } from '../../lib/edgeSummary';
import { dimensionValue, verdictFor, signalStrength, DEFAULT_SETUP_DIMENSIONS, SETUP_MIN_SAMPLE, type SetupRow } from '../../lib/setupScorecard';
import { EDGE_PROOF_MIN } from '../../lib/sampleSize';
import { analyzeDiscipline, type RuleResult } from '../../lib/discipline';
import { EdgeStats } from '../../lib/asiaAnalytics';
import { useNewsDayLabels } from '../../hooks/useNewsDayLabels';
import { formatDuration } from '../../lib/tradingTime';

/**
 * Strateji & Edge Geliştirme Laboratuvarı sekmeleri: Edge Özeti (neyi daha çok / neyi hiç yapmamalı)
 * ve Disiplin (kural ihlalleri ve "uysaydın" simülasyonu).
 * Her satır tıklanınca ilgili işlemler geçmiş penceresinde açılır.
 */

export type ShowTrades = (title: string, trades: Trade[]) => void;

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { maximumFractionDigits: d });
const sR = (v: number, d = 2) => `${v > 0 ? '+' : ''}${fmt(v, d)}R`;

/**
 * Kural sonrası performans: bir kural ilk kez oluştuğu an cihazda saklanır; sonrasındaki işlemler ayrıca ölçülür
 * (kural kendi türetildiği veriyle değil, sonraki işlemlerle doğrulanır).
 */
const RULE_SINCE_KEY = 'tj_rule_since';
const ruleKey = (kind: string, title: string) => `${kind}|${title}`;
function loadRuleSince(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(RULE_SINCE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
const tone = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-zinc-400');

const VERDICT_PILL: Record<string, { label: string; cls: string }> = {
  EDGE: { label: 'Kanıtlı edge', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  PROMISING: { label: 'Umut verici', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
  WEAK: { label: 'Henüz zayıf', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  LEAK: { label: 'Negatif edge', cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
  LOW_SAMPLE: { label: 'Az örneklem', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60' },
};

const card = 'bg-zinc-900/70 border border-zinc-700/50 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4 min-w-0';
const sectionTitle = 'text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5';

/* ---------- bulgu güveni rozeti ---------- */
export function SignalBadge({ edge }: { edge: EdgeStats }) {
  const strong = signalStrength(edge) === 'CONFIRMED';
  const neg = edge.expectancy < 0;
  if (strong) {
    return (
      <span className={`shrink-0 px-1.5 py-px rounded-md border text-[9px] font-bold uppercase ${neg ? 'text-rose-300 border-rose-500/30 bg-rose-500/10' : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'}`}>
        {neg ? 'Kesin' : 'Kanıtlı'}
      </span>
    );
  }
  return (
    <span
      className="shrink-0 px-1.5 py-px rounded-md border border-zinc-700 bg-zinc-800/60 text-[9px] font-bold uppercase text-zinc-400 tabular-nums"
      title={neg ? 'Ortalama negatif ama %95 güven aralığı sıfırı da kapsıyor: yeni veriyle doğrula' : `Kanıt için en az ${EDGE_PROOF_MIN} işlem ve sıfırın üstünde güven aralığı gerekir`}
    >
      Erken{edge.n < EDGE_PROOF_MIN ? ` · ${edge.n}/${EDGE_PROOF_MIN}` : ''}
    </span>
  );
}

/* ---------- ortak satır ---------- */
function InsightRow({ title, sub, edge, onClick }: { title: string; sub?: string; edge: EdgeStats; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900 hover:border-zinc-700 px-3 py-2.5 text-left transition-ui cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-zinc-200 truncate" title={title}>{title}</span>
          <SignalBadge edge={edge} />
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
          {e2s(edge)}
          {sub ? ` · ${sub}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-bold tabular-nums ${tone(edge.expectancy)}`}>{sR(edge.expectancy)}</div>
        <div className="text-[10px] text-zinc-500 tabular-nums">net {sR(edge.netR, 1)}</div>
      </div>
      <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors" />
    </button>
  );
}
const e2s = (e: EdgeStats) => `${e.n} işlem · %${fmt(e.winRate, 0)} kazanma`;

/* ---------- Edge Özeti ---------- */
export const EdgeSummaryCard = React.memo(function EdgeSummaryCard({ trades, onShowTrades }: { trades: Trade[]; onShowTrades: ShowTrades }) {
  const { labels: news, version } = useNewsDayLabels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => computeEdgeSummary(trades), [trades, version]);
  // Kuralın oluştuğu an: ilk görüldüğü son işlem zamanı (sonraki işlemler kural sonrası performans)
  const ruleSince = useMemo(() => {
    const map = loadRuleSince();
    const last = trades.reduce((m, t) => Math.max(m, t.createdAt), 0);
    let changed = false;
    s.rules.forEach((r) => {
      const k = ruleKey(r.kind, r.title);
      if (map[k] === undefined) {
        map[k] = last;
        changed = true;
      }
    });
    if (changed) {
      try {
        localStorage.setItem(RULE_SINCE_KEY, JSON.stringify(map));
      } catch {
        /* yok say */
      }
    }
    return map;
  }, [s, trades]);
  const verdict = verdictFor(s.overall, SETUP_MIN_SAMPLE);
  const pill = VERDICT_PILL[verdict];

  const setupTrades = (r: SetupRow) =>
    trades.filter((t) => DEFAULT_SETUP_DIMENSIONS.every((d, i) => dimensionValue(t, d) === r.labels[i]));
  const sliceTrades = (x: DimensionSlice) => trades.filter((t) => dimensionValue(t, x.dimension) === x.value);

  const goods = [
    ...s.bestSetups.map((r) => ({ key: `s:${r.key}`, title: r.labels.join(' · '), sub: 'kurulum', edge: r.edge, open: () => onShowTrades(`Kurulum: ${r.labels.join(' · ')}`, setupTrades(r)) })),
    ...s.strengths.map((x) => ({ key: `d:${x.dimension}:${x.value}`, title: `${x.dimensionLabel}: ${x.value}`, sub: x.overlap ? `%${Math.round(x.overlap.pct * 100)}'i ${x.overlap.label}` : undefined, edge: x.edge, open: () => onShowTrades(`${x.dimensionLabel}: ${x.value}`, sliceTrades(x)) })),
  ].slice(0, 4);
  const bads = [
    ...s.worstSetups.map((r) => ({ key: `s:${r.key}`, title: r.labels.join(' · '), sub: 'kurulum', edge: r.edge, open: () => onShowTrades(`Kurulum: ${r.labels.join(' · ')}`, setupTrades(r)) })),
    ...s.leaks.map((x) => ({ key: `d:${x.dimension}:${x.value}`, title: `${x.dimensionLabel}: ${x.value}`, sub: x.overlap ? `%${Math.round(x.overlap.pct * 100)}'i ${x.overlap.label}` : undefined, edge: x.edge, open: () => onShowTrades(`${x.dimensionLabel}: ${x.value}`, sliceTrades(x)) })),
  ].slice(0, 4);

  return (
    <section className={card} aria-label="Edge Özeti">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0">
            <Compass size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-100">Edge Özeti</h3>
            <p className="text-[11px] text-zinc-500">Neyi daha çok yapmalı, neyi bırakmalı · {s.total} işlem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-lg font-bold tabular-nums leading-tight ${tone(s.overall.expectancy)}`}>{sR(s.overall.expectancy)}</div>
            <div className="text-[10px] text-zinc-500 tabular-nums">
              işlem başı · %95 GA {fmt(s.overall.expLo)} – {fmt(s.overall.expHi)}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${pill.cls}`}>{pill.label}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`${sectionTitle} text-emerald-400`}>
            <TrendingUp size={12} /> Daha çok yap
          </span>
          {goods.length ? (
            goods.map((g) => <InsightRow key={g.key} title={g.title} sub={g.sub} edge={g.edge} onClick={g.open} />)
          ) : (
            <p className="text-[11px] text-zinc-500 rounded-xl border border-dashed border-zinc-800 px-3 py-3">
              Henüz pozitif beklentili ve en az {SETUP_MIN_SAMPLE * 2} işlemli (ya da kanıtlı) bir alan yok.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`${sectionTitle} text-rose-400`}>
            <TrendingDown size={12} /> Azalt ya da bırak
          </span>
          {bads.length ? (
            bads.map((g) => <InsightRow key={g.key} title={g.title} sub={g.sub} edge={g.edge} onClick={g.open} />)
          ) : (
            <p className="text-[11px] text-zinc-500 rounded-xl border border-dashed border-zinc-800 px-3 py-3">
              En az {SETUP_MIN_SAMPLE} işlemli negatif bir alan yok — sızıntı görünmüyor.
            </p>
          )}
        </div>
      </div>

      {[...goods, ...bads].some((g) => signalStrength(g.edge) === 'EARLY') && (
        <p className="text-[10px] text-zinc-500 -mt-1 flex items-start gap-1.5">
          <Info size={11} className="shrink-0 mt-px" />
          <span>
            Altındaki “%80'i …” notu, bulgunun büyük ölçüde başka bir alanla örtüştüğünü gösterir: ikisi aynı etki olabilir, Kurulum Karnesi'nde birlikte seçip ayır. Bu özet {s.testedSlices} farklı alan değerini karşılaştırıyor; bu kadar karşılaştırmada bazı sonuçlar yalnızca şans eseri iyi ya da kötü görünür. <b className="text-zinc-400">Erken</b> rozetli bulgular henüz istatistiksel olarak kesin değil (az işlem ya da güven aralığı sıfırı kapsıyor). Kural yapmadan önce yeni işlemlerle doğrula. Olumlu bulgu {EDGE_PROOF_MIN} işlemden sonra “Kanıtlı” olabilir; sızıntı uyarısı aralık tamamen negatife geçince “Kesin” olur.
          </span>
        </p>
      )}

      {/* Risk %, News day etkisi ve işlemde kalma süresi */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/70">
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`${sectionTitle} text-blue-300`}>
            <Percent size={12} /> Risk %'sine göre
          </span>
          {s.riskSlices.length ? (
            <div className="flex flex-wrap gap-1.5">
              {s.riskSlices.map((r) => (
                <button
                  key={r.riskPct}
                  type="button"
                  onClick={() => onShowTrades(`Risk %${fmt(r.riskPct, 3)}`, trades.filter((t) => typeof t.riskPct === 'number' && Math.round(t.riskPct * 1000) / 1000 === r.riskPct))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 text-[11px] tabular-nums transition-ui cursor-pointer"
                  title={e2s(r.edge)}
                >
                  <span className="text-zinc-400 font-semibold">%{fmt(r.riskPct, 3)}</span>{' '}
                  <span className={`font-bold ${tone(r.edge.expectancy)}`}>{sR(r.edge.expectancy)}</span>{' '}
                  <span className="text-zinc-600">({r.edge.n})</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">Risk yüzdesi girilmiş işlem yok (prop hesabına bağlı işlemlerde formdan seçilir).</p>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`${sectionTitle} text-amber-300`}>
            <Newspaper size={12} /> News day etkisi
          </span>
          {s.news.yes.n + s.news.no.n > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {([['YES', news.yes, s.news.yes, true], ['NO', news.no, s.news.no, false]] as const).map(([k, label, e, flag]) => (
                <button
                  key={k}
                  type="button"
                  disabled={!e.n}
                  onClick={() => onShowTrades(`News day: ${label}`, trades.filter((t) => t.newsDay === flag))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-default text-[11px] tabular-nums transition-ui cursor-pointer"
                  title={e.n ? e2s(e) : 'İşlem yok'}
                >
                  <span className="text-zinc-400 font-semibold">{label}</span>{' '}
                  <span className={`font-bold ${tone(e.expectancy)}`}>{e.n ? sR(e.expectancy) : '—'}</span>{' '}
                  <span className="text-zinc-600">({e.n})</span>
                </button>
              ))}
              {s.news.unknown > 0 && <span className="px-2 py-1.5 text-[11px] text-zinc-600">{s.news.unknown} işlemde girilmemiş</span>}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">News day girilmiş işlem yok.</p>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`${sectionTitle} text-cyan-300`}>
            <Clock size={12} /> İşlemde kalma süresi
          </span>
          {s.holding.n > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-[11px] tabular-nums">
              <span className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-zinc-400 font-semibold">Kazanan</span>{' '}
                <span className="font-bold text-emerald-300">{s.holding.winAvgMs !== null ? formatDuration(s.holding.winAvgMs) : '—'}</span>
              </span>
              <span className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-zinc-400 font-semibold">Kaybeden</span>{' '}
                <span className="font-bold text-rose-300">{s.holding.lossAvgMs !== null ? formatDuration(s.holding.lossAvgMs) : '—'}</span>
              </span>
              <span className="px-2 py-1.5 text-zinc-600">{s.holding.n} işlem</span>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">Çıkış saati girilmiş işlem yok.</p>
          )}
        </div>
      </div>

      {/* Kural kartı: kesinleşmiş bulgulardan "Al / Alma" kuralları; Alma kurallarında son 7 günün ihlalleri */}
      <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/70">
        <span className={`${sectionTitle} text-sky-300`}>
          <ShieldCheck size={12} /> Kurallarım
        </span>
        {s.rules.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {s.rules.slice(0, 10).map((r) => (
              <button
                key={`r:${r.kind}:${r.title}`}
                type="button"
                onClick={() => onShowTrades(r.title, trades.filter(r.match))}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-left hover:border-zinc-700 cursor-pointer transition-ui min-w-0"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${r.kind === 'TAKE' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-300 border-rose-500/30 bg-rose-500/10'}`}>
                    {r.kind === 'TAKE' ? 'AL' : 'ALMA'}
                  </span>
                  <span className="text-xs font-bold text-zinc-200 truncate">{r.title}</span>
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">
                  {(() => {
                    const since = ruleSince[ruleKey(r.kind, r.title)];
                    const after = since !== undefined ? trades.filter((t) => t.createdAt > since && r.match(t)) : [];
                    if (!after.length) return null;
                    const ar = after.reduce((sum, t) => sum + (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0), 0);
                    return (
                      <span className={`mr-1.5 ${ar >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} title="Kural oluştuktan sonraki işlemler: kuralın gerçekten işe yarayıp yaramadığı">
                        kural sonrası {after.length} işlem {sR(ar)} ·
                      </span>
                    );
                  })()}
                  {sR(r.edge.expectancy)} · {r.edge.n}
                  {r.recentViolations && r.recentViolations.n > 0 && (
                    <span className="ml-1.5 text-rose-300 font-bold">son 7 gün {r.recentViolations.n} ihlal ({sR(r.recentViolations.r)})</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">
            Henüz kesinleşmiş bulgu yok. Bir kurulum ya da alan "Kanıtlı Edge" (en az {EDGE_PROOF_MIN} işlem) veya kesin sızıntı olunca burada kurala dönüşür.
          </p>
        )}
      </div>

      {/* Güçlü / zayıf kombinasyonlar: iki giriş alanı birlikte, tek başlarına olduğundan belirgin farklı */}
      <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/70">
        <span className={`${sectionTitle} text-sky-300`}>
          <Compass size={12} /> Kombinasyonlar
        </span>
        <p className="text-[10px] text-zinc-500 -mt-1">
          İki giriş alanı birlikteyken, tek başlarına olduğundan en az {PAIR_MIN_LIFT}R/işlem daha iyi ya da kötü olan birleşimler (en az {SETUP_MIN_SAMPLE * 2} işlem).
        </p>
        {s.bestPairs.length || s.worstPairs.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...s.bestPairs, ...s.worstPairs].map((p) => (
              <InsightRow
                key={`p:${p.title}`}
                title={p.title}
                sub={`tek başına göre ${p.lift > 0 ? '+' : ''}${fmt(p.lift)}R/işlem`}
                edge={p.edge}
                onClick={() => onShowTrades(p.title, trades.filter((t) => dimensionValue(t, p.dims[0]) === p.values[0] && dimensionValue(t, p.dims[1]) === p.values[1]))}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">Henüz en az {SETUP_MIN_SAMPLE * 2} işlemli, belirgin fark yaratan bir birleşim yok.</p>
        )}
      </div>

      {/* Yönetim edge'i: girişten sonra belirlenen alanlar (giriş önerilerinden ayrı) */}
      <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/70">
        <span className={`${sectionTitle} text-sky-300`}>
          <Clock size={12} /> Yönetim edge'i
        </span>
        <p className="text-[10px] text-zinc-500 -mt-1">
          İşlem yönetimi, çıkış sonrası TP ve işlem süresi: işleme girdikten sonra belirlenir, bu yüzden giriş önerilerine karışmaz. Süre sonucun bir parçasıdır (kaybedenler stop'a hızlı değebilir); neden değil, ipucu olarak oku.
        </p>
        {s.managementSlices.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {s.managementSlices.slice(0, 6).map((x) => (
              <InsightRow key={`m:${x.dimension}:${x.value}`} title={`${x.dimensionLabel}: ${x.value}`} edge={x.edge} onClick={() => onShowTrades(`${x.dimensionLabel}: ${x.value}`, sliceTrades(x))} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">En az {SETUP_MIN_SAMPLE} işlemli yönetim verisi yok.</p>
        )}
        {s.missed.n > 0 && (
          <p className="text-[11px] text-zinc-400">
            Çıkıştan sonra TP'ye giden {s.missed.n} işlem
            {s.missed.measured > 0 && <> · yönetimle kaçırılan <span className="font-bold text-rose-300 tabular-nums">{s.missed.missedR.toFixed(2)}R</span></>}
            {s.missed.measured < s.missed.n && <> ({s.missed.n - s.missed.measured} işlemde TP / Stop pip eksik)</>}
          </p>
        )}
      </div>

      {/* Hedefe ulaşma süresi: kazananların girişten çıkışa süresi → zaman stop'u */}
      <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/70">
        <span className={`${sectionTitle} text-sky-300`}>
          <Clock size={12} /> Hedefe ulaşma süresi
        </span>
        {s.timeToTarget.overall ? (
          <>
            <p className="text-[10px] text-zinc-500 -mt-1">
              Kazananların %90'ı bu sürede sonuçlanıyor; işlem bu süreyi geçtiyse hedefe gitme olasılığı düşer (zaman stop'u için ipucu).
            </p>
            <div className="flex flex-col gap-1">
              {[s.timeToTarget.overall, ...s.timeToTarget.setups].map((r) => (
                <div key={`ttt:${r.title}`} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-1.5 text-[11px] tabular-nums min-w-0">
                  <span className="font-bold text-zinc-200 truncate">{r.title}</span>
                  <span className="shrink-0 text-zinc-400">
                    medyan <b className="text-zinc-200">{formatDuration(r.medianMs)}</b> · %90 <b className="text-sky-300">{formatDuration(r.p90Ms)}</b>
                    {r.loserMedianMs !== null && <> · kaybeden <b className="text-rose-300">{formatDuration(r.loserMedianMs)}</b></>}
                    <span className="text-zinc-600"> · {r.winners} kazanan</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-zinc-500">Çıkış saati girilmiş en az 3 kazanan işlem gerekli.</p>
        )}
      </div>
    </section>
  );
});

/* ---------- Disiplin ---------- */
function RuleRow({ r, onClick }: { r: RuleResult; onClick: () => void }) {
  const muted = !r.measurable || r.violations === 0;
  return (
    <button
      type="button"
      disabled={!r.measurable || r.violations === 0}
      onClick={onClick}
      title={r.hint}
      className={`group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-ui ${
        muted ? 'border-zinc-800/60 bg-transparent cursor-default' : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-semibold truncate ${muted ? 'text-zinc-500' : 'text-zinc-200'}`}>{r.title}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums truncate">
          {!r.measurable
            ? 'Ölçmek için veri yok'
            : r.violations === 0
              ? 'İhlal yok'
              : `${r.violations} ihlal · %${fmt(r.violationEdge.winRate, 0)} kazanma · uysaydın ${sR(r.withoutExpectancy)}/işlem`}
        </div>
      </div>
      {r.measurable && r.violations > 0 && (
        <>
          <div className={`text-sm font-bold tabular-nums shrink-0 ${tone(r.costR)}`}>{sR(r.costR, 1)}</div>
          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors" />
        </>
      )}
    </button>
  );
}

export const DisciplineCard = React.memo(function DisciplineCard({ trades, onShowTrades }: { trades: Trade[]; onShowTrades: ShowTrades }) {
  // Kurallar sabit: günde en fazla 2 işlem, günlük stop −2R (ayar yok)
  const rep = useMemo(() => analyzeDiscipline(trades), [trades]);
  const delta = rep.allRulesNetR - rep.actualNetR;
  const byId = new Map(trades.map((t) => [t.id, t]));

  return (
    <section className={card} aria-label="Disiplin ve kural simülasyonu">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 flex items-center justify-center shrink-0">
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-100">Disiplin</h3>
            <p className="text-[11px] text-zinc-500">Kural ihlalleri ve "uysaydın" simülasyonu</p>
          </div>
        </div>
        <span className="shrink-0 px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950/40 text-[10px] font-semibold text-zinc-400" title="Günlük işlem sınırı">
          Günde en fazla {rep.options.maxTradesPerDay} işlem
        </span>
      </header>


      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{smartUpper("Temiz işlem")}</div>
          <div className="text-lg font-bold tabular-nums text-zinc-100 leading-tight mt-0.5">%{fmt(rep.cleanRate, 0)}</div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full ${rep.cleanRate >= 75 ? 'bg-emerald-500' : rep.cleanRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.max(2, rep.cleanRate)}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 tabular-nums">
            temiz {sR(rep.cleanEdge.expectancy)} · ihlalli {rep.violatingEdge.n ? sR(rep.violatingEdge.expectancy) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kurallara uysaydın</div>
          <div className={`text-lg font-bold tabular-nums leading-tight mt-0.5 ${tone(rep.allRulesNetR)}`}>{sR(rep.allRulesNetR, 1)}</div>
          <div className="text-[10px] text-zinc-500 mt-1 tabular-nums">
            şu an {sR(rep.actualNetR, 1)} ·{' '}
            <span className={`font-semibold ${tone(delta)}`}>{delta === 0 ? 'fark yok' : `${delta > 0 ? '+' : ''}${fmt(delta, 1)}R fark`}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rep.rules.map((r) => (
          <RuleRow
            key={r.id}
            r={r}
            onClick={() => onShowTrades(`Kural ihlali: ${r.title}`, r.tradeIds.map((id) => byId.get(id)).filter((t): t is Trade => !!t))}
          />
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 flex items-start gap-1.5">
        <Info size={11} className="shrink-0 mt-px" />
        "Uysaydın" geçmişe dönük bir simülasyondur: ihlalli işlemler hiç açılmasaydı ne olurdu. Az örneklemde dikkatli yorumla.
      </p>
    </section>
  );
});
