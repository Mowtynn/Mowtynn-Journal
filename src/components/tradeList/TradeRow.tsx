import React, { useMemo } from 'react';
import { smartUpper } from '../../constants/constants';
import { Trade } from '../../types';
import { getTradeAccountCategory } from '../../constants/constants';
import { Edit3, Trash2 } from 'lucide-react';
import { nyWallDate } from '../../lib/tradingTime';

export const tradeRowDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
export const tradeRowTimeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
export const TR_COLLATOR = new Intl.Collator('tr', { sensitivity: 'base' });

export const MemoizedTradeRow = React.memo(function MemoizedTradeRow({ 
  trade, 
  onViewDetails, 
  onEdit, 
  setTradeToDelete 
}: { 
  trade: Trade; 
  onViewDetails: (trade: Trade) => void; 
  onEdit: (trade: Trade) => void; 
  setTradeToDelete: (trade: Trade) => void; 
}) {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isBe = trade.status === 'BREAKEVEN';

  const category = getTradeAccountCategory(trade);
  const categoryBadgeClass = category === 'FUNDED'
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 group-hover:border-emerald-500/60'
    : category === 'CHALLENGE'
      ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 group-hover:border-blue-500/60'
      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 group-hover:border-amber-500/60';

  // Risk sütunu: hesaplı işlemde işlem başı risk yüzdesi, hesapsızda boş
  const riskText = typeof trade.riskPct === 'number' ? `%${trade.riskPct.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : '—';
  const accountLabel = trade.platform || (category === 'DEMO' ? 'Hesapsız' : '');

  const { formattedDateOnly, formattedTimeOnly } = useMemo(() => {
    if (!trade.createdAt) return { formattedDateOnly: '—', formattedTimeOnly: '' };
    const dateObj = nyWallDate(trade.createdAt);
    return {
      formattedDateOnly: tradeRowDateFormatter.format(dateObj),
      formattedTimeOnly: tradeRowTimeFormatter.format(dateObj)
    };
  }, [trade.createdAt]);

  return (
    <tr 
      onClick={() => onViewDetails(trade)}
      className="group select-none relative flex flex-wrap sm:table-row bg-zinc-900 mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 sm:border-none p-2 sm:p-0 align-middle cursor-pointer hover:bg-zinc-800/50 transition-colors duration-100"
    >
      <td className="w-1/2 min-w-[130px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 font-sans sm:bg-transparent sm:rounded-l-xl sm:border-y sm:border-l sm:border-zinc-800/80 align-middle sm:w-[18%] group-hover:text-zinc-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-center sm:w-full gap-0.5 sm:gap-1.5">
          <span className="sm:hidden flex items-center gap-1.5"><span className="text-white font-bold text-xs uppercase">{trade.asset}</span>{trade.quickEntry === true && <span title="Hızlı kayıt · ayrıntılar tamamlanmadı" className="px-1 py-px rounded text-[8px] font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300 leading-none">{smartUpper("Hızlı")}</span>}</span>
          <span className="text-[10px] sm:text-[10px] flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">{formattedDateOnly}</span>
            <span className="text-zinc-600 font-bold">•</span>
            <span className="text-zinc-500 font-sans">{formattedTimeOnly}</span>
          </span>
        </div>
      </td>
      <td className="hidden sm:table-cell min-w-[90px] py-1 px-0 sm:px-3 sm:bg-transparent sm:border-y sm:border-zinc-800/80 text-left sm:text-center align-middle sm:w-[14%]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white font-bold text-[10px] uppercase">{trade.asset}</span>
          {trade.quickEntry === true && <span title="Hızlı kayıt · ayrıntılar tamamlanmadı" className="px-1 py-px rounded text-[8px] font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300 leading-none">{smartUpper("Hızlı")}</span>}
        </div>
      </td>
      <td className="w-1/2 min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 align-middle sm:w-[10%]">
        <div className="flex items-center justify-center w-full">
          {trade.type === 'LONG' ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">LONG</span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">SHORT</span>
          )}
        </div>
      </td>
      <td className="w-1/2 min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 align-middle sm:w-[10%]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
          <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">R</span>
          <div className="flex items-center justify-center w-full h-[18px]">
            {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
              trade.rr > 0 ? (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans">
                  +{trade.rr}R
                </span>
              ) : trade.rr < 0 ? (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans">
                  {trade.rr}R
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans">
                  {trade.rr}R
                </span>
              )
            ) : (
              <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded-md">—</span>
            )}
          </div>
        </div>
      </td>
      <td className="w-1/2 min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 align-middle sm:w-[12%]">
        <div className="flex items-center justify-center w-full h-[18px]">
          {isWin ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">{smartUpper("WIN")}</span>
          ) : isLoss ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">LOSS</span>
          ) : isBe ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">BE</span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">{smartUpper("AÇIK")}</span>
          )}
        </div>
      </td>
      <td className={`w-full min-w-[95px] flex justify-between sm:justify-center items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right sm:text-center text-zinc-300 font-bold sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 max-sm:pt-3 max-sm:border-t max-sm:border-zinc-800/50 sm:py-1 align-middle sm:w-[14%]`}>
        <span className="sm:hidden heading-3 text-left font-sans">Risk</span>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-center sm:h-[20px]">
          <span className="text-sm sm:text-xs font-bold font-sans inline-flex items-center justify-center h-[20px] leading-none tracking-tight">{riskText}</span>
        </div>
      </td>
      {true && (
        <td className="hidden sm:table-cell sm:w-[12%] sm:min-w-[75px] py-1.5 px-2 text-center bg-transparent border-y border-zinc-800/80 align-middle">
          <div className="flex items-center justify-center w-full">
            {accountLabel ? (
              <span className={`inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold rounded-full uppercase tracking-wider font-sans whitespace-nowrap truncate border transition-colors ${categoryBadgeClass}`}>
                {accountLabel}
              </span>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>
        </td>
      )}
      <td className="w-full sm:w-[10%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-1.5 text-right sm:text-center sm:bg-transparent sm:rounded-r-xl sm:border-y sm:border-r sm:border-zinc-800/80 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
        {true && (
          <div className="sm:hidden trade-mobile-only">
            {accountLabel ? (
              <span className={`inline-flex items-center justify-center min-w-[46px] max-w-[120px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold rounded-full uppercase tracking-wider font-sans whitespace-nowrap truncate border ${categoryBadgeClass}`}>
                {accountLabel}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex items-center justify-end sm:justify-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
          <button aria-label="Düzenle" title="Düzenle"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(trade);
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 hover:text-blue-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
          >
            <Edit3 size={13} />
          </button>
          <button aria-label="Sil" title="Sil"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTradeToDelete(trade);
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
});
