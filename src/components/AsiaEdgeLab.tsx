import React, { useMemo, useState } from 'react';
import { smartUpper } from '../constants/constants';
import { FilterChip, FILTER_LABEL, FILTER_SELECT } from './filters/FilterControls';
import { Trade } from '../types';
import { MIN_SAMPLE } from '../lib/sampleSize';
import { formatDateKey, formatR, formatRAbs, signed } from '../lib/format';
import {
  analyzeAsia,
  AsiaLabResult,
  DatasetKey,
  DATASET_LABELS,
  listPairs,
} from '../lib/asiaAnalytics';
import { useNewsDayLabels } from '../hooks/useNewsDayLabels';

interface AsiaEdgeLabProps {
  trades: Trade[];
}

const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');

const Card: React.FC<{ title: string; hint?: string; className?: string; children: React.ReactNode }> = ({ title, hint, className = '', children }) => (
  <div className={`bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3 ${className}`}>
    <div className="border-b border-zinc-800 pb-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-sans">{smartUpper(title)}</h4>
      {hint && <p className="text-[10px] text-zinc-500 font-sans mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[11px] text-zinc-500 font-sans py-2">{text}</p>
);

const Sparkline: React.FC<{ points: AsiaLabResult['rolling'] }> = ({ points }) => {
  if (points.length < 2) return <Empty text="Kayan beklenti için en az 21 işlem gerekir (20 işlemlik pencere)." />;
  const w = 600;
  const h = 90;
  const vals = points.map((p) => p.expectancy);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 6 - ((v - min) / span) * (h - 12);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.expectancy).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <div className="space-y-1.5">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none" role="img" aria-label="20 işlemlik kayan beklenti">
        <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="#3f3f46" strokeDasharray="4 4" strokeWidth="1" />
        <path d={path} fill="none" stroke="#a1a1aa" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-[10px] text-zinc-500 font-sans">
        Son 20 işlemlik ortalama R: <span className={`font-bold tabular-nums ${tone(last.expectancy)}`}>{formatR(last.expectancy)}</span> ({formatDateKey(last.date)}). Çizgi sıfırın altında kalıcı olarak kalıyorsa edge aşınıyor olabilir.
      </p>
    </div>
  );
};

export const AsiaEdgeLab = React.memo(function AsiaEdgeLab({ trades }: AsiaEdgeLabProps) {
  const [dataset, setDataset] = useState<DatasetKey>('ALL');
  const [pair, setPair] = useState<string>('ALL');
  // Varsayılan eşik proje genelindeki tek örneklem eşiğiyle aynı (lib/sampleSize)
  const [minSample, setMinSample] = useState<number>(MIN_SAMPLE);

  const pairs = useMemo(() => listPairs(trades), [trades]);
  const { version: newsVersion } = useNewsDayLabels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const r = useMemo(() => analyzeAsia(trades, { dataset, pair, minSample }), [trades, dataset, pair, minSample, newsVersion]);

  const sparseHourPair = r.hourPair.hours.length > 0 && r.hourPair.pairs.length > 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(DATASET_LABELS) as DatasetKey[]).map((k) => (
            <FilterChip key={k} check={false} tone={k === 'ALL' ? 'neutral' : 'brand'} active={dataset === k} onClick={() => setDataset(k)}>
              {DATASET_LABELS[k]}
            </FilterChip>
          ))}
        </div>
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className={FILTER_SELECT}
          aria-label="Parite filtresi"
        >
          <option value="ALL">Tüm Pariteler</option>
          {pairs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className={`flex items-center gap-1.5 ${FILTER_LABEL}`}>
          Min. Örneklem
          <select
            value={minSample}
            onChange={(e) => setMinSample(Number(e.target.value))}
            className={FILTER_SELECT}
          >
            {[5, 8, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {r.overall.n === 0 ? (
        <Empty text="Bu filtrelerle işlem yok." />
      ) : (
        <>
          {/* Önce eğilim ve yönetim maliyeti yan yana, sonra ısı tablosu; veri eksiği panosu (bakım aracı) en sonda */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <Card className={r.missedByManagement.n > 0 ? '' : 'lg:col-span-2'} title="Kayan Beklenti (20 işlem)" hint="Edge zamanla sağlam mı, aşınıyor mu?">
              <Sparkline points={r.rolling} />
            </Card>

            {r.missedByManagement.n > 0 && (
              <Card title="Yönetimle Kaçırılan R" hint="Erken kapatıp ardından TP'ye giden işlemler: yönetim kararının maliyeti.">
                {/* Rakam önde: kart yandaki grafikle aynı boyda, boş kalmasın */}
                {r.missedByManagement.measured > 0 && (
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-rose-300">{formatRAbs(r.missedByManagement.missedR)}</span>
                    <span className="text-[11px] text-zinc-500 font-sans">kaçırıldı</span>
                  </p>
                )}
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Çıkıştan sonra TP'ye giden {r.missedByManagement.n} işlem
                  {r.missedByManagement.measured > 0 && <> · işlem başına ortalama <span className="font-bold tabular-nums text-zinc-200">{formatRAbs(r.missedByManagement.missedR / r.missedByManagement.measured)}</span></>}
                  {r.missedByManagement.measured < r.missedByManagement.n && <> ({r.missedByManagement.n - r.missedByManagement.measured} işlemde TP / Stop Pip eksik)</>}
                </p>
              </Card>
            )}
          </div>

          <Card title="Saat × Parite Isı Tablosu" hint="Hücre: beklenti (R) ve işlem sayısı. Soluk hücreler minimum örneklemin altındadır; onlara göre karar verme.">
            {!sparseHourPair ? (
              <Empty text="Yeterli veri yok." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="text-[10px] uppercase text-zinc-500">
                      <th className="text-left font-medium pb-1.5">Saat</th>
                      {r.hourPair.pairs.map((p) => (
                        <th key={p} className="font-medium pb-1.5 text-center">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.hourPair.hours.map((h) => (
                      <tr key={h} className="border-t border-zinc-800/70">
                        <td className="py-1.5 pr-2 text-zinc-300 font-mono text-[11px]">{h}</td>
                        {r.hourPair.pairs.map((p) => {
                          const c = r.hourPair.cells[`${h}|${p}`];
                          if (!c) return <td key={p} className="text-center text-zinc-700">·</td>;
                          return (
                            <td key={p} className={`text-center py-1.5 ${c.n < minSample ? 'opacity-40' : ''}`}>
                              <span className={`font-bold ${tone(c.expectancy)}`}>{signed(c.expectancy)}</span>
                              <span className="text-[10px] text-zinc-500"> ({c.n})</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Veri Eksiği Panosu" hint="Hangi alanı doldurmazsan hangi analiz çalışmıyor. Yüzde düşükse o analiz güvenilmez.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {r.coverage.filter((c) => c.base > 0).map((c) => (
                <div key={c.field} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-zinc-200 font-medium">{c.label}</span>
                    <span className={c.pct >= 80 ? 'text-emerald-400' : c.pct >= 40 ? 'text-zinc-300' : 'text-rose-400'}>
                      %{c.pct} <span className="text-zinc-600">({c.filled}/{c.base})</span>
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded mt-1.5">
                    <div className="h-1 bg-zinc-500 rounded" style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 block mt-1">{c.unlocks}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
});

