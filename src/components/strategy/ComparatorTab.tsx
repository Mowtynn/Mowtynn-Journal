import React, { useMemo, useState } from 'react';
import { FILTER_LABEL, FILTER_SELECT } from '../filters/FilterControls';
import { Sliders } from 'lucide-react';
import { Trade } from '../../types';
import { dimensionValue, SETUP_DIMENSIONS, UNSPECIFIED, type SetupDimension } from '../../lib/setupScorecard';
import { useNewsDayLabels } from '../../hooks/useNewsDayLabels';

/** Strateji laboratuvarı · Kıyaslama sekmesi (kendi durumu burada; seçim değişince yalnızca bu sekme yeniden çizilir) */
export const ComparatorTab = React.memo(function ComparatorTab({ trades }: { trades: Trade[] }) {
  // Interactive Comparator States
  // Kurulum karnesiyle aynı boyut listesi: yeni bir boyut eklenince burada da otomatik seçilebilir
  const [compDimensionX, setCompDimensionX] = useState<SetupDimension>('session');
  const [compDimensionY, setCompDimensionY] = useState<SetupDimension>('type');

  const { version: newsLabelsVersion } = useNewsDayLabels();

  // Comparator dynamic matrix computation
  const comparatorMatrix = useMemo(() => {
    // Çoklu alanlar (Entry Model, Target, PD Array, İşlem Yönetimi) tek tek değerlere ayrılır
    const valuesOf = (t: Trade, d: SetupDimension): string[] => {
      const multi: Partial<Record<SetupDimension, string[] | undefined>> = {
        entryModels: t.entryModels,
        tpTargets: t.tpTargets,
        confirmations: t.confirmations,
        management: t.management,
      };
      if (d in multi) {
        const list = multi[d];
        return list && list.length ? list : [UNSPECIFIED];
      }
      return [dimensionValue(t, d)];
    };
    const getValuesX = (t: Trade) => valuesOf(t, compDimensionX);
    const getValuesY = (t: Trade) => valuesOf(t, compDimensionY);

    const crossMap: Record<string, { total: number; wins: number; netR: number; valX: string; valY: string }> = {};

    trades.forEach(t => {
      const xs = getValuesX(t);
      const ys = getValuesY(t);
      const isWin = t.status === 'WIN';
      const valR = t.rr || 0;

      xs.forEach(x => {
        ys.forEach(y => {
          const key = `${x}___${y}`;
          if (!crossMap[key]) crossMap[key] = { total: 0, wins: 0, netR: 0, valX: x, valY: y };
          crossMap[key].total++;
          if (isWin) crossMap[key].wins++;
          crossMap[key].netR += valR;
        });
      });
    });

    return Object.values(crossMap).map(item => ({
      ...item,
      winRate: Math.round((item.wins / item.total) * 1000) / 10,
      netR: Math.round(item.netR * 100) / 100,
      avgR: Math.round((item.netR / item.total) * 100) / 100,
    })).sort((a, b) => b.netR - a.netR);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, compDimensionX, compDimensionY, newsLabelsVersion]);

  return (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-blue-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Dinamik Çok Boyutlu Kıyaslama Motoru
                </h4>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className={FILTER_LABEL}>X Boyutu</span>
                  <select
                    value={compDimensionX}
                    onChange={(e: any) => setCompDimensionX(e.target.value)}
                    className={FILTER_SELECT}
                  >
                    {SETUP_DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className={FILTER_LABEL}>Y Boyutu</span>
                  <select
                    value={compDimensionY}
                    onChange={(e: any) => setCompDimensionY(e.target.value)}
                    className={FILTER_SELECT}
                  >
                    {SETUP_DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans">
              Seçtiğiniz iki değişkenin tüm kombinasyonlarının kazanma oranı, işlem adedi ve net getiri kıyaslaması:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {comparatorMatrix.map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 uppercase font-sans truncate mr-2">
                      {item.valX} + {item.valY}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">{item.total} İşlem</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-sans">Win Rate</span>
                    <span className={`font-bold font-sans ${item.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{item.winRate}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-sans">Net R</span>
                    <span className={`font-bold font-sans ${item.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.netR >= 0 ? '+' : ''}{item.netR} R
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      
  );
});
