import React, { useMemo } from 'react';
import { CalendarRange, TrendingDown } from 'lucide-react';
import { Trade } from '../../types';
import { smartUpper } from '../../constants/constants';
import { byEntryTime } from '../../lib/tradeModel';
import { edgeOfTrades, indexTradeOrder, DD_BUCKETS, STREAK_BUCKETS, type EdgeStats } from '../../lib/asiaAnalytics';
import { dimensionValue, dimensionLabel, UNSPECIFIED, type SetupDimension } from '../../lib/setupScorecard';
import { computeSameDayStats } from '../../lib/dayAnalytics';
import { MIN_SAMPLE } from '../../lib/sampleSize';
import { fixed, formatR, rnum } from '../../lib/format';

const tone = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-300');

const Card: React.FC<{ icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }> = ({ icon, title, hint, children }) => (
  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
    <div className="border-b border-zinc-800 pb-2.5">
      <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider flex items-center gap-2">
        {icon}
        {smartUpper(title)}
      </h4>
      <p className="text-label text-zinc-500 font-sans mt-1 leading-relaxed">{hint}</p>
    </div>
    {children}
  </div>
);

/** Grup ↔ aynı alandaki diğer gruplar: fark %95 güvenle gerçek mi (Welch z) */
const Badge: React.FC<{ e: EdgeStats; z: number }> = ({ e, z }) => {
  const base = 'px-1.5 py-px rounded border text-label font-bold uppercase whitespace-nowrap';
  if (e.n < MIN_SAMPLE) return <span className={`${base} border-zinc-700 bg-zinc-900 text-zinc-400`}>Az Veri</span>;
  if (z <= -1.96) return <span className={`${base} border-rose-500/40 bg-rose-500/15 text-rose-300`}>Belirgin Kötü</span>;
  if (z >= 1.96) return <span className={`${base} border-emerald-500/40 bg-emerald-500/15 text-emerald-300`}>Belirgin İyi</span>;
  return <span className={`${base} border-zinc-700 bg-zinc-900 text-zinc-400`}>Fark Kesin Değil</span>;
};

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
function welchZ(a: Trade[], b: Trade[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const m = (l: Trade[]) => l.reduce((s, t) => s + rOf(t), 0) / l.length;
  const v = (l: Trade[], mu: number) => l.reduce((s, t) => s + (rOf(t) - mu) ** 2, 0) / (l.length - 1);
  const ma = m(a);
  const mb = m(b);
  const se = Math.sqrt(v(a, ma) / a.length + v(b, mb) / b.length);
  return se > 0 ? (ma - mb) / se : 0;
}

const STATE_DIMS: Array<{ dim: SetupDimension; order: readonly string[] }> = [
  { dim: 'streakBefore', order: STREAK_BUCKETS },
  { dim: 'ddState', order: DD_BUCKETS },
];

/** Seri ve hesap durumu: kayıp serisinden sonra / düşüşteyken edge değişiyor mu? */
export const StateCard = React.memo(function StateCard({ trades, onShowTrades }: { trades: Trade[]; onShowTrades: (title: string, list: Trade[]) => void }) {
  const groups = useMemo(() => {
    const sorted = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr)).sort(byEntryTime);
    indexTradeOrder(sorted);
    return STATE_DIMS.map(({ dim, order }) => {
      const by = new Map<string, Trade[]>();
      for (const t of sorted) {
        const v = dimensionValue(t, dim);
        if (v === UNSPECIFIED) continue;
        (by.get(v) || by.set(v, []).get(v)!).push(t);
      }
      const rows = order
        .filter((v) => by.has(v))
        .map((v) => {
          const list = by.get(v)!;
          const rest = [...by.entries()].filter(([k]) => k !== v).flatMap(([, l]) => l);
          return { value: v, list, edge: edgeOfTrades(list), z: welchZ(list, rest) };
        });
      return { dim, label: dimensionLabel(dim), rows };
    });
  }, [trades]);

  return (
    <Card
      icon={<TrendingDown size={15} className="text-blue-400" />}
      title="Seri ve Hesap Durumuna Göre"
      hint="Her işlem, açıldığı andaki duruma göre gruplanır: önceki sonuçların serisi (gün fark etmeksizin; BE seriyi bozmaz) ve kümülatif R'ın zirveden uzaklığı. Rozet grubu aynı alandaki diğer gruplarla kıyaslar: kayıp serisinden sonra ya da düşüşteyken rozet “Belirgin Kötü” ise mola / risk azaltma kuralı veriye dayanır. Satıra tıkla: işlemler."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {groups.map((g) => (
          <div key={g.dim} className="space-y-1.5">
            <span className="text-label uppercase tracking-wider text-zinc-500 font-bold block">{g.label}</span>
            {g.rows.length === 0 ? (
              <p className="text-label text-zinc-500">İşlem yok.</p>
            ) : (
              g.rows.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onShowTrades(`${g.label}: ${r.value}`, r.list)}
                  className="w-full text-left flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900 hover:bg-zinc-800/70 px-3 py-2 transition-ui cursor-pointer"
                >
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-2 min-w-0">
                    <span className="truncate">{r.value}</span>
                    <Badge e={r.edge} z={r.z} />
                  </span>
                  <span className="text-label text-zinc-500 tabular-nums">
                    <span className={`text-xs font-bold ${tone(r.edge.expectancy)}`}>{formatR(r.edge.expectancy)}</span>/işlem · {r.edge.n} işlem · %{fixed(r.edge.winRate, 0)}
                    {r.edge.n > 1 && <span className="hidden sm:inline"> · %95: {rnum(r.edge.expLo)} – {rnum(r.edge.expHi)}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </Card>
  );
});

/** Aynı gün çoklu işlem: aynı gün açılan işlemler birlikte mi kazanıp kaybediyor; çok işlemli günler iyi mi? */
export const SameDayCard = React.memo(function SameDayCard({ trades }: { trades: Trade[] }) {
  const s = useMemo(() => computeSameDayStats(trades), [trades]);
  if (!s.total) return null;
  const corr = s.correlation;
  const corrText =
    corr === null
      ? 'Ölçmek için en az 5 çok işlemli gün gerekir.'
      : corr >= 0.3
        ? 'Aynı gün işlemler büyük ölçüde birlikte kazanıp kaybediyor: tek bir karar gibi davranıyorlar.'
        : corr >= 0.1
          ? 'Aynı gün işlemler kısmen birlikte hareket ediyor.'
          : corr <= -0.3
            ? 'Aynı gün işlemler çoğunlukla ters sonuç veriyor (biri kazanırken diğeri kaybediyor): riskleri birbirini dengeliyor ama günün beklentisini de bölüyor.'
            : 'Aynı gün işlemler birbirinden büyük ölçüde bağımsız.';
  return (
    <Card
      icon={<CalendarRange size={15} className="text-blue-400" />}
      title="Aynı Gün Çoklu İşlem"
      hint="Gün = New York takvim günü (Prop ve Hesapsız ayrı). Aynı gün aynı fikirle açılan işlemler (ör. EURUSD ve DXY) birlikte kazanıp kaybederse risk tek işlemden büyüktür ve örneklem olduğundan büyük görünür. Tüm güven aralıkları bu yüzden gün bazında düzeltilir."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <span className="text-label uppercase tracking-wider text-zinc-500 block font-sans">Çok İşlemli Gün</span>
          <span className="text-lg font-bold text-zinc-200 tabular-nums">{s.multiDays}</span>
          <span className="text-label text-zinc-500 block">{s.days} günün · {s.multiTrades} işlem</span>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <span className="text-label uppercase tracking-wider text-zinc-500 block font-sans">Hepsi Kayıp / Kazanç</span>
          <span className="text-lg font-bold tabular-nums">
            <span className="text-rose-400">{s.allLost}</span>
            <span className="text-zinc-600"> / </span>
            <span className="text-emerald-400">{s.allWon}</span>
          </span>
          <span className="text-label text-zinc-500 block">karışık: {s.mixed} gün</span>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <span className="text-label uppercase tracking-wider text-zinc-500 block font-sans">Gün İçi Benzerlik</span>
          <span className={`text-lg font-bold tabular-nums ${corr !== null && corr >= 0.3 ? 'text-amber-300' : 'text-zinc-200'}`}>{corr === null ? '—' : fixed(corr, 2)}</span>
          <span className="text-label text-zinc-500 block">korelasyon (−1…1)</span>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <span className="text-label uppercase tracking-wider text-zinc-500 block font-sans">Bağımsız Karar</span>
          <span className="text-lg font-bold text-zinc-200 tabular-nums">≈ {s.effectiveN}</span>
          <span className="text-label text-zinc-500 block">{s.total} işlemin etkin karşılığı</span>
        </div>
      </div>
      <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg font-sans">{corrText}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {([
          ['Tek işlemli günler', s.singleDay],
          ['Çok işlemli günler', s.multiDay],
        ] as const).map(([l, e]) => (
          <div key={l} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900 px-3 py-2 text-xs">
            <span className="text-zinc-400 font-bold">{l}</span>
            <span className="tabular-nums">
              <span className={`font-bold ${tone(e.expectancy)}`}>{e.n ? `${formatR(e.expectancy)}/gün` : '—'}</span>
              <span className="text-zinc-500"> · {e.n} gün{e.n ? ` · %${fixed(e.winRate, 0)} artı gün` : ''}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-label text-zinc-500">
        Gün başı R: o günkü tüm işlemlerin toplamı. Çok işlemli günler tek işlemli günlerden kötüyse günde tek işlem kuralını Kural Simülatörü › Hazır Günlük Kurallar'da dene.
      </p>
    </Card>
  );
});
