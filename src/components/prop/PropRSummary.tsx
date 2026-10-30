import { memo, useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import { Activity } from 'lucide-react';
import { PropAccount, Trade } from '../../types';
import { computeAccountRInsights, MAX_BUST_PCT, MIN_SURVIVE_PCT } from '../../lib/propInsights';

const r1 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 });
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

      {/* Risk önerisi: aynı simülasyon farklı risk seviyeleriyle; drawdown ve hedef bu hesabın kurallarından */}
      {sim && ins.riskAdvice && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-800/70">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            <span>Önerilen risk</span>
            <span className={`tabular-nums ${ins.riskAdvice.recommendedPct !== undefined ? 'text-blue-300' : 'text-rose-300'}`}>
              {ins.riskAdvice.recommendedPct !== undefined ? `%${ins.riskAdvice.recommendedPct}` : 'Uygun seviye yok'}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {ins.riskAdvice.levels.map((l) => {
              const rec = l.pct === ins.riskAdvice!.recommendedPct;
              const cur = ins.riskAdvice!.currentPct !== undefined && Math.abs(l.pct - ins.riskAdvice!.currentPct) < 0.13;
              return (
                <div
                  key={l.pct}
                  title={sim.kind === 'PASS' ? `%${l.pct} risk: geçme %${Math.round(l.probability)} · hesabı yakma %${Math.round(l.bustProbability)}${l.medianTrades ? ` · geçenlerde medyan ${Math.round(l.medianTrades)} işlem` : ''}` : `%${l.pct} risk: sonraki ${sim.horizon} işlemde ayakta kalma %${Math.round(l.probability)}`}
                  className={`rounded-lg border px-1.5 py-1 text-center tabular-nums ${rec ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950/40'}`}
                >
                  <div className={`text-[10px] font-bold ${rec ? 'text-blue-300' : 'text-zinc-300'}`}>%{l.pct}{cur ? ' ·' : ''}</div>
                  <div className="text-[10px] text-zinc-400">{sim.kind === 'PASS' ? `%${Math.round(l.probability)}` : `%${Math.round(l.probability)}`}</div>
                  {sim.kind === 'PASS' && <div className={`text-[9px] ${l.bustProbability > MAX_BUST_PCT ? 'text-rose-400' : 'text-zinc-500'}`}>yakma %{Math.round(l.bustProbability)}</div>}
                </div>
              );
            })}
          </div>
          <span className="text-[10px] text-zinc-500">
            {sim.kind === 'PASS'
              ? `Hesabı yakma olasılığı %${MAX_BUST_PCT} altında ve geçme olasılığı en yükseğe yakın seviyeler içinde hedefe en hızlı ulaşan. Drawdown (${account.drawdownMode === 'TRAILING' ? 'trailing' : 'statik'})${ins.dailyLimitApplied ? `, günlük kayıp %${ins.dailyLimitApplied.pct} (günde ~${ins.dailyLimitApplied.tradesPerDay} işlem varsayımıyla)` : ' ve hedef'} bu hesabın kurallarından${ins.dailyLimitApplied ? '' : '; günlük kayıp limiti girilmemiş'}; "·" şu anki riskin.`
              : `Sonraki ${sim.horizon} işlemde ayakta kalma olasılığı en az %${MIN_SURVIVE_PCT} olan en yüksek seviye; "·" şu anki riskin.`}
          </span>
        </div>
      )}
    </div>
  );
});
