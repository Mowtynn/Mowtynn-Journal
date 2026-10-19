import React, { useMemo, useState } from 'react';
import { Trade } from '../types';
import {
  analyzeAsia,
  AsiaLabResult,
  DatasetKey,
  DATASET_LABELS,
  EdgeStats,
  GroupRow,
  listPairs,
  SimRow,
} from '../lib/asiaAnalytics';
import { BiasAlignment } from '../lib/tradingTime';

interface AsiaEdgeLabProps {
  trades: Trade[];
}

const BIAS_LABELS: Record<BiasAlignment, string> = {
  ALIGNED: 'Bias ile uyumlu',
  COUNTER: 'Bias’a ters',
  NEUTRAL: 'Bias nötr',
  UNKNOWN: 'Bias girilmemiş',
};

const EXIT_LABELS: Record<string, string> = {
  TP: 'Hedef (karşı Asia ucu)',
  SL: 'Stop',
  BE: 'Başabaş',
  MANUAL: 'Manuel kapanış',
  TIME: 'Zaman / hafta sonu kapanışı',
};

const signed = (v: number, digits = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
    <div className="border-b border-zinc-800 pb-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-sans">{title}</h4>
      {hint && <p className="text-[10px] text-zinc-500 font-sans mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[11px] text-zinc-500 font-sans py-2">{text}</p>
);

const GroupTable: React.FC<{
  rows: Array<{ label: string; stats: EdgeStats }>;
  minSample: number;
  empty: string;
}> = ({ rows, minSample, empty }) => {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-sans">
        <thead>
          <tr className="text-[10px] uppercase text-zinc-500 text-right">
            <th className="text-left font-medium pb-1.5">Grup</th>
            <th className="font-medium pb-1.5">İşlem</th>
            <th className="font-medium pb-1.5">WR %</th>
            <th className="font-medium pb-1.5">Beklenti (R)</th>
            <th className="font-medium pb-1.5">%95 Aralık</th>
            <th className="font-medium pb-1.5">PF</th>
            <th className="font-medium pb-1.5">Net R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const small = r.stats.n < minSample;
            return (
              <tr key={r.label} className={`border-t border-zinc-800/70 text-right ${small ? 'opacity-50' : ''}`}>
                <td className="text-left py-1.5 pr-2 text-zinc-200 font-medium">{r.label}</td>
                <td className="py-1.5 text-zinc-300">{r.stats.n}</td>
                <td className="py-1.5 text-zinc-300">{r.stats.winRate}</td>
                <td className={`py-1.5 font-bold ${tone(r.stats.expectancy)}`}>{signed(r.stats.expectancy)}</td>
                <td className="py-1.5 text-zinc-500 font-mono text-[10px]">
                  {signed(r.stats.expLo, 2)} / {signed(r.stats.expHi, 2)}
                </td>
                <td className="py-1.5 text-zinc-300">{r.stats.profitFactor >= 999 ? '∞' : r.stats.profitFactor}</td>
                <td className={`py-1.5 ${tone(r.stats.netR)}`}>{signed(r.stats.netR)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const toRows = (rows: GroupRow[]) => rows.map((r) => ({ label: r.key, stats: r.stats }));

const SimTable: React.FC<{ rows: SimRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs font-sans">
      <thead>
        <tr className="text-[10px] uppercase text-zinc-500 text-right">
          <th className="text-left font-medium pb-1.5">Senaryo</th>
          <th className="font-medium pb-1.5">İşlem</th>
          <th className="font-medium pb-1.5">WR %</th>
          <th className="font-medium pb-1.5">Beklenti (R)</th>
          <th className="font-medium pb-1.5">Fark</th>
          <th className="font-medium pb-1.5">Net R</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} className={`border-t border-zinc-800/70 text-right ${i === 0 ? 'bg-zinc-900/60' : ''}`}>
            <td className="text-left py-1.5 pr-2 text-zinc-200 font-medium">{r.label}</td>
            <td className="py-1.5 text-zinc-300">{r.n}</td>
            <td className="py-1.5 text-zinc-300">{r.winRate}</td>
            <td className={`py-1.5 font-bold ${tone(r.expectancy)}`}>{signed(r.expectancy)}</td>
            <td className={`py-1.5 ${i === 0 ? 'text-zinc-600' : tone(r.deltaVsActual)}`}>{i === 0 ? '—' : signed(r.deltaVsActual)}</td>
            <td className={`py-1.5 ${tone(r.netR)}`}>{signed(r.netR)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const verdict = (e: EdgeStats): { text: string; cls: string } => {
  if (e.n === 0) return { text: 'Seçili filtrede işlem yok.', cls: 'text-zinc-500' };
  if (e.n < 30) {
    return {
      text: `${e.n} işlem: örneklem henüz küçük. Beklenti ${signed(e.expectancy)}R görünse de güven aralığı geniş; karar için en az 30, tercihen 100 işlem biriktir.`,
      cls: 'text-zinc-300',
    };
  }
  if (e.expLo > 0) {
    return { text: `Beklenti %95 güvenle pozitif (alt sınır ${signed(e.expLo)}R). Edge istatistiksel olarak destekleniyor.`, cls: 'text-emerald-400' };
  }
  if (e.expHi < 0) {
    return { text: `Beklenti %95 güvenle negatif (üst sınır ${signed(e.expHi)}R). Bu veriyle strateji para kaybettiriyor.`, cls: 'text-rose-400' };
  }
  return {
    text: `Edge henüz kanıtlanmadı: aralık sıfırı kapsıyor (${signed(e.expLo)}R … ${signed(e.expHi)}R).${e.tradesNeeded ? ` Mevcut ortalama ve dağılımla ~${e.tradesNeeded} işlem daha gerekir.` : ''}`,
    cls: 'text-zinc-300',
  };
};

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
        Son 20 işlemlik ortalama R: <span className={tone(last.expectancy)}>{signed(last.expectancy)}</span> ({last.date}). Çizgi sıfırın altında kalıcı olarak kalıyorsa edge aşınıyor olabilir.
      </p>
    </div>
  );
};

export const AsiaEdgeLab = React.memo(function AsiaEdgeLab({ trades }: AsiaEdgeLabProps) {
  const [dataset, setDataset] = useState<DatasetKey>('ALL');
  const [pair, setPair] = useState<string>('ALL');
  const [minSample, setMinSample] = useState<number>(8);

  const pairs = useMemo(() => listPairs(trades), [trades]);
  const r = useMemo(() => analyzeAsia(trades, { dataset, pair, minSample }), [trades, dataset, pair, minSample]);
  const v = verdict(r.overall);

  const pairRows = r.pairs.map((p) => ({ label: p.key, stats: p.stats }));
  const sparseHourPair = r.hourPair.hours.length > 0 && r.hourPair.pairs.length > 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(DATASET_LABELS) as DatasetKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDataset(k)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-sans border transition-colors ${
                dataset === k ? 'bg-zinc-800 text-zinc-100 border-zinc-600' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
            >
              {DATASET_LABELS[k]}
            </button>
          ))}
        </div>
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 px-2 py-1.5 font-sans"
          aria-label="Parite filtresi"
        >
          <option value="ALL">Tüm Pariteler</option>
          {pairs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-sans">
          Min. örneklem
          <select
            value={minSample}
            onChange={(e) => setMinSample(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 px-2 py-1.5"
          >
            {[3, 5, 8, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[10px] text-zinc-500 font-sans ml-auto">Saatler New York zamanına göre</span>
      </div>

      {/* Summary */}
      <Card title="Edge Özeti" hint="Beklenti = işlem başına ortalama R. Güven aralığı küçük örneklemde ne kadar emin olamayacağını gösterir.">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { l: 'İşlem', val: String(r.overall.n), c: 'text-zinc-100' },
            { l: 'Win Rate', val: `%${r.overall.winRate}`, sub: `%${r.overall.wrLo} – %${r.overall.wrHi}`, c: 'text-zinc-100' },
            { l: 'Beklenti', val: `${signed(r.overall.expectancy)} R`, sub: `${signed(r.overall.expLo)} / ${signed(r.overall.expHi)}`, c: tone(r.overall.expectancy) },
            { l: 'Net R', val: `${signed(r.overall.netR)} R`, c: tone(r.overall.netR) },
            { l: 'Profit Factor', val: r.overall.profitFactor >= 999 ? '∞' : String(r.overall.profitFactor), c: 'text-zinc-100' },
            { l: 'Maks. DD', val: `${r.overall.maxDrawdownR} R`, sub: `Şu an ${r.overall.currentDrawdownR} R`, c: 'text-zinc-100' },
            { l: 'P(Edge > 0)', val: `%${r.overall.pPositive}`, sub: 'yaklaşık', c: 'text-zinc-100' },
          ].map((c) => (
            <div key={c.l} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
              <span className="text-[10px] text-zinc-500 block font-sans uppercase">{c.l}</span>
              <span className={`text-sm font-bold font-sans ${c.c}`}>{c.val}</span>
              {c.sub && <span className="text-[10px] text-zinc-500 block font-mono">{c.sub}</span>}
            </div>
          ))}
        </div>
        <p className={`text-xs font-sans leading-relaxed ${v.cls}`}>{v.text}</p>
      </Card>

      {r.overall.n === 0 ? null : (
        <>
          <Card title="Veri Eksiği Panosu" hint="Hangi alanı doldurmazsan hangi analiz çalışmıyor. Yüzde düşükse o analiz güvenilmez.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {r.coverage.map((c) => (
                <div key={c.field} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-zinc-200 font-medium">{c.label}</span>
                    <span className={c.pct >= 80 ? 'text-emerald-400' : c.pct >= 40 ? 'text-zinc-300' : 'text-rose-400'}>
                      %{c.pct} <span className="text-zinc-600">({c.filled}/{r.overall.n})</span>
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Parite Bazında Edge & Spread" hint="Spread maliyeti = ortalama spread / stop (R cinsinden). Yüksek maliyetli paritede aynı beklenti daha az değerlidir.">
              <GroupTable rows={pairRows} minSample={minSample} empty="Parite verisi yok." />
              {r.pairs.some((p) => p.avgSpreadPips !== null) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.pairs.map((p) =>
                    p.avgSpreadPips === null ? null : (
                      <span key={p.key} className="text-[10px] font-sans text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
                        {p.key}: {p.avgSpreadPips} pip{p.spreadCostR !== null ? ` · ${p.spreadCostR} R/işlem` : ''}
                      </span>
                    ),
                  )}
                </div>
              )}
            </Card>

            <Card title="Giriş Saati (NY)" hint="Hesaplanan saat, işlemin tarihinden New York’a çevrilir; elle seçtiğin giriş saati varsa o kullanılır.">
              <GroupTable rows={toRows(r.hours)} minSample={minSample} empty="Saat verisi yok." />
            </Card>
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="1H/4H Bias Uyumu" hint="Bias’ı kaydet ama girişe karar verdirme: önce bu tablo bias’ın gerçekten fark yaratıp yaratmadığını göstersin.">
              <GroupTable
                rows={r.bias.map((b) => ({ label: BIAS_LABELS[b.key], stats: b.stats }))}
                minSample={minSample}
                empty="Bias girilmiş işlem yok. İşlem formundaki 'Bias' alanını doldur."
              />
            </Card>

            <Card title="Süpürülen Taraf (Asia High / Low)">
              <GroupTable rows={toRows(r.sweepSide)} minSample={minSample} empty="Veri yok." />
            </Card>

            <Card title="PD Array Zaman Dilimi (1H / 4H / D)">
              <GroupTable rows={toRows(r.pdTimeframe)} minSample={minSample} empty="PD array zaman dilimi girilmemiş." />
            </Card>

            <Card title="PD Array Türü (FVG / OB …)">
              <GroupTable rows={toRows(r.pdType)} minSample={minSample} empty="PD array türü girilmemiş." />
            </Card>

            <Card title="Likidite Seviyesi (PDH/PDL, PWH/PWL, PMH/PML …)">
              <GroupTable rows={toRows(r.levels)} minSample={minSample} empty="Likidite seviyesi girilmemiş." />
            </Card>

            <Card title="Giriş Modeli">
              <GroupTable rows={toRows(r.entryModels)} minSample={minSample} empty="Giriş modeli girilmemiş." />
            </Card>

            <Card title="Asia Range Büyüklüğü (parite medyanına göre)" hint="Her parite kendi medyanıyla kıyaslanır; EURCAD ve EURUSD aynı pip eşiğiyle yargılanmaz.">
              <GroupTable rows={r.rangeSize.map((x) => ({ label: x.label, stats: x.stats }))} minSample={minSample} empty="Asia range (pip) girilmemiş." />
            </Card>

            <Card title="Gün (NY)">
              <GroupTable rows={r.weekdays.filter((d) => d.stats.n > 0).map((d) => ({ label: d.day, stats: d.stats }))} minSample={minSample} empty="Veri yok." />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Hedefe Ulaşma Dağılımı" hint="MFE / TP mesafesi: fiyat karşı Asia ucuna giden yolun ne kadarını katetti?">
              {r.targetReach ? (
                <div className="space-y-1.5">
                  {r.targetReach.buckets.map((b) => (
                    <div key={b.label} className="text-xs font-sans">
                      <div className="flex justify-between text-zinc-300">
                        <span>{b.label}</span>
                        <span className="text-zinc-500">
                          {b.count} işlem · %{b.pct}
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded mt-1">
                        <div className="h-1 bg-zinc-500 rounded" style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-zinc-500 font-sans pt-1">{r.targetReach.usable} işlemde TP ve MFE var; hedefe ulaşma oranı %{r.targetReach.reachedPct}.</p>
                </div>
              ) : (
                <Empty text="TP ve MFE girilmiş işlem yok." />
              )}
            </Card>

            <Card title="Çıkış Nedeni">
              <GroupTable rows={r.exitReasons.map((x) => ({ label: EXIT_LABELS[x.key] || x.key, stats: x.stats }))} minSample={1} empty="Çıkış nedeni girilmemiş." />
            </Card>
          </div>

          <Card
            title="TP Simülatörü"
            hint="Kayıtlı MFE ile 'şu R’da kapatsaydım ne olurdu' sorusunu cevaplar. Varsayım: MFE, orijinal çıkıştan önce ölçüldü. Karşılaştırma aynı işlem alt kümesi üzerinde yapılır."
          >
            {r.tpSim.rows.length === 0 ? <Empty text="Stop ve MFE girilmiş işlem yok." /> : <SimTable rows={r.tpSim.rows} />}
          </Card>

          <Card
            title="Stop Daraltma Simülatörü"
            hint="Kayıtlı MAE ile stopu daraltsaydın hangi işlemler erken stop olurdu? Spread ve slipaj hesaba katılmaz; gerçek hayatta sonuçlar biraz daha kötü olur."
          >
            {r.stopSim.rows.length === 0 ? <Empty text="Stop ve MAE girilmiş işlem yok." /> : <SimTable rows={r.stopSim.rows} />}
          </Card>

          <Card
            title="Kombinasyon Bulucu"
            hint="İki faktörlü gruplar, güven aralığı alt sınırına göre sıralanır. Çok sayıda kombinasyon denendiği için rastlantısal 'parlak' sonuçlar çıkar: bulduğunu yeni veride (live-test) doğrulamadan kural yapma."
          >
            {r.combos.length === 0 ? (
              <Empty text={`En az ${Math.max(3, minSample)} işlemlik kombinasyon yok.`} />
            ) : (
              <GroupTable rows={r.combos.map((c) => ({ label: c.label, stats: c.stats }))} minSample={minSample} empty="" />
            )}
          </Card>

          <Card title="Kayan Beklenti (20 işlem)" hint="Edge zamanla sağlam mı, aşınıyor mu?">
            <Sparkline points={r.rolling} />
          </Card>
        </>
      )}
    </div>
  );
});

export default AsiaEdgeLab;
