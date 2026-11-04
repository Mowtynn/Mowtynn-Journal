import { EASE } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  TrendingUp,
  Compass,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Activity,
  Brain,
  Flame,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FlaskConical,
} from 'lucide-react';
import { Trade } from '../types';
import { useNewsDayLabels } from '../hooks/useNewsDayLabels';
import { calculateStrategyAnalytics, StrategyAnalyticsResult } from '../lib/strategyAnalytics';
import { AsiaEdgeLab } from './AsiaEdgeLab';
import { SetupScorecardTab } from './strategy/SetupScorecardTab';
import { EdgeSummaryCard, DisciplineCard } from './deepAnalysis/EdgeCockpit';
import { TradeHistoryModal } from './TradeHistoryModal';
import { ComparatorTab } from './strategy/ComparatorTab';
import { RuleSimulatorTab } from './strategy/RuleSimulatorTab';
import { formatPF } from '../lib/statMath';


/**
 * Sekme şeridi: kullanıcı kaydırmaz, sağ/sol butonlarla kayar.
 * Aktif sekme seçilince otomatik görünür alana getirilir.
 */
const TabStrip = React.memo(function TabStrip({
  activeKey,
  children,
}: {
  activeKey: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [update]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    const pad = 44; // yan butonların altında kalmasın
    const left = active.offsetLeft - pad;
    const right = active.offsetLeft + active.offsetWidth - el.clientWidth + pad;
    if (left < el.scrollLeft) el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    else if (right > el.scrollLeft) el.scrollTo({ left: right, behavior: 'smooth' });
  }, [activeKey]);

  const slide = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const arrowCls =
    'absolute top-1/2 -translate-y-1/2 z-10 h-7 w-7 flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/95 text-zinc-300 hover:text-white hover:bg-zinc-800 shadow-md transition-opacity duration-150 cursor-pointer select-none';

  return (
    <div className="relative bg-zinc-950 rounded-xl border border-zinc-800">
      <div
        ref={ref}
        className="relative flex items-center p-1.5 gap-1 text-xs overflow-x-hidden overscroll-x-none"
        style={{ scrollbarWidth: 'none', touchAction: 'pan-y' }}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Sekmeleri sola kaydır"
        onClick={() => slide(-1)}
        tabIndex={canLeft ? 0 : -1}
        className={`${arrowCls} left-1 ${canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft size={15} />
      </button>
      <button
        type="button"
        aria-label="Sekmeleri sağa kaydır"
        onClick={() => slide(1)}
        tabIndex={canRight ? 0 : -1}
        className={`${arrowCls} right-1 ${canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
});

interface StrategyOptimizerHubProps {
  trades: Trade[];
  onViewTrade?: (trade: Trade) => void;
  /** Edge Özeti / Disiplin satırlarından açılan işlem listesinde düzenleme */
  onEdit?: (trade: Trade) => void;
}

type LabTab =  
  | 'edge_summary'
  | 'rule_sim'
  | 'discipline'
  | 'setup_scorecard'
  | 'asia_lab'
  | 'psychology' 
  | 'mae_mfe'   
  | 'matrix_comparator' ;

const SUBTABS: Array<{ id: LabTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; activeColor: string }> = [
  { id: 'edge_summary', label: 'Edge Özeti', icon: Sparkles, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'rule_sim', label: 'Kural Simülatörü', icon: FlaskConical, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'discipline', label: 'Disiplin', icon: ShieldCheck, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'setup_scorecard', label: 'Kurulum Karnesi', icon: ClipboardList, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'asia_lab', label: 'Asia Edge Lab', icon: Compass, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'psychology', label: 'Psikoloji & Tilt', icon: Brain, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'mae_mfe', label: 'MAE, MFE & Stop', icon: Target, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'matrix_comparator', label: 'Kıyaslama', icon: BarChart3, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
];

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
  onEdit,
}: StrategyOptimizerHubProps) {
  // Edge Özeti / Disiplin satırlarına tıklanınca ilgili işlemler geçmiş penceresinde açılır
  const [shownTrades, setShownTrades] = useState<{ title: string; trades: Trade[] } | null>(null);
  const showTrades = useCallback((title: string, list: Trade[]) => setShownTrades({ title, trades: list }), []);
  const [activeSubTab, setActiveSubTab] = useState<LabTab>('edge_summary');

  const { version: newsLabelsVersion } = useNewsDayLabels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats: StrategyAnalyticsResult = useMemo(() => calculateStrategyAnalytics(trades), [trades, newsLabelsVersion]);

  const isEmpty = !trades || trades.length === 0;
  // Not: boş durum hook'lardan SONRA döndürülür. Eskiden hook'lardan önce erken dönüş vardı;
  // ilk işlem eklenince veya filtre sonucu boşalınca "Rendered more hooks" hatasıyla ekran çöküyordu.
  const emptyState = (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-400">
        <Compass className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-200 font-sans">Strateji Geliştirme İçin Yeterli Veri Yok</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto font-sans">
          İşlem eklerken girdiğiniz Parite, Stop/TP Pip, MAE, MFE, Asia Range, Target (çıkış hedefi), Confirmations, Onaylar ve Giriş Modelleri burada otomatik strateji önerilerine ve edge matrislerine dönüştürülür.
        </p>
      </div>
    
  );

  const { 
    overallScore,
    maeStats, 
    mfeStats, 
    asiaRangeStats, 
    stopSizeStats,
    streakStats,
  } = stats;

  if (isEmpty) return emptyState;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
    >
      
      {/* 1. Header Banner & Health Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-sans tracking-tight">
                Strateji & Edge Geliştirme Laboratuvarı
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 border border-blue-500/30 text-blue-300">
                {trades.length} İşlem İncelendi
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">{smartUpper("Kazanma Oranı")}</span>
            <span className="text-xs font-black font-sans text-zinc-100">%{overallScore.winRate}</span>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">Kâr Faktörü</span>
            <span className={`text-xs font-black font-sans ${overallScore.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {formatPF(overallScore.profitFactor)}
            </span>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">Beklenti</span>
            <span className={`text-xs font-black font-sans ${overallScore.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {overallScore.expectancy >= 0 ? '+' : ''}{overallScore.expectancy} R
            </span>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">Net R</span>
            <span className={`text-xs font-black font-sans ${overallScore.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {overallScore.netR >= 0 ? '+' : ''}{overallScore.netR} R
            </span>
          </div>
        </div>
      </div>

      {/* 2. SubTab Navigation Bar */}
      <TabStrip activeKey={activeSubTab}>
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              data-active={isActive ? 'true' : 'false'}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] font-sans transition-ui whitespace-nowrap cursor-pointer flex items-center gap-1.5 select-none border ${
                isActive
                  ? `${tab.activeColor} shadow-xs`
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </TabStrip>

      {/* 3. Animated SubTab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10, scale: 0.997 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.997 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="space-y-4"
        >

      {/* SUBTAB 0: ASIA EDGE LAB */}
      {activeSubTab === 'edge_summary' && <EdgeSummaryCard trades={trades} onShowTrades={showTrades} />}

      {activeSubTab === 'rule_sim' && <RuleSimulatorTab trades={trades} />}

      {activeSubTab === 'discipline' && <DisciplineCard trades={trades} onShowTrades={showTrades} />}

      {activeSubTab === 'setup_scorecard' && <SetupScorecardTab trades={trades} />}

      {activeSubTab === 'asia_lab' && <AsiaEdgeLab trades={trades} />}




      {/* SUBTAB 4: PSYCHOLOGY & TILT */}
      {activeSubTab === 'psychology' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-purple-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Psikoloji, Tilt Göstergesi & Ardışık Momentum
                </h4>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                streakStats.postLossTiltRisk === 'YÜKSEK' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                streakStats.postLossTiltRisk === 'ORTA' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                Tilt Riski: {streakStats.postLossTiltRisk}
              </span>
            </div>

            <p className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg font-sans">
              {streakStats.insight}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">{smartUpper("Mevcut Seri")}</span>
                <span className={`text-base font-bold font-sans ${streakStats.currentStreak.type === 'WIN' ? 'text-emerald-400' : streakStats.currentStreak.type === 'LOSS' ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {streakStats.currentStreak.count} {streakStats.currentStreak.type === 'WIN' ? 'Galibiyet' : streakStats.currentStreak.type === 'LOSS' ? 'Mağlubiyet' : '-'}
                </span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Maks. Win Serisi</span>
                <span className="text-base font-bold text-emerald-400 font-sans flex items-center justify-center gap-1">
                  <Flame size={15} /> {streakStats.maxWinStreak} İşlem
                </span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Kazanç Sonrası WR</span>
                <span className="text-base font-bold text-zinc-200 font-mono">
                  %{streakStats.postWinWinRate}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Aşırı Özgüven Etkisi</span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Kayıp Sonrası WR</span>
                <span className={`text-base font-bold font-mono ${streakStats.postLossWinRate < 45 ? 'text-rose-400' : 'text-zinc-200'}`}>
                  %{streakStats.postLossWinRate}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Kayıp sonrası performans</span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* SUBTAB 7: MAE, MFE & STOP VOLATILITY */}
      {activeSubTab === 'mae_mfe' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* MAE Drawdown Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("MAE (Maksimum Aleyhte Drawdown)")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {maeStats.tradeCount} Verili İşlem
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Ort. MAE</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">{maeStats.avgMaeAll} Pip</span>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Kazanan MAE</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{maeStats.avgMaeWins} Pip</span>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Ort. Stop</span>
                  <span className="text-sm font-bold text-rose-400 font-mono">{maeStats.avgStopPips} Pip</span>
                </div>
              </div>

            </div>

            {/* MFE Profit Realization Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("MFE (Maksimum Kâr Potansiyeli)")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {mfeStats.tradeCount} Verili İşlem
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Ortalama MFE</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{mfeStats.avgMfeAll} Pip</span>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Masada Kalan Kâr</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">{mfeStats.leftOnTheTablePips} Pip</span>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-center">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">MFE Yakalama</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">%{mfeStats.mfeRealizationRate}</span>
                </div>
              </div>

            </div>

          </div>

          {/* Stop Size Volatility Distribution */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-200 font-sans">{smartUpper("Stop Mesafesi (Pip) Dağılımı & Başarı Oranı")}</span>
              <span className="text-[10px] text-zinc-500 font-sans">{stopSizeStats.insight}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {stopSizeStats.brackets.map((b) => (
                <div key={b.label} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-200 block font-sans">{b.label}</span>
                    <span className="text-[10px] text-zinc-500 font-sans">{b.total || b.count} İşlem</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block font-sans ${b.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.netR >= 0 ? '+' : ''}{b.netR} R (%{b.winRate})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">Ort. {b.avgR} R</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asia Range Volatility Analysis */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-200 font-sans flex items-center gap-1.5">
                <Activity size={14} className="text-amber-400" />
                Asia Range Volatilite Matrisi & Kırılım Edge'i
              </span>
              <span className="text-[10px] text-zinc-500 font-sans">{asiaRangeStats.insight}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[asiaRangeStats.brackets.tight, asiaRangeStats.brackets.medium, asiaRangeStats.brackets.wide].map((b) => (
                <div key={b.label} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-200 block font-sans">{b.label}</span>
                    <span className="text-[10px] text-zinc-500 font-sans">{b.count} İşlem</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block font-sans ${b.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.netR >= 0 ? '+' : ''}{b.netR} R (%{b.winRate})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">Ort. {b.avgR} R</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Lehine en az 1R gidip kârsız kapanan işlemler (eski Genel Bakış önerisinden taşındı) */}
          {mfeStats.missedProfitTradesCount > 0 && (
            <button
              type="button"
              onClick={() => showTrades('Lehine 1R gidip kârsız kapanan işlemler', mfeStats.missedProfitTrades)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-3 text-left transition-ui cursor-pointer"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-amber-200">{smartUpper("Lehine 1R gidip kârsız kapanan işlemler")}</span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">Fiyat en az stop mesafesi kadar lehine gitti ama işlem zararla ya da başabaşta kapandı. BE / kısmi kâr kuralını Asia Edge Lab'deki TP simülatörüyle test et.</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-amber-300">
                {mfeStats.missedProfitTradesCount} işlem · {(Math.round(mfeStats.missedProfitTrades.reduce((a, t) => a + Math.min(0, t.rr || 0), 0) * 100) / 100).toFixed(2)} R
              </span>
            </button>
          )}
        </div>
      )}





      {/* SUBTAB 11: MULTI-VARIABLE COMPARATOR */}
      {activeSubTab === 'matrix_comparator' && <ComparatorTab trades={trades} />}

      {/* SUBTAB 12: PRE-TRADE EDGE CHECKER */}
        </motion.div>
      </AnimatePresence>

      <TradeHistoryModal
        isOpen={!!shownTrades}
        onClose={() => setShownTrades(null)}
        title={shownTrades?.title || ''}
        icon={<Compass size={16} className="mr-1.5 text-blue-400 shrink-0" />}
        trades={shownTrades?.trades || []}
        onEdit={onEdit ? (t) => { onEdit(t); setShownTrades(null); } : undefined}
      />
    </motion.div>
  );
});

export default StrategyOptimizerHub;
