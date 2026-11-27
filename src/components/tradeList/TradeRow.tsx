import { RBadge, TrendBadge, PoiCell, TimeframeCell } from "./TradeBadges";
import { TradeMobileCard } from "./TradeMobileCard";
import React, { useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import { Trade } from '../../types';
import { Edit3, Trash2 } from 'lucide-react';
import { nyWallDate } from '../../lib/tradingTime';
import { prefetchChart } from '../../lib/chartLink';

const tradeRowDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
export const TR_COLLATOR = new Intl.Collator('tr', { sensitivity: 'base' });

const CELL = 'py-1 px-2 bg-transparent border-y border-zinc-800/80 align-middle';

export const MemoizedTradeRow = React.memo(function MemoizedTradeRow({
  trade,
  onViewDetails,
  onEdit,
  setTradeToDelete,
}: {
  trade: Trade;
  onViewDetails: (trade: Trade) => void;
  onEdit: (trade: Trade) => void;
  setTradeToDelete: (trade: Trade) => void;
}) {
  const formattedDateOnly = useMemo(
    () => (Number.isFinite(trade.createdAt) ? tradeRowDateFormatter.format(nyWallDate(trade.createdAt)) : '—'),
    [trade.createdAt],
  );

  return (
    <>
      {/* Telefon: kart */}
      <tr className="block sm:hidden">
        <td className="block pb-2" colSpan={8}>
          <TradeMobileCard trade={trade} onOpen={onViewDetails} onEdit={onEdit} onDelete={setTradeToDelete} />
        </td>
      </tr>
      {/* Masaüstü: tablo satırı */}
      <tr onClick={() => onViewDetails(trade)} onPointerEnter={() => prefetchChart(trade.screenshot)} className="group select-none relative hidden sm:table-row bg-zinc-900 align-middle cursor-pointer hover:bg-zinc-800/50 transition-colors duration-100">
        <td className={`${CELL} px-3 text-zinc-400 rounded-l-xl border-l w-[13%] min-w-[110px] group-hover:text-zinc-100`}>
          <div>
            <span className="text-label text-zinc-400 font-medium">{formattedDateOnly}</span>
          </div>
        </td>
        <td className={`${CELL} px-3 w-[11%] min-w-[90px]`}>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-white font-bold text-label uppercase">{trade.asset}</span>
            {trade.quickEntry === true && <span className="px-1 py-px rounded text-label font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300 leading-none">{smartUpper("Hızlı")}</span>}
          </div>
        </td>
        <td className={`${CELL} w-[9%] min-w-[65px]`}>
          <div>
            {trade.type === 'LONG' ? (
              <span className="whitespace-nowrap inline-flex items-center justify-center h-[20px] px-2 text-label font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider w-[54px]">LONG</span>
            ) : (
              <span className="whitespace-nowrap inline-flex items-center justify-center h-[20px] px-2 text-label font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider w-[54px]">SHORT</span>
            )}
          </div>
        </td>
        <td className={`${CELL} w-[9%] min-w-[65px]`}>
          <div>
            <RBadge rr={trade.rr} />
          </div>
        </td>
        <td className={`${CELL} w-[15%] min-w-[75px]`}>
          <div>
            <TrendBadge trend={trade.trend} />
          </div>
        </td>
        <td className={`${CELL} w-[14%] min-w-[90px]`}>
          <div>
            <TimeframeCell value={trade.poiTimeframe} />
          </div>
        </td>
        <td className={`${CELL} w-[20%] min-w-[130px]`}>
          <div>
            <PoiCell sweepTime={trade.sweepTime} session={trade.session} />
          </div>
        </td>
        <td className={`${CELL} px-1.5 rounded-r-xl border-r w-[9%] min-w-[80px]`}>
          <div className="gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Düzenle"
              type="button"
              onClick={() => onEdit(trade)}
              className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 hover:text-blue-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
            >
              <Edit3 size={13} />
            </button>
            <button
              aria-label="Sil"
              type="button"
              onClick={() => setTradeToDelete(trade)}
              className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    </>
  );
});
