import React, { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Trade } from '../../types';
import { simulateDailyRules, type DailyRuleVerdict } from '../../lib/dayAnalytics';
import type { HalfStatus } from '../../lib/ruleSimulator';
import { formatR, rnum } from '../../lib/format';

const VERDICT: Record<DailyRuleVerdict, { label: string; cls: string; hint: string }> = {
  HELPS: { label: 'Kazandırır', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', hint: 'Vazgeçtirdiği işlemler %95 güvenle kaybettiriyor.' },
  LIKELY_HELPS: { label: 'Kazandırabilir', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10', hint: 'Vazgeçtirdiği işlemler eksi, ama fark henüz kesin değil.' },
  LIKELY_HURTS: { label: 'Kaçırtabilir', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10', hint: 'Vazgeçtirdiği işlemler artı: kural kazanç kaçırtıyor olabilir.' },
  HURTS: { label: 'Kaçırtır', cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10', hint: 'Vazgeçtirdiği işlemler %95 güvenle kazandırıyor.' },
  NO_EFFECT: { label: 'Etkisiz', cls: 'text-zinc-400 border-zinc-700 bg-zinc-800/60', hint: 'Geçmişte hiçbir işlemi değiştirmezdi.' },
};

const HALF: Partial<Record<HalfStatus, { label: string; cls: string }>> = {
  CONSISTENT: { label: 'İki Yarıda Tutarlı', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  MIXED: { label: 'Şans Olabilir', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
};

const tone = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-zinc-300');
const ORDER: Record<DailyRuleVerdict, number> = { HELPS: 0, LIKELY_HELPS: 1, LIKELY_HURTS: 2, HURTS: 3, NO_EFFECT: 4 };

function Cell({ label, value, sub, cls = 'text-zinc-100' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="min-w-0">
      <span className="text-label uppercase tracking-wide text-zinc-500 block font-bold truncate">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${cls}`}>{value}</span>
      {sub && <span className="text-label text-zinc-500 block tabular-nums truncate">{sub}</span>}
    </div>
  );
}

/** Hazır günlük disiplin kuralları: geçmişte uygulansaydı net R ve drawdown ne olurdu */
export const DailyRulesCard = React.memo(function DailyRulesCard({ trades }: { trades: Trade[] }) {
  const rows = useMemo(
    () => simulateDailyRules(trades).sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || b.netDelta - a.netDelta),
    [trades],
  );
  const active = rows.filter((r) => r.verdict !== 'NO_EFFECT');
  const idle = rows.filter((r) => r.verdict === 'NO_EFFECT');

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-zinc-100 font-sans flex items-center gap-2">
          <CalendarCheck size={16} className="text-blue-400" /> Hazır Günlük Kurallar
        </h3>
        <p className="text-label text-zinc-500 mt-0.5 max-w-2xl">
          Gün içi disiplin kuralları geçmişte uygulansaydı ne olurdu? Kural yalnızca vazgeçtirdiği işlemleri değiştirir: onlar
          kaybettiriyorsa kural kazandırır. Gün = New York takvim günü; Prop ve Hesapsız işlemler ayrı sayılır.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-label text-zinc-500 py-2">Bu işlemlerde hiçbir günlük kural sonucu değiştirmezdi (her gün tek işlem alınmış).</p>
      ) : (
        <div className="space-y-2">
          {active.map((r) => {
            const v = VERDICT[r.verdict];
            const half = HALF[r.halves];
            return (
              <div key={r.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 space-y-2.5">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <span className="text-xs font-bold text-zinc-100 block">{r.title}</span>
                    <span className="text-label text-zinc-500 block">{r.desc}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span title={v.hint} className={`whitespace-nowrap px-2 py-0.5 rounded-lg border text-label font-bold uppercase ${v.cls}`}>{v.label}</span>
                    {half && <span className={`whitespace-nowrap px-2 py-0.5 rounded-lg border text-label font-bold uppercase ${half.cls}`}>{half.label}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Cell label="Vazgeçilen" value={`${r.skipped.n} İşlem`} sub={`${r.taken.n} işlem alınır`} />
                  <Cell
                    label="Vazgeçilenler"
                    value={`${formatR(r.skipped.expectancy)}/işlem`}
                    sub={r.skipped.n > 1 ? `%95: ${rnum(r.skipped.expLo)} – ${rnum(r.skipped.expHi)}` : undefined}
                    cls={tone(r.skipped.expectancy)}
                  />
                  <Cell label="Net R Farkı" value={formatR(r.netDelta)} sub={`${formatR(r.taken.netR)} · tümü ${formatR(r.all.netR)}`} cls={tone(r.netDelta)} />
                  <Cell
                    label="Max Drawdown"
                    value={Math.abs(r.ddDelta) < 1e-9 ? 'Değişmez' : r.ddDelta < 0 ? `${rnum(-r.ddDelta)}R azalır` : `${rnum(r.ddDelta)}R artar`}
                    sub={`DD ${formatR(-Math.abs(r.taken.maxDrawdownR))} · tümü ${formatR(-Math.abs(r.all.maxDrawdownR))}`}
                    cls={tone(-r.ddDelta)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {idle.length > 0 && active.length > 0 && (
        <p className="text-label text-zinc-500">Etkisiz (hiçbir işlemi değiştirmezdi): {idle.map((r) => r.title).join(' · ')}</p>
      )}
      <p className="text-label text-zinc-500">
        Max drawdown: kural uygulansaydı en büyük düşüşün ne kadar değişeceği. "Kazandırır" için vazgeçilen işlemlerin güven aralığı tamamen sıfırın
        altında olmalı; az işlemde sonuç "Kazandırabilir / Kaçırtabilir" kalır. Kural yapmadan önce yeni işlemlerle doğrula.
      </p>
    </div>
  );
});
