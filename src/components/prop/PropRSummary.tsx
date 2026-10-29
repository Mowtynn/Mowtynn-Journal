import { memo, useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import { Activity } from 'lucide-react';
import { PropAccount, Trade } from '../../types';
import { computeAccountRInsights } from '../../lib/propInsights';

const r1 = (v: number) => v.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const sR = (v: number) => `${v > 0 ? '+' : ''}${r1(v)}R`;

function Stat({ label, value, tone = 'text-zinc-100', hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-2" title={hint}>
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate">{smartUpper(label)}</span>
      <span className={`text-xs sm:text-sm font-extrabold tabular-nums truncate ${tone}`}>{value}</span>
    </div>
  );
}

/**
 * Prop kartında canlı R özeti: hesabın kendi işlemleri, kurallara "kaç kayıp / kaç kazanç" mesafesi
 * ve senin R dağılımınla Monte Carlo geçme (funded'da ayakta kalma) olasılığı.
 */
export const PropRSummary = memo(function PropRSummary({ account, trades }: { account: PropAccount; trades: Trade[] }) {
  const ins = useMemo(() => computeAccountRInsights(account, trades), [account, trades]);
  const sim = ins.simulation;
  const probTone = !sim ? 'text-zinc-400' : sim.probability >= 60 ? 'text-emerald-300' : sim.probability >= 35 ? 'text-amber-300' : 'text-rose-300';
  const probBar = !sim ? '' : sim.probability >= 60 ? 'bg-emerald-500' : sim.probability >= 35 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
          <Activity size={12} className="text-blue-400" /> Canlı R özeti
        </span>
        <span className="text-[10px] text-zinc-500 tabular-nums">1R ≈ ${r1(ins.riskPerTrade)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <Stat
          label="Kazanma"
          value={ins.tradeCount ? `%${Math.round(ins.winRate)} · ${ins.wins}/${ins.tradeCount}` : '—'}
          tone={ins.tradeCount ? 'text-zinc-100' : 'text-zinc-500'}
        />
        <Stat
          label="Beklenti"
          value={ins.tradeCount ? `${sR(ins.expectancy)}/işlem` : '—'}
          tone={ins.expectancy > 0 ? 'text-emerald-300' : ins.expectancy < 0 ? 'text-rose-300' : 'text-zinc-400'}
          hint={`Ort. kazanç ${r1(ins.avgWinR)}R · ort. kayıp ${r1(ins.avgLossR)}R`}
        />
        <Stat
          label="Sınıra kalan"
          value={`${r1(ins.ddRemainingR)}R · ${ins.lossesToBreach} kayıp`}
          tone={ins.lossesToBreach <= 2 ? 'text-rose-300' : ins.lossesToBreach <= 4 ? 'text-amber-300' : 'text-zinc-100'}
          hint="Ortalama kaybınla (en az 1R) max drawdown sınırına kaç kayıp kaldı"
        />
        {ins.targetRemainingR !== undefined ? (
          <Stat
            label="Hedefe kalan"
            value={`${r1(ins.targetRemainingR)}R${ins.winsToTarget !== undefined ? ` · ${ins.winsToTarget} kazanç` : ''}`}
            hint="Ortalama kazancınla hedefe kaç kazanç kaldı"
          />
        ) : (
          <Stat label="Net R" value={sR(ins.netR)} tone={ins.netR >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
        )}
      </div>

      {sim ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            <span>{sim.kind === 'PASS' ? 'Geçme olasılığı' : `Sonraki ${sim.horizon} işlemde ayakta kalma`}</span>
            <span className={`tabular-nums ${probTone}`}>%{Math.round(sim.probability)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className={`h-full rounded-full ${probBar}`} style={{ width: `${Math.max(2, Math.min(100, sim.probability))}%` }} />
          </div>
          <span className="text-[10px] text-zinc-500">
            {sim.sampleSource === 'ACCOUNT' ? `Bu hesabın ${sim.sampleSize} işleminin` : `Tüm prop geçmişindeki (Challenge + Funded) ${sim.sampleSize} işlemin`} R dağılımıyla 2000 simülasyon
            {sim.kind === 'PASS' && sim.medianTrades ? ` · geçenlerde medyan ${Math.round(sim.medianTrades)} işlem` : ''}
          </span>
        </div>
      ) : ins.ddRemainingR <= 0 || ins.targetRemainingR === 0 ? null : (
        <span className="text-[10px] text-zinc-500">Olasılık için en az 10 işlemlik R geçmişi gerekiyor.</span>
      )}
    </div>
  );
});
