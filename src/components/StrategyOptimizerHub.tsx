import { EASE } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  TrendingUp,
  Compass,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  BarChart3,
  Layers,
  Scale,
  Activity,
  Calendar,
  Brain,
  ShieldAlert,
  Flame,
  ChevronLeft,
  ChevronRight,
  Flag,
  Newspaper,
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
import { setupQualityTier } from '../lib/discipline';
import { EDGE_PROOF_MIN } from '../lib/sampleSize';
import { formatPF } from '../lib/statMath';

const signedR = (v: number) => (v > 0 ? `+${v}` : `${v}`);

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
  | 'overview' 
  | 'edge_summary'
  | 'rule_sim'
  | 'discipline'
  | 'setup_scorecard'
  | 'asia_lab'
  | 'psychology'
  | 'day_of_week'
  | 'tp_zone' 
  | 'mae_mfe' 
  | 'ict_concepts' 
  | 'trend_time' 
  | 'setup_quality'
  | 'asset_account'
  | 'matrix_comparator' ;

const SUBTABS: Array<{ id: LabTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; activeColor: string }> = [
  { id: 'overview', label: 'Genel Bakış', icon: Award, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'edge_summary', label: 'Edge Özeti', icon: Sparkles, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'rule_sim', label: 'Kural Simülatörü', icon: FlaskConical, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'discipline', label: 'Disiplin', icon: ShieldCheck, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'setup_scorecard', label: 'Kurulum Karnesi', icon: ClipboardList, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'asia_lab', label: 'Asia Edge Lab', icon: Compass, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'psychology', label: 'Psikoloji & Tilt', icon: Brain, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'day_of_week', label: 'Günlük Edge', icon: Calendar, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'tp_zone', label: 'Target & Confirmations', icon: Flag, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'mae_mfe', label: 'MAE, MFE & Stop', icon: Target, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'ict_concepts', label: 'Likidite & Modeller', icon: Layers, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'trend_time', label: 'HTF, Entry TF & Saatler', icon: Clock, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'setup_quality', label: 'A+ Kalite & Disiplin', icon: ShieldCheck, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'asset_account', label: 'Parite & Hesap Türü', icon: Scale, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'matrix_comparator', label: 'Kıyaslama', icon: BarChart3, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
];

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
  onEdit,
}: StrategyOptimizerHubProps) {
  // Edge Özeti / Disiplin satırlarına tıklanınca ilgili işlemler geçmiş penceresinde açılır
  const [shownTrades, setShownTrades] = useState<{ title: string; trades: Trade[] } | null>(null);
  const showTrades = useCallback((title: string, list: Trade[]) => setShownTrades({ title, trades: list }), []);
  const [activeSubTab, setActiveSubTab] = useState<LabTab>('overview');

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
    entryModelStats, 
    trendStats, 
    timeframeMatrix, 
    hourlyStats, 
    tpTargetStats,
    premiumDiscountStats,
    newsDayStats,
    confirmationStats,
    setupQualityStats,
    sessionDirectionStats,
    disciplineStats, 
    dayOfWeekStats,
    stopSizeStats,
    streakStats,
    redFlagRules,
    goldenSetup, 
    actionableInsights,
    assetStats,
    accountCategoryStats
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

      {/* SUBTAB 1: OVERVIEW & RED FLAG RULES */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Golden Setup Formula */}
            <div className="bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-950 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Award size={14} /> Senin Altın Setup Formülün
                </span>
                {goldenSetup.hasFormula && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${goldenSetup.confirmed ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-zinc-400 border-zinc-700 bg-zinc-800/60'}`}
                      title={goldenSetup.confirmed ? 'En az ' + EDGE_PROOF_MIN + ' işlem ve %95 güven aralığı sıfırın üstünde' : 'Henüz kesin değil: kanıt için en az ' + EDGE_PROOF_MIN + ' işlem ve sıfırın üstünde güven aralığı gerekir'}
                    >
                      {goldenSetup.confirmed ? 'Kanıtlı' : `Erken${goldenSetup.sampleSize < EDGE_PROOF_MIN ? ` · ${goldenSetup.sampleSize}/${EDGE_PROOF_MIN}` : ''}`}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {goldenSetup.sampleSize} İşlem
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-zinc-100 leading-relaxed mb-3 font-sans">
                {goldenSetup.hasFormula ? goldenSetup.description : 'Farklı parite, seans ve modellerde daha fazla işlem kaydettikçe en kârlı formülünüz burada belirecektir.'}
              </p>
              {goldenSetup.hasFormula ? (
                <div className="flex items-center gap-4 pt-2 border-t border-amber-500/15 text-xs font-mono">
                  <div>
                    <span className="text-zinc-400 text-[10px] block font-sans">Kazanma Oranı</span>
                    <span className="text-emerald-400 font-bold font-sans">%{goldenSetup.winRate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block font-sans">Toplam Kazanç</span>
                    <span className="text-amber-300 font-bold font-sans">+{goldenSetup.netR} R</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Discipline Delta Card */}
            <div className="bg-gradient-to-br from-blue-950/20 via-zinc-900/60 to-zinc-950 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Scale size={14} /> Disiplin Deltası (kaliteye göre)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Potansiyel Kurtarma
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed mb-2 font-sans">
                {disciplineStats.disciplineAlphaR > 0
                  ? `Plan dışı (B-C / FOMO) işlemleri tamamen elerseniz portföyünüze net +${disciplineStats.disciplineAlphaR} R eklenmiş olacaktı.`
                  : 'B-C / FOMO işlemlerinizin hesaba net bir negatif etkisi tespit edilmedi. Disiplininizi koruyun!'}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-500/15 text-xs">
                <div className="min-w-0">
                  <span className="text-zinc-500 text-[10px] block font-sans">Yüksek (A+)</span>
                  <span className={`${disciplineStats.highQualityNetR >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold font-sans`}>{signedR(disciplineStats.highQualityNetR)} R</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">{disciplineStats.highQualityTradesCount} işlem</span>
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-500 text-[10px] block font-sans">Orta (A)</span>
                  <span className={`${disciplineStats.midQualityNetR >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold font-sans`}>{signedR(disciplineStats.midQualityNetR)} R</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">{disciplineStats.midQualityTradesCount} işlem</span>
                </div>
                <div className="min-w-0">
                  <span className="text-zinc-500 text-[10px] block font-sans">Düşük (B-C)</span>
                  <span className={`${disciplineStats.lowQualityNetR < 0 ? 'text-rose-400' : 'text-emerald-400'} font-bold font-sans`}>{signedR(disciplineStats.lowQualityNetR)} R</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">{disciplineStats.lowQualityTradesCount} işlem</span>
                </div>
              </div>
            </div>
          </div>

          {/* Red Flag Elimination Rules */}
          {redFlagRules.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                <ShieldAlert size={14} />
                Kırmızı Çizgiler & Otomatik Eliminasyon Kuralları (Hesap Sızıntıları)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {redFlagRules.map((rf) => (
                  <div key={rf.id} className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-200 font-sans flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                        {rf.rule}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60">
                        -{rf.lossR} R ({rf.tradeCount} İşlem)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {rf.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Insights List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <Sparkles size={13} className="text-blue-400" />
              Sana Özel Matematiksel Edge Önerileri
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {actionableInsights.map((insight, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    insight.type === 'opportunity'
                      ? 'bg-blue-950/15 border-blue-500/30'
                      : insight.type === 'warning'
                      ? 'bg-rose-950/15 border-rose-500/30'
                      : 'bg-emerald-950/15 border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-sans">
                      {insight.type === 'warning' ? <AlertTriangle size={13} className="text-rose-400" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
                      {insight.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                      {insight.metricTag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



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

      {/* SUBTAB 5: DAY OF WEEK */}
      {activeSubTab === 'day_of_week' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Haftanın Günleri (Pazartesi - Cuma) Getiri & Edge Haritası
                </h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Gün Bazlı İstatistik
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {dayOfWeekStats.map((d) => (
                <div key={d.dayIndex} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5 text-center">
                  <span className="text-xs font-bold text-zinc-200 uppercase block font-sans">{smartUpper(d.dayName)}</span>
                  <span className="text-[10px] text-zinc-500 block font-sans">{d.total} İşlem</span>
                  <div className="pt-1 border-t border-zinc-800/80">
                    <span className="text-[9px] text-zinc-500 block font-sans">Win Rate</span>
                    <span className={`font-bold text-xs font-sans ${d.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      %{d.winRate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block font-sans">Net R</span>
                    <span className={`font-bold text-xs font-sans ${d.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {d.netR >= 0 ? '+' : ''}{d.netR} R
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: TP TARGET & ZONE & CONFIRMATIONS */}
      {activeSubTab === 'tp_zone' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Target (çıkış hedefi) Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flag size={16} className="text-purple-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Target (çıkış hedefi) performansı")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {tpTargetStats.ranking.length} Farklı Hedef
                </span>
              </div>
              <p className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg font-sans">
                {tpTargetStats.insight}
              </p>

              {tpTargetStats.ranking.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-sans">Henüz Target (çıkış hedefi) girilmemiş.</div>
              ) : (
                <div className="space-y-1.5">
                  {tpTargetStats.ranking.map((item) => (
                    <div key={item.target} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(item.target)}</span>
                        <span className="text-[10px] text-zinc-500 font-sans">{item.total} İşlem ({item.wins} Galibiyet)</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Win Rate</span>
                          <span className={`font-bold font-sans ${item.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{item.winRate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                          <span className={`font-bold font-sans ${item.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.netR >= 0 ? '+' : ''}{item.netR} R
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmations Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Confirmations analizi")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {premiumDiscountStats.ranking.length} değer
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg font-sans">
                {premiumDiscountStats.insight}
              </p>

              {premiumDiscountStats.ranking.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-sans">Henüz Confirmations alanı girilmemiş.</div>
              ) : (
                <div className="space-y-1.5">
                  {premiumDiscountStats.ranking.map((item) => (
                    <div key={item.zone} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(item.zone)}</span>
                        <span className="text-[10px] text-zinc-500 font-sans">{item.total} İşlem ({item.wins} Galibiyet)</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Win Rate</span>
                          <span className={`font-bold font-sans ${item.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{item.winRate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                          <span className={`font-bold font-sans ${item.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.netR >= 0 ? '+' : ''}{item.netR} R
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PD Array / Confirmations */}
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block font-sans">PD Array / Onay Başarı Oranları</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {confirmationStats.ranking.map((conf) => (
                    <div key={conf.confirmation} className="p-2 bg-zinc-900 border border-zinc-800/60 rounded-md text-[11px] flex justify-between items-center">
                      <span className="font-bold text-zinc-300">{conf.confirmation}</span>
                      <span className={`font-bold ${conf.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {conf.netR >= 0 ? '+' : ''}{conf.netR} R (%{conf.winRate})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News Day / Bank Holiday Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Newspaper size={16} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("News Day / Bank Holiday Analizi")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {newsDayStats.ranking.reduce((sum, r) => sum + r.total, 0)} Verili İşlem
                </span>
              </div>
              <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg font-sans leading-relaxed">
                {newsDayStats.insight}
              </p>

              {newsDayStats.ranking.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-sans">Henüz News Day / Bank Holiday bilgisi olan işlem yok.</div>
              ) : (
                <div className="space-y-1.5">
                  {newsDayStats.ranking.map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(item.label)}</span>
                        <span className="text-[10px] text-zinc-500 font-sans">{item.total} İşlem ({item.wins} Galibiyet)</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Win Rate</span>
                          <span className={`font-bold font-sans ${item.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{item.winRate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Ort. R</span>
                          <span className={`font-bold font-sans ${item.avgR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.avgR >= 0 ? '+' : ''}{item.avgR}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                          <span className={`font-bold font-sans ${item.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.netR >= 0 ? '+' : ''}{item.netR} R
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {newsDayStats.unknownCount > 0 && (
                <p className="text-[10px] text-zinc-500 font-sans">
                  {newsDayStats.unknownCount} işlemde News Day bilgisi girilmemiş (eski kayıt); kıyasa dahil edilmedi.
                </p>
              )}
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
        </div>
      )}

      {/* SUBTAB 8: ICT CONCEPTS (LIQUIDITY & ENTRY MODELS) */}
      {activeSubTab === 'ict_concepts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Entry Models */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Giriş Modelleri (Breaker, Mitigation, FVG, IFVG)")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {entryModelStats.ranking.length} Model
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {entryModelStats.ranking.map((m) => (
                  <div key={m.model} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(m.model)}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{m.total} İşlem ({m.wins} Win)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">WR</span>
                        <span className={`font-bold font-sans ${m.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{m.winRate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                        <span className={`font-bold font-sans ${m.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.netR >= 0 ? '+' : ''}{m.netR} R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 9: HTF, ENTRY TIMEFRAME & HOURS */}
      {activeSubTab === 'trend_time' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* HTF x Entry Timeframe Matrix */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-rose-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Timeframe (HTF) x Entry Timeframe Sinerjisi")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {timeframeMatrix.length} Kesişim
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {timeframeMatrix.map((tf) => (
                  <div key={tf.pair} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(tf.pair)}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{tf.total} İşlem ({tf.wins} Galibiyet)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">WR</span>
                        <span className={`font-bold font-sans ${tf.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{tf.winRate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                        <span className={`font-bold font-sans ${tf.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tf.netR >= 0 ? '+' : ''}{tf.netR} R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Entry Time Windows */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Giriş Saatleri (Entry Time) Performansı")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {hourlyStats.length} Zaman Aralığı
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {hourlyStats.map((h) => (
                  <div key={h.hour} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 block font-mono">{h.hour}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{h.total} İşlem</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">WR</span>
                        <span className={`font-bold font-sans ${h.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{h.winRate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                        <span className={`font-bold font-sans ${h.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.netR >= 0 ? '+' : ''}{h.netR} R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Yapısı Performansı */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Trend Yapısı (Continuation vs Reversal)")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {trendStats.ranking.length} Yapı
                </span>
              </div>

              <div className="space-y-1.5">
                {trendStats.ranking.map((tr) => (
                  <div key={tr.trend} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{smartUpper(tr.trend)}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{tr.total} İşlem ({tr.wins} Win)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">WR</span>
                        <span className={`font-bold font-sans ${tr.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{tr.winRate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                        <span className={`font-bold font-sans ${tr.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tr.netR >= 0 ? '+' : ''}{tr.netR} R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seans x İşlem Yönü Kesişimi */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Seans x İşlem Yönü (Long / Short) Kesişimi")}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {sessionDirectionStats.length} Kesişim
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {sessionDirectionStats.map((sd, i) => (
                  <div key={i} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-zinc-200 block font-sans">{sd.session} {sd.direction}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{sd.total} İşlem</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold block font-sans ${sd.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {sd.netR >= 0 ? '+' : ''}{sd.netR} R
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans">%{sd.winRate} WR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 10: SETUP KALİTESİ & DİSİPLİN */}
      {activeSubTab === 'setup_quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {setupQualityStats.ranking.map((sq) => {
              const tier = setupQualityTier(sq.quality);
              return (
                <div 
                  key={sq.quality}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    tier === 'high'
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : tier === 'mid'
                      ? 'bg-blue-950/20 border-blue-500/40'
                      : tier === 'low'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-zinc-900/40 border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-100 font-sans">{sq.quality} Kalite</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                      {sq.total} İşlem
                    </span>
                  </div>
                  <div className="space-y-1 my-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Kazanma Oranı</span>
                      <span className="font-bold font-sans text-zinc-100">%{sq.winRate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Net R</span>
                      <span className={`font-bold font-sans ${sq.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {signedR(sq.netR)} R
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Kâr Faktörü</span>
                      <span className="font-bold font-sans text-zinc-200">{formatPF(sq.profitFactor)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-sans flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Sadece Yüksek Kalite (A+) Simülasyonu
              </h5>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                Yalnızca yüksek kalite (A+) kurulumları alıp A ve B-C kurulumlarını pas geçseydin:
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">A+ Net R</span>
                <span className={`text-sm font-bold ${setupQualityStats.onlyAPlusNetR >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-sans`}>{signedR(setupQualityStats.onlyAPlusNetR)} R</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">A+ Kazanma</span>
                <span className="text-sm font-bold text-zinc-200 font-sans">%{setupQualityStats.onlyAPlusWinRate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 12: ASSET & ACCOUNT DISCIPLINE */}
      {activeSubTab === 'asset_account' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Parite Bazında Edge */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Parite Bazında Performans & Kârlılık")}
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-500 font-sans font-mono">
                  {assetStats.length} Parite
                </span>
              </div>

              <div className="space-y-2">
                {assetStats.map((ast) => (
                  <div key={ast.asset} className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-zinc-100 block font-sans text-sm">{ast.asset}</span>
                      <span className="text-[10px] text-zinc-400 font-sans">
                        {ast.total} İşlem ({ast.wins}W / {ast.losses}L{ast.total - ast.wins - ast.losses > 0 ? ` / ${ast.total - ast.wins - ast.losses}BE` : ''}) • Kâr Faktörü: {formatPF(ast.profitFactor)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black block font-mono text-sm ${ast.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ast.netR >= 0 ? '+' : ''}{ast.netR} R
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans">%{ast.winRate} Kazanma</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hesap Türü Disiplin Analizi (Funded vs Challenge vs Demo) */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    {smartUpper("Hesap Türü & Disiplin Karşılaştırması")}
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-500 font-sans font-mono">
                  Funded / Challenge / Demo
                </span>
              </div>

              <div className="space-y-2">
                {accountCategoryStats.map((acc) => {
                  const isFunded = acc.category === 'FUNDED';
                  const isChallenge = acc.category === 'CHALLENGE';
                  return (
                    <div 
                      key={acc.category} 
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isFunded ? 'bg-emerald-950/20 border-emerald-500/30' :
                        isChallenge ? 'bg-amber-950/20 border-amber-500/30' :
                        'bg-blue-950/20 border-blue-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100 font-sans text-sm">{acc.category}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                            isFunded ? 'bg-emerald-500/20 text-emerald-300' :
                            isChallenge ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {isFunded ? 'Gerçek Fon' : isChallenge ? 'Fon Sınavı' : 'Demo / Simülasyon'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-sans block mt-1">
                          {acc.total} İşlem • Ortalama {acc.avgR} R / İşlem
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black block font-mono text-sm ${acc.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {acc.netR >= 0 ? '+' : ''}{acc.netR} R
                        </span>
                        <span className="text-[10px] text-zinc-300 font-sans">%{acc.winRate} Kazanma</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 leading-relaxed font-sans">
                <span className="text-zinc-200 font-bold block mb-1">Psikolojik Çıkarım:</span>
                Challenge hesaplarında kural zorlama ve acelecilik eğilimi genelde kazanma oranını düşürür. Fonlu (Funded) hesaplarda koruma içgüdüsü devreye girer. Bu verilerle iki zihniyet arasındaki finansal uçurumu takip edin.
              </div>
            </div>

          </div>
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
