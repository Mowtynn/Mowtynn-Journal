import React, { useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import { Trade } from '../../types';
import { computeTargetReach, simulateFixedTp, simulateStopFactor, SimRow } from '../../lib/asiaAnalytics';

/**
 * MAE / MFE tabanlı karar araçları (MAE, MFE & Stop sekmesi):
 * hedefe ulaşma dağılımı, TP simülatörü ve stop daraltma simülatörü.
 */

const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
    <div className="border-b border-zinc-800 pb-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-sans">{smartUpper(title)}</h4>
      {hint && <p className="text-[10px] text-zinc-500 font-sans mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-[11px] text-zinc-500 font-sans py-2">{text}</p>;

export const SimTable: React.FC<{ rows: SimRow[] }> = ({ rows }) => (
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

export const ExcursionSimulators = React.memo(function ExcursionSimulators({ trades }: { trades: Trade[] }) {
  const reach = useMemo(() => computeTargetReach(trades), [trades]);
  const tpSim = useMemo(() => simulateFixedTp(trades), [trades]);
  const stopSim = useMemo(() => simulateStopFactor(trades), [trades]);

  return (
    <div className="space-y-4">
      <Card title="Hedefe Ulaşma Dağılımı" hint="MFE / TP mesafesi: fiyat TP'ye (karşı Asia ucuna) giden yolun ne kadarını katetti?">
        {reach ? (
          <div className="space-y-1.5">
            {reach.buckets.map((b) => (
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
            <p className="text-[10px] text-zinc-500 font-sans pt-1">
              {reach.usable} işlemde TP ve MFE var; hedefe ulaşma oranı %{reach.reachedPct}.
            </p>
          </div>
        ) : (
          <Empty text="TP ve MFE girilmiş işlem yok." />
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card
          title="TP Simülatörü"
          hint="Kayıtlı MFE ile 'şu R'da kapatsaydım ne olurdu' sorusunu cevaplar. Varsayım: MFE, orijinal çıkıştan önce ölçüldü. Karşılaştırma aynı işlem alt kümesi üzerinde yapılır."
        >
          {tpSim.rows.length === 0 ? <Empty text="Stop ve MFE girilmiş işlem yok." /> : <SimTable rows={tpSim.rows} />}
        </Card>

        <Card
          title="Stop Daraltma Simülatörü"
          hint="Kayıtlı MAE ile stopu daraltsaydın hangi işlemler erken stop olurdu? Spread ve slipaj hesaba katılmaz; gerçek hayatta sonuçlar biraz daha kötü olur."
        >
          {stopSim.rows.length === 0 ? <Empty text="Stop ve MAE girilmiş işlem yok." /> : <SimTable rows={stopSim.rows} />}
        </Card>
      </div>
    </div>
  );
});
