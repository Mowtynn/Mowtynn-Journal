import { EASE } from '../lib/motion';
import React from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowDownRight, RefreshCw, TrendingUp } from 'lucide-react';
import type { DeepMetrics } from '../lib/deepMetrics';
import { formatPF } from '../lib/statMath';

// Projedeki diğer R değerleriyle aynı biçim (nokta, 2 basamak)
const fmtR = (v: number) => v.toFixed(2);

export const NewDeepAnalysisMetrics = React.memo(({ metrics, onMetricClick }: { metrics: DeepMetrics; onMetricClick?: (id: string, val: string | number) => void }) => {
  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: EASE } }
  };

  const currentMaxDrawdown = metrics.maxDrawdown;
  const currentRecoveryFactor = metrics.recoveryFactor;
  const currentProfitFactor = metrics.pureProfitFactor;
  const recoveryText = metrics.avgRecoveryTrades === null ? '—' : metrics.avgRecoveryTrades.toFixed(1);

  return (
    <div className="flex flex-col w-full p-3.5 sm:p-5 gap-3.5">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
         {/* Maksimum Tarihsel Düşüş (Max DD) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-rose-950/10 hover:border-rose-500/30 transition-ui duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("maxDrawdown", `${currentMaxDrawdown > 0 ? "-" : ""}${fmtR(currentMaxDrawdown)} R`)}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                 <ArrowDownRight size={11} className="transition-colors" />
               </span>
               Max Drawdown
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
               <span className="text-lg sm:text-xl font-bold text-rose-400 font-sans tracking-tight">{currentMaxDrawdown > 0 ? "-" : ""}{fmtR(currentMaxDrawdown)}</span>
               <span className="text-[10px] text-rose-400/70 font-bold font-sans ml-0.5">R</span>
           </div>
         </motion.div>

         {/* Toparlanma Faktörü (Recovery Factor) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-blue-950/10 hover:border-blue-500/30 transition-ui duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("recoveryFactor", currentMaxDrawdown > 0 ? currentRecoveryFactor.toFixed(2) : "—")}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                 <RefreshCw size={11} className="group-hover:rotate-45 transition-transform" />
               </span>
               Recovery Factor
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
               <span className="text-lg sm:text-xl font-bold text-blue-300 font-sans tracking-tight">{currentMaxDrawdown > 0 ? currentRecoveryFactor.toFixed(2) : '—'}</span>
           </div>
         </motion.div>

         {/* Brüt Kârlılık (Profit Factor) */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-emerald-950/10 hover:border-emerald-500/30 transition-ui duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("pureProfitFactor", formatPF(currentProfitFactor))}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                 <TrendingUp size={11} className="transition-colors" />
               </span>
               Profit Factor
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
               <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight ${currentProfitFactor > 1.5 ? 'text-emerald-400' : currentProfitFactor >= 1 ? 'text-blue-400' : 'text-rose-400'}`}>
                 {formatPF(currentProfitFactor)}
               </span>
           </div>
         </motion.div>
       
         {/* Drawdown Toparlanma Süresi */}
         <motion.div 
           variants={itemVariants} 
           className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 hover:bg-blue-950/10 hover:border-blue-500/30 transition-ui duration-200 ease-out flex flex-col justify-between cursor-pointer group shadow-xs"
           onClick={() => onMetricClick && onMetricClick("avgRecoveryTrades", recoveryText)}
         >
           <div className="flex items-center justify-between mb-2">
             <span className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
               <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                 <Activity size={11} className="transition-colors" />
               </span>
               DD Toparlanma Süresi
             </span>
           </div>
           <div className="flex items-baseline gap-1 mt-auto pt-1">
             <span className="text-lg sm:text-xl font-bold font-sans tracking-tight text-blue-300">{recoveryText}</span>
             <span className="text-[10px] text-zinc-400 font-bold font-sans ml-0.5">İşlem</span>
           </div>
         </motion.div>
      </div>
    </div>
  );
});

NewDeepAnalysisMetrics.displayName = 'NewDeepAnalysisMetrics';
