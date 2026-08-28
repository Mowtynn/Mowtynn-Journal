import { memo } from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'motion/react';

const widgetConfig = {
  colorTheme: "dark",
  isTransparent: true,
  width: "100%",
  height: "100%",
  locale: "tr",
  importanceFilter: "0,1",
  currencyFilter: "USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD,TRY"
};

const widgetUrl = `https://www.tradingview-widget.com/embed-widget/events/?locale=tr#${encodeURIComponent(JSON.stringify(widgetConfig))}`;

const EconomicCalendar = memo(function EconomicCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-[calc(100vh-180px)] min-h-[620px] bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 sm:p-5 overflow-hidden flex flex-col relative shadow-sm"
    >
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100 font-mono">
                Ekonomik Takvim
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                CANLI VERİ
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              Küresel piyasa duyuruları, faiz kararları ve ekonomik veriler.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-full flex-grow relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
        <iframe
          src={widgetUrl}
          className="w-full h-full border-0"
          title="TradingView Ekonomik Takvim"
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="lazy"
        />
      </div>
    </motion.div>
  );
});

export default EconomicCalendar;
