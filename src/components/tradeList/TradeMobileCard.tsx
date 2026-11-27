import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Trade } from '../../types';
import { formatR } from '../../lib/format';
import { nyWallDate } from '../../lib/tradingTime';
import { prefetchChart } from '../../lib/chartLink';
import { smartUpper } from '../../constants/constants';

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Telefonda işlem satırı: tablo sütunları yerine tek bakışta okunan kart.
 * Solda parite + yön, altında tarih · POI saati + session · işlem tipi, en altta POI timeframe;
 * sağda büyük R (renk yalnızca sonuçta). Hesap gösterilmez: Prop / Hesapsız üstteki seçiciyle zaten ayrılır.
 * İşlem listesi ve İşlem Geçmişi penceresi aynı kartı kullanır; düzenle / sil yalnızca verilirse görünür.
 */
export const TradeMobileCard = React.memo(function TradeMobileCard({
  trade,
  onOpen,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  onOpen: (t: Trade) => void;
  onEdit?: (t: Trade) => void;
  onDelete?: (t: Trade) => void;
}) {
  const rr = typeof trade.rr === 'number' && Number.isFinite(trade.rr) ? trade.rr : null;
  const rTone = rr === null ? 'text-zinc-500' : rr > 0 ? 'text-emerald-400' : rr < 0 ? 'text-rose-400' : 'text-blue-300';
  const date = Number.isFinite(trade.createdAt) ? dateFmt.format(nyWallDate(trade.createdAt)) : '—';
  const poi = [trade.sweepTime, trade.session].filter(Boolean).join(' ');
  const meta = [date, poi, trade.trend].filter(Boolean).join(' · ');
  const long = trade.type === 'LONG';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(trade)}
      onPointerDown={() => prefetchChart(trade.screenshot)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(trade);
        }
      }}
      className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900 px-3 py-2.5 active:bg-zinc-800/70 transition-colors duration-100 cursor-pointer select-none"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base font-bold text-zinc-100 tracking-wide truncate">{trade.asset || '—'}</span>
          <span
            className={`shrink-0 inline-flex items-center h-[18px] px-1.5 rounded-md text-label font-bold uppercase tracking-wider border ${
              long ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-rose-400 bg-rose-500/10 border-rose-500/25'
            }`}
          >
            {long ? 'Long' : 'Short'}
          </span>
          {trade.quickEntry === true && (
            <span className="shrink-0 inline-flex items-center h-[18px] px-1.5 rounded-md text-label font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300">
              {smartUpper('Hızlı')}
            </span>
          )}
        </div>
        <div className="mt-1 text-label leading-snug text-zinc-500 whitespace-normal">{meta}</div>
        {trade.poiTimeframe && (
          <div className="mt-1 text-label font-sans">
            <span className="text-zinc-500">POI TF </span>
            <span lang="en" className="font-bold uppercase tracking-wide text-blue-300">{trade.poiTimeframe}</span>
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        <div className={`text-lg font-extrabold leading-none tabular-nums ${rTone}`}>{rr === null ? '—' : rr === 0 ? 'BE' : formatR(rr)}</div>
      </div>

      {(onEdit || onDelete) && (
        <div className="shrink-0 flex flex-col gap-1 -mr-1" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <button type="button" aria-label="Düzenle" onClick={() => onEdit(trade)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 active:bg-zinc-800 hover:text-blue-400">
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button type="button" aria-label="Sil" onClick={() => onDelete(trade)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 active:bg-rose-500/15 hover:text-rose-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
