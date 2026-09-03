import React from 'react';
import { motion } from 'motion/react';
import { Activity, Target, ArrowDownRight, RefreshCw, TrendingUp, Layers } from 'lucide-react';
import { ValueTransition } from './ValueTransition';

export const NewDeepAnalysisMetrics = React.memo(({ metrics, currency, isRrMode, onMetricClick }: { metrics: any; currency: string; isRrMode?: boolean; onMetricClick?: (id: string, val: string | number) => void }) => {
  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: "easeInOut" as any } }
  };

  const currentMaxDrawdown = isRrMode ? metrics.maxDrawdown : (metrics.maxRealDrawdown ?? metrics.maxDrawdown);
  const currentRecoveryFactor = isRrMode ? metrics.recoveryFactor : (metrics.realRecoveryFactor ?? metrics.recoveryFactor);
  const currentProfitFactor = isRrMode ? metrics.pureProfitFactor : (metrics.realPureProfitFactor ?? metrics.pureProfitFactor);

  return (
    <div className="flex flex-col w-full p-3.5 sm:p-5 gap-3.5">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
         {/* Maksimum Tarihsel Düşüş (Max DD) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-rose-950/10 hover:border-rose-500/30 transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("maxDrawdown", isRrMode ? `-${(currentMaxDrawdown || 0).toLocaleString("en-US", {minimumFractionDigits: 1})} R` : `-${(currentMaxDrawdown || 0).toLocaleString("en-US", {minimumFractionDigits: 1})} ${currency}`)}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                 <ArrowDownRight size={11} className="transition-colors" />
               </span>
               Max Drawdown
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
             <ValueTransition modeKey={isRrMode ?? false}>
               <span className="text-lg sm:text-xl font-bold text-rose-400 font-mono tracking-tight">-{(currentMaxDrawdown || 0).toLocaleString("en-US", { minimumFractionDigits: 1 })}</span>
               <span className="text-[10px] text-rose-400/70 font-bold font-mono ml-0.5">{isRrMode ? 'R' : currency}</span>
             </ValueTransition>
           </div>
         </motion.div>

         {/* Toparlanma Faktörü (Recovery Factor) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-blue-950/10 hover:border-blue-500/30 transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("recoveryFactor", currentRecoveryFactor?.toFixed(2) || "0.00")}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                 <RefreshCw size={11} className="group-hover:rotate-45 transition-transform" />
               </span>
               Recovery Factor
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
             <ValueTransition modeKey={isRrMode ?? false}>
               <span className="text-lg sm:text-xl font-bold text-blue-300 font-mono tracking-tight">{currentRecoveryFactor?.toFixed(2) || '0.00'}</span>
             </ValueTransition>
           </div>
         </motion.div>

         {/* Brüt Kârlılık (Profit Factor) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-emerald-950/10 hover:border-emerald-500/30 transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("pureProfitFactor", currentProfitFactor === Infinity ? "Sonsuz" : currentProfitFactor?.toFixed(2) || "0.00")}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                 <TrendingUp size={11} className="transition-colors" />
               </span>
               Profit Factor
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
             <ValueTransition modeKey={isRrMode ?? false}>
               <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${currentProfitFactor > 1.5 ? 'text-emerald-400' : currentProfitFactor >= 1 ? 'text-blue-400' : 'text-rose-400'}`}>
                 {currentProfitFactor === Infinity ? 'Sonsuz' : currentProfitFactor?.toFixed(2) || '0.00'}
               </span>
             </ValueTransition>
           </div>
         </motion.div>
       
         {/* Kümülatif SMA(10) Bilgisi */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-indigo-950/10 hover:border-indigo-500/30 transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("sma10", isRrMode ? `${metrics.equityCurve?.[metrics.equityCurve.length - 1]?.sma10?.toFixed(1) || '0.0'} R` : `${metrics.equityCurve?.[metrics.equityCurve.length - 1]?.realSma10?.toLocaleString("en-US", {minimumFractionDigits: 1}) || '0.0'} ${currency}`)}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                 <Layers size={11} className="transition-colors" />
               </span>
               Son 10 İşlem Ortalaması
             </span>
           </div>
           <div className="flex flex-col gap-1 mt-auto pt-1">
             <div className="flex items-baseline gap-1">
               <ValueTransition modeKey={isRrMode ?? false}>
                 <span className="text-lg sm:text-xl font-bold text-indigo-300 font-mono tracking-tight">
                   {isRrMode ? (
                     `${metrics.equityCurve?.[metrics.equityCurve.length - 1]?.sma10?.toFixed(1) || '0.0'}`
                   ) : (
                     `${metrics.equityCurve?.[metrics.equityCurve.length - 1]?.realSma10?.toLocaleString("en-US", {minimumFractionDigits: 1}) || '0.0'}`
                   )}
                 </span>
                 <span className="text-[10px] text-indigo-300 font-bold font-mono ml-0.5">{isRrMode ? "R" : currency}</span>
               </ValueTransition>
             </div>
           </div>
         </motion.div>
      </div>

      {/* Bottom section for extra details - compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         {/* Drawdown Toparlanma Süresi */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-blue-950/10 hover:border-blue-500/30 transition-all duration-200 ease-out flex items-center justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("avgRecoveryTrades", metrics.avgRecoveryTrades?.toFixed(1) || "0")}
         >
           <div className="flex items-center gap-2.5">
             <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl group-hover:bg-blue-500/20 transition-colors text-blue-400">
               <Activity size={14} />
             </div>
             <div>
               <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                 DD Toparlanma Süresi
               </h3>
             </div>
           </div>
           <div className="flex items-center gap-1.5">
             <span className="text-lg font-bold text-blue-300 font-mono">{metrics.avgRecoveryTrades?.toFixed(1) || '0'}</span>
             <span className="text-[10px] font-mono font-medium text-zinc-400">İşlem</span>
           </div>
         </motion.div>
         
         {/* Sistem Yaşlanması / Faz */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-emerald-950/10 hover:border-emerald-500/30 transition-all duration-200 ease-out flex items-center justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("efficiencyLevel", (metrics.last10GrossLoss ? metrics.last10GrossProfit / metrics.last10GrossLoss : 0).toFixed(2))}
         >
           <div className="flex items-center gap-2.5">
             <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl group-hover:bg-emerald-500/20 transition-colors text-emerald-400">
               <Target size={14} />
             </div>
             <div>
               <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                 Sistem Verimlilik Seviyesi
               </h3>
             </div>
           </div>
           <div className="flex gap-2">
              <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm py-1 px-2.5 rounded-xl flex items-center gap-1.5">
                <span className="text-[9px] uppercase text-zinc-400 font-bold font-mono">Son 10:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {metrics.last10GrossLoss ? (metrics.last10GrossProfit / metrics.last10GrossLoss).toFixed(2) : "Sonsuz"}
                </span>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm py-1 px-2.5 rounded-xl flex items-center gap-1.5">
                <span className="text-[9px] uppercase text-zinc-400 font-bold font-mono">Genel:</span>
                <span className="text-xs font-bold text-zinc-300 font-mono">{currentProfitFactor === Infinity ? "Sonsuz" : currentProfitFactor?.toFixed(2)}</span>
              </div>
           </div>
         </motion.div>
      </div>
    </div>
  );
});

NewDeepAnalysisMetrics.displayName = 'NewDeepAnalysisMetrics';
