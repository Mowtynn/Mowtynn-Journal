import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Compass, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Award,
  BarChart3,
  Layers,
  Scale,
  Activity,
  ArrowUpRight,
  Sliders,
  Calendar,
  Brain,
  Dices,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { Trade } from '../types';
import { calculateStrategyAnalytics, StrategyAnalyticsResult } from '../lib/strategyAnalytics';
import { AsiaEdgeLab } from './AsiaEdgeLab';

interface StrategyOptimizerHubProps {
  trades: Trade[];
  currency?: string;
  onViewTrade?: (trade: Trade) => void;
}

type LabTab = 
  | 'overview' 
  | 'asia_lab'
  | 'mistakes_leak'
  | 'monte_carlo'
  | 'confluence'
  | 'psychology'
  | 'day_of_week'
  | 'dxy_zone' 
  | 'mae_mfe' 
  | 'ict_concepts' 
  | 'trend_time' 
  | 'setup_quality'
  | 'asset_account'
  | 'matrix_comparator' 
  | 'pre_trade_checker';

const SUBTABS: Array<{ id: LabTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; activeColor: string }> = [
  { id: 'overview', label: 'Genel Bakış', icon: Award, activeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'asia_lab', label: 'Asia Edge Lab', icon: Compass, activeColor: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40' },
  { id: 'mistakes_leak', label: 'Hata & Sızıntı Analizi', icon: ShieldAlert, activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'monte_carlo', label: 'Monte Carlo Riski', icon: Dices, activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'confluence', label: 'Konfluans Gücü', icon: Zap, activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'psychology', label: 'Psikoloji & Tilt', icon: Brain, activeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 'day_of_week', label: 'Günlük Edge', icon: Calendar, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'dxy_zone', label: 'DXY & Bölge', icon: Compass, activeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 'mae_mfe', label: 'MAE, MFE & Stop', icon: Target, activeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'ict_concepts', label: 'Likidite & Modeller', icon: Layers, activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'trend_time', label: 'HTF, Entry TF & Saatler', icon: Clock, activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'setup_quality', label: 'A+ Kalite & Disiplin', icon: ShieldCheck, activeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'asset_account', label: 'Parite & Hesap Türü', icon: Scale, activeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { id: 'matrix_comparator', label: 'Kıyaslama', icon: BarChart3, activeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'pre_trade_checker', label: 'Pre-Trade Kontrol', icon: Sparkles, activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
  currency: _currency = '$',
}: StrategyOptimizerHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<LabTab>('overview');

  // Interactive Comparator States
  const [compDimensionX, setCompDimensionX] = useState<'session' | 'dxy' | 'premiumDiscount' | 'planFidelity' | 'trend' | 'htfTimeframe'>('session');
  const [compDimensionY, setCompDimensionY] = useState<'type' | 'entryModels' | 'timeframe' | 'liquiditySweeps'>('type');

  // Pre-Trade Checker States
  const [checkerAsset, setCheckerAsset] = useState<string>('');
  const [checkerType, setCheckerType] = useState<'LONG' | 'SHORT'>('LONG');
  const [checkerSession, setCheckerSession] = useState<string>('');
  const [checkerDxy, setCheckerDxy] = useState<string>('');
  const [checkerZone, setCheckerZone] = useState<string>('');
  const [checkerModel, setCheckerModel] = useState<string>('');
  const [checkerQuality, setCheckerQuality] = useState<string>('');

  const stats: StrategyAnalyticsResult = useMemo(() => calculateStrategyAnalytics(trades), [trades]);

  const uniqueAssets = useMemo(() => Array.from(new Set(trades.map(t => t.asset).filter(Boolean))), [trades]);
  const uniqueSessions = useMemo(() => Array.from(new Set(trades.map(t => t.session).filter(Boolean))), [trades]);
  const uniqueDxys = useMemo(() => Array.from(new Set(trades.map(t => t.dxy).filter(Boolean))), [trades]);
  const uniqueZones = useMemo(() => Array.from(new Set(trades.map(t => t.premiumDiscount).filter(Boolean))), [trades]);
  const uniqueModels = useMemo(() => {
    const list: string[] = [];
    trades.forEach(t => {
      if (Array.isArray(t.entryModels)) list.push(...t.entryModels);
      else if (t.entry) list.push(t.entry);
    });
    return Array.from(new Set(list.filter(Boolean)));
  }, [trades]);

  if (!trades || trades.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-400">
        <Compass className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-200 font-sans">Strateji Geliştirme İçin Yeterli Veri Yok</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto font-sans">
          İşlem eklerken girdiğiniz Parite, Stop/TP Pip, MAE, MFE, Asia Range, DXY, Premium/Discount, Onaylar ve Giriş Modelleri burada otomatik strateji önerilerine ve edge matrislerine dönüştürülür.
        </p>
      </div>
    );
  }

  const { 
    overallScore,
    maeStats, 
    mfeStats, 
    asiaRangeStats, 
    liquiditySweepStats, 
    entryModelStats, 
    trendStats, 
    timeframeMatrix, 
    hourlyStats, 
    dxyStats,
    premiumDiscountStats,
    confirmationStats,
    setupQualityStats,
    sessionDirectionStats,
    disciplineStats, 
    confluenceStats,
    dayOfWeekStats,
    stopSizeStats,
    streakStats,
    monteCarloSimulation,
    redFlagRules,
    goldenSetup, 
    actionableInsights,
    assetStats,
    accountCategoryStats,
    mistakeStats
  } = stats;

  // Comparator dynamic matrix computation
  const comparatorMatrix = useMemo(() => {
    const getValuesX = (t: Trade): string[] => {
      if (compDimensionX === 'session') return [t.session || 'Belirtilmemiş'];
      if (compDimensionX === 'dxy') return [t.dxy || 'Belirtilmemiş'];
      if (compDimensionX === 'premiumDiscount') return [t.premiumDiscount || 'Belirtilmemiş'];
      if (compDimensionX === 'planFidelity') return [t.planFidelity || 'Belirtilmemiş'];
      if (compDimensionX === 'trend') return [t.trend || 'Belirtilmemiş'];
      if (compDimensionX === 'htfTimeframe') return [t.htfTimeframe || 'Belirtilmemiş'];
      return ['Genel'];
    };

    const getValuesY = (t: Trade): string[] => {
      if (compDimensionY === 'type') return [t.type];
      if (compDimensionY === 'timeframe') return [t.timeframe || 'Belirtilmemiş'];
      if (compDimensionY === 'entryModels') {
        if (Array.isArray(t.entryModels) && t.entryModels.length > 0) return t.entryModels;
        if (t.entry) return [t.entry];
        return ['Belirtilmemiş'];
      }
      if (compDimensionY === 'liquiditySweeps') {
        if (Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0) return t.liquiditySweeps;
        if (t.liquiditySweep) return [t.liquiditySweep];
        return ['Belirtilmemiş'];
      }
      return ['Genel'];
    };

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
  }, [trades, compDimensionX, compDimensionY]);

  // Pre-Trade Checker Evaluation
  const checkerResult = useMemo(() => {
    let matchedTrades = trades;
    let criteriaCount = 0;

    if (checkerAsset) {
      matchedTrades = matchedTrades.filter(t => t.asset.toLowerCase() === checkerAsset.toLowerCase());
      criteriaCount++;
    }
    if (checkerType) {
      matchedTrades = matchedTrades.filter(t => t.type === checkerType);
      criteriaCount++;
    }
    if (checkerSession) {
      matchedTrades = matchedTrades.filter(t => (t.session || '').toLowerCase() === checkerSession.toLowerCase());
      criteriaCount++;
    }
    if (checkerDxy) {
      matchedTrades = matchedTrades.filter(t => (t.dxy || '').toLowerCase() === checkerDxy.toLowerCase());
      criteriaCount++;
    }
    if (checkerZone) {
      matchedTrades = matchedTrades.filter(t => (t.premiumDiscount || '').toLowerCase() === checkerZone.toLowerCase());
      criteriaCount++;
    }
    if (checkerModel) {
      matchedTrades = matchedTrades.filter(t => {
        if (Array.isArray(t.entryModels)) return t.entryModels.some(m => m.toLowerCase() === checkerModel.toLowerCase());
        return (t.entry || '').toLowerCase() === checkerModel.toLowerCase();
      });
      criteriaCount++;
    }
    if (checkerQuality) {
      matchedTrades = matchedTrades.filter(t => (t.planFidelity || '').toLowerCase() === checkerQuality.toLowerCase());
      criteriaCount++;
    }

    const total = matchedTrades.length;
    const wins = matchedTrades.filter(t => t.status === 'WIN').length;
    const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
    const netR = Math.round(matchedTrades.reduce((s, t) => s + (t.rr || 0), 0) * 100) / 100;
    const avgR = total > 0 ? Math.round((netR / total) * 100) / 100 : 0;

    let verdict: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'POOR' | 'NO_DATA' = 'NO_DATA';
    if (total >= 2) {
      if (winRate >= 60 && netR > 0) verdict = 'EXCELLENT';
      else if (winRate >= 45 && netR > 0) verdict = 'GOOD';
      else if (netR >= 0) verdict = 'NEUTRAL';
      else verdict = 'POOR';
    }

    return { total, wins, winRate, netR, avgR, verdict, criteriaCount };
  }, [trades, checkerAsset, checkerType, checkerSession, checkerDxy, checkerZone, checkerModel, checkerQuality]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 [&_*]:outline-none [&_*]:focus:outline-none [&_*]:focus-visible:outline-none [&_*]:ring-0 [&_*]:focus:ring-0 [&_button]:outline-none [&_button]:focus:outline-none [&_button]:focus-visible:outline-none [&_button]:ring-0 [&_select]:outline-none [&_select]:focus:outline-none [&_select]:focus-visible:outline-none [&_select]:ring-0"
    >
      
      {/* 1. Header Banner & Health Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-sans tracking-tight">
                Strateji & Edge Geliştirme Laboratuvarı
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                {trades.length} İşlem İncelendi
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-sans uppercase border ${
                overallScore.grade === 'A+' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                overallScore.grade === 'A' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                overallScore.grade === 'B' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                Skor: {overallScore.score}/100 (Derece: {overallScore.grade})
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">Kazanma Oranı</span>
            <span className="text-xs font-black font-sans text-zinc-100">%{overallScore.winRate}</span>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl text-center shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans font-bold">Kâr Faktörü</span>
            <span className={`text-xs font-black font-sans ${overallScore.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {overallScore.profitFactor}
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
      <div className="flex items-center bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs overflow-x-auto custom-scrollbar gap-1">
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] font-sans transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 select-none border ${
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
      </div>

      {/* 3. Animated SubTab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10, scale: 0.997 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.997 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >

      {/* SUBTAB 0: ASIA EDGE LAB */}
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
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {goldenSetup.sampleSize} İşlem
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
            <div className="bg-gradient-to-br from-indigo-950/20 via-zinc-900/60 to-zinc-950 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Scale size={14} /> Disiplin Deltası (A+ vs B-C)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Potansiyel Kurtarma
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed mb-2 font-sans">
                {disciplineStats.disciplineAlphaR > 0
                  ? `Plan dışı (B-C / FOMO) işlemleri tamamen elerseniz portföyünüze net +${disciplineStats.disciplineAlphaR} R eklenmiş olacaktı.`
                  : 'B-C / FOMO işlemlerinizin hesaba net bir negatif etkisi tespit edilmedi. Disiplininizi koruyun!'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-500/15 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block font-sans">A+ / A Kalite Getirisi</span>
                  <span className="text-emerald-400 font-bold font-sans">+{disciplineStats.highQualityNetR} R ({disciplineStats.highQualityTradesCount} İşlem)</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block font-sans">B-C Kalite Kaybı</span>
                  <span className="text-rose-400 font-bold font-sans">{disciplineStats.lowQualityNetR} R ({disciplineStats.lowQualityTradesCount} İşlem)</span>
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
              <Sparkles size={13} className="text-indigo-400" />
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

      {/* SUBTAB 2: MISTAKES & LOSS LEAK ANALYSIS */}
      {activeSubTab === 'mistakes_leak' && (
        <div className="space-y-4">
          {/* Top Summary Banner */}
          <div className="bg-gradient-to-br from-rose-950/20 via-zinc-900/60 to-zinc-950 border border-rose-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-sans block mb-1">
                  Önlenebilir Hesap Sızıntıları
                </span>
                <h4 className="text-base sm:text-lg font-black text-zinc-100 font-sans tracking-tight">
                  Disiplin & Hata Otopsisi
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl font-sans leading-relaxed">
                  B-C kalitesinde zorlama girişler, trende karşı açılan pozisyonlar, yanlış fiyat bölgesinde (Premium'da Long / Discount'ta Short) yapılan işlemler ve tek onayla alınan pozisyonların bilançonuzdan çaldığı toplam kârı inceler.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 shrink-0 w-full md:w-auto">
                <div className="p-3 bg-zinc-950/80 border border-rose-500/30 rounded-xl text-center">
                  <span className="text-[9px] uppercase tracking-wider text-rose-400 block font-sans font-bold">Toplam Sızıntı</span>
                  <span className="text-sm sm:text-base font-black text-rose-400 font-mono">-{mistakeStats.preventableLeakTotalR} R</span>
                </div>
                <div className="p-3 bg-zinc-950/80 border border-emerald-500/30 rounded-xl text-center">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-sans font-bold">Potansiyel Net R</span>
                  <span className="text-sm sm:text-base font-black text-emerald-300 font-mono">+{mistakeStats.potentialNetR} R</span>
                </div>
                <div className="p-3 bg-zinc-950/80 border border-blue-500/30 rounded-xl text-center">
                  <span className="text-[9px] uppercase tracking-wider text-blue-400 block font-sans font-bold">Potansiyel WR</span>
                  <span className="text-sm sm:text-base font-black text-blue-300 font-mono">%{mistakeStats.potentialWinRate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* What-If Simulation Box */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="text-emerald-400 shrink-0" size={18} />
              <div className="text-xs text-zinc-300 font-sans">
                <span className="font-bold text-emerald-300 block">Sıfır Hata Simülasyonu:</span>
                Eğer bu hatalı ve zorlama işlemler elenseydi, net kârınız <span className="font-bold text-emerald-300">+{mistakeStats.preventableLeakTotalR} R</span> daha yüksek olacak ve kazanma oranınız <span className="font-bold text-emerald-300">%{overallScore.winRate}</span> seviyesinden <span className="font-bold text-emerald-300">%{mistakeStats.potentialWinRate}</span> seviyesine yükselecekti.
              </div>
            </div>
          </div>

          {/* Leak Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mistakeStats.leaks.map((leak, idx) => (
              <div key={idx} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block font-sans">
                      {leak.category}
                    </span>
                    <h5 className="text-xs font-bold text-zinc-100 font-sans mt-0.5">
                      {leak.title}
                    </h5>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-rose-400 font-mono block">
                      -{leak.lostR} R Kayıp
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">
                      {leak.count} İşlem (%{leak.winRate} WR)
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-xs text-zinc-300 font-sans leading-relaxed">
                  <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider mb-1">
                    Düzeltme & Strateji Kuralı:
                  </span>
                  {leak.fixAdvice}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: MONTE CARLO SIMULATION */}
      {activeSubTab === 'monte_carlo' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Dices size={16} className="text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Monte Carlo Prop Firm & Drawdown Simülatörü (400 Senaryo x 50 İşlem)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Gelecek Olasılıklar
              </span>
            </div>

            <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg font-sans">
              {monteCarloSimulation.insight}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">-%4 Drawdown Riski</span>
                <span className={`text-base font-bold font-mono ${monteCarloSimulation.simulatedDrawdownRisk4Percent > 30 ? 'text-amber-400' : 'text-zinc-200'}`}>
                  %{monteCarloSimulation.simulatedDrawdownRisk4Percent}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Orta Düzey Drawdown</span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">-%8 Limit Aşma Riski</span>
                <span className={`text-base font-bold font-mono ${monteCarloSimulation.simulatedDrawdownRisk8Percent > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  %{monteCarloSimulation.simulatedDrawdownRisk8Percent}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Challenge Yanma Riski</span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">+10R Hedefe Ulaşma</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  %{monteCarloSimulation.simulatedProbHitting10R}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">50 İşlem İçinde</span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Beklenen Maks. Seri Kayıp</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {monteCarloSimulation.expectedMaxLosingStreak} İşlem
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Art Arda Zarar</span>
              </div>
            </div>

            {/* Simulated Curve Pathways */}
            {monteCarloSimulation.simulatedCurves.length > 0 && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2 font-sans">
                  Örnek 5 Monte Carlo Simülasyon Yörüngesi (50 İşlem Boyunca Büyüme R)
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  {monteCarloSimulation.simulatedCurves.map((curve, idx) => {
                    const finalVal = curve[curve.length - 1];
                    return (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-zinc-950/80 rounded border border-zinc-800 text-[11px]">
                        <span className="text-zinc-500 font-sans">Yörünge #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 text-[10px]">Maks: +{Math.max(...curve)}R / Dip: {Math.min(...curve)}R</span>
                          <span className={`font-bold ${finalVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {finalVal >= 0 ? '+' : ''}{finalVal} R
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CONFLUENCE FACTOR */}
      {activeSubTab === 'confluence' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Konfluans Gücü & Onay Katsayısı (Edge Sweet Spot)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Onay Sayısına Göre Kârlılık
              </span>
            </div>

            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg font-sans">
              {confluenceStats.sweetSpotInsight}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {confluenceStats.brackets.map((b, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 uppercase font-sans">{b.label}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{b.count} İşlem</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-sans">Kazanma Oranı</span>
                    <span className={`font-bold font-sans ${b.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{b.winRate}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-sans">Toplam Getiri</span>
                    <span className={`font-bold font-sans ${b.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.netR >= 0 ? '+' : ''}{b.netR} R
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-sans">Kâr Faktörü</span>
                    <span className="font-bold text-zinc-200 font-sans">{b.profitFactor}</span>
                  </div>
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
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Mevcut Seri</span>
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
                <span className="text-[9px] text-zinc-500 block mt-0.5">İntikam İşlemi Riski</span>
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
                  <span className="text-xs font-bold text-zinc-200 uppercase block font-sans">{d.dayName}</span>
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

      {/* SUBTAB 6: DXY & ZONE & CONFIRMATIONS */}
      {activeSubTab === 'dxy_zone' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* DXY Bias Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-purple-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    DXY (Korelasyon / Bias) Performansı
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {dxyStats.ranking.length} Farklı Bias
                </span>
              </div>
              <p className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg font-sans">
                {dxyStats.insight}
              </p>

              {dxyStats.ranking.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-sans">Henüz DXY verisi girilmemiş.</div>
              ) : (
                <div className="space-y-1.5">
                  {dxyStats.ranking.map((item) => (
                    <div key={item.dxy} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase block font-sans">{item.dxy}</span>
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

              {/* DXY Direction Matrix */}
              {dxyStats.dxyDirectionMatrix.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block font-sans">DXY Bias x İşlem Yönü Kesişimi</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {dxyStats.dxyDirectionMatrix.map((dxDir, i) => (
                      <div key={i} className="p-2 bg-zinc-900 border border-zinc-800/60 rounded-md text-[11px] flex justify-between items-center">
                        <span className="font-bold text-zinc-300">{dxDir.dxy} {dxDir.direction}</span>
                        <span className={`font-bold ${dxDir.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {dxDir.netR >= 0 ? '+' : ''}{dxDir.netR} R (%{dxDir.winRate})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Premium / Discount Zone Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    Premium / Discount Zone Analizi
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {premiumDiscountStats.ranking.length} Bölge
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg font-sans">
                {premiumDiscountStats.insight}
              </p>

              {premiumDiscountStats.ranking.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-sans">Henüz Premium/Discount alanı girilmemiş.</div>
              ) : (
                <div className="space-y-1.5">
                  {premiumDiscountStats.ranking.map((item) => (
                    <div key={item.zone} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase block font-sans">{item.zone}</span>
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
                    MAE (Maksimum Aleyhte Drawdown)
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

              {maeStats.tightStopRecommendation && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200 leading-relaxed font-sans">
                  <span className="font-bold block mb-1 flex items-center gap-1.5 text-blue-300">
                    <ArrowUpRight size={14} /> Stop Loss Daraltma Fırsatı:
                  </span>
                  {maeStats.tightStopRecommendation.insight}
                </div>
              )}
            </div>

            {/* MFE Profit Realization Card */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    MFE (Maksimum Kâr Potansiyeli)
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

              {mfeStats.optimalTpRecommendation && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 leading-relaxed font-sans">
                  <span className="font-bold block mb-1 flex items-center gap-1.5 text-emerald-300">
                    <Sparkles size={14} /> Kâr Realizasyon Analizi:
                  </span>
                  {mfeStats.optimalTpRecommendation.insight}
                </div>
              )}
            </div>

          </div>

          {/* Stop Size Volatility Distribution */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-200 font-sans">Stop Mesafesi (Pip) Dağılımı & Başarı Oranı</span>
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
            
            {/* Liquidity Sweeps */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    Likidite Süpürmeleri Sıralaması
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {liquiditySweepStats.ranking.length} Havuz
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {liquiditySweepStats.ranking.map((s) => (
                  <div key={s.sweep} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{s.sweep}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{s.total} İşlem ({s.wins} Win)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">WR</span>
                        <span className={`font-bold font-sans ${s.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>%{s.winRate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-sans">Net R</span>
                        <span className={`font-bold font-sans ${s.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {s.netR >= 0 ? '+' : ''}{s.netR} R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Entry Models */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    Giriş Modelleri (Breaker, Mitigation, FVG, IFVG)
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
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{m.model}</span>
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
                    Timeframe (HTF) x Entry Timeframe Sinerjisi
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
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{tf.pair}</span>
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
                    Giriş Saatleri (Entry Time) Performansı
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
                    Trend Yapısı (Continuation vs Reversal)
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
                      <span className="font-bold text-zinc-200 uppercase block font-sans">{tr.trend}</span>
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
                  <Scale size={16} className="text-indigo-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    Seans x İşlem Yönü (Long / Short) Kesişimi
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
              const isAPlus = sq.quality.toLowerCase() === 'a+';
              const isA = sq.quality.toLowerCase() === 'a';
              return (
                <div 
                  key={sq.quality}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isAPlus 
                      ? 'bg-emerald-950/20 border-emerald-500/40' 
                      : isA 
                      ? 'bg-blue-950/20 border-blue-500/40' 
                      : 'bg-rose-950/20 border-rose-500/40'
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
                        {sq.netR >= 0 ? '+' : ''}{sq.netR} R
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Kâr Faktörü</span>
                      <span className="font-bold font-sans text-zinc-200">{sq.profitFactor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-sans flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Sadece A+ Kurulum Simülasyonu
              </h5>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                Eğer sadece A+ kurulumları almış ve B-C kalitesindeki setupları tamamen pas geçmiş olsaydınız net kârlılık durumunuz:
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">A+ Net R</span>
                <span className="text-sm font-bold text-emerald-400 font-sans">+{setupQualityStats.onlyAPlusNetR} R</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans">A+ Win Rate</span>
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
                  <Scale size={16} className="text-teal-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    Parite Bazında Performans & Kârlılık
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
                        {ast.total} İşlem ({ast.wins}W / {ast.total - ast.wins}L) • Kâr Faktörü: {ast.profitFactor}
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
                    Hesap Türü & Disiplin Karşılaştırması
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
      {activeSubTab === 'matrix_comparator' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-orange-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  Dinamik Çok Boyutlu Kıyaslama Motoru
                </h4>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold font-sans">X Boyutu:</span>
                  <select
                    value={compDimensionX}
                    onChange={(e: any) => setCompDimensionX(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 font-sans cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-indigo-500/60 select-none"
                  >
                    <option value="session">Seans (Session)</option>
                    <option value="dxy">DXY Bias</option>
                    <option value="premiumDiscount">Bölge (Prem/Disc)</option>
                    <option value="planFidelity">Setup Kalitesi</option>
                    <option value="trend">Trend Yapısı</option>
                    <option value="htfTimeframe">Timeframe (HTF)</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold font-sans">Y Boyutu:</span>
                  <select
                    value={compDimensionY}
                    onChange={(e: any) => setCompDimensionY(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 font-sans cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-indigo-500/60 select-none"
                  >
                    <option value="type">İşlem Yönü (Long/Short)</option>
                    <option value="entryModels">Giriş Modeli</option>
                    <option value="timeframe">Entry Timeframe</option>
                    <option value="liquiditySweeps">Likidite Süpürmesi</option>
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
      )}

      {/* SUBTAB 12: PRE-TRADE EDGE CHECKER */}
      {activeSubTab === 'pre_trade_checker' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                  ⚡ Canlı Pre-Trade Edge Kontrolü & Setup Skorlayıcı
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400 font-sans">
                İşleme girmeden önce setup parametrelerinizi seçin, tarihsel verinizden anında teyit alın!
              </span>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Parite</label>
                <select
                  value={checkerAsset}
                  onChange={(e) => setCheckerAsset(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  {uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Yön</label>
                <select
                  value={checkerType}
                  onChange={(e: any) => setCheckerType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Seans</label>
                <select
                  value={checkerSession}
                  onChange={(e) => setCheckerSession(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">DXY</label>
                <select
                  value={checkerDxy}
                  onChange={(e) => setCheckerDxy(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  {uniqueDxys.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Bölge</label>
                <select
                  value={checkerZone}
                  onChange={(e) => setCheckerZone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Model</label>
                <select
                  value={checkerModel}
                  onChange={(e) => setCheckerModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1 font-sans">Kalite</label>
                <select
                  value={checkerQuality}
                  onChange={(e) => setCheckerQuality(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus:border-emerald-500/60 cursor-pointer select-none"
                >
                  <option value="">Tümü</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B-C">B-C</option>
                </select>
              </div>
            </div>

            {/* Verdict Box */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              checkerResult.verdict === 'EXCELLENT' ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' :
              checkerResult.verdict === 'GOOD' ? 'bg-blue-950/20 border-blue-500/40 text-blue-200' :
              checkerResult.verdict === 'POOR' ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' :
              'bg-zinc-900/60 border-zinc-800 text-zinc-300'
            }`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block font-sans">
                  {checkerResult.verdict === 'EXCELLENT' ? '🟢 A+ YÜKSEK OLASILIKLI EDGE: İŞLEM ALINABİLİR' :
                   checkerResult.verdict === 'GOOD' ? '🔵 OLUMLU BEKLENTİLİ KURULUM: GEÇERLİ' :
                   checkerResult.verdict === 'POOR' ? '🔴 DİKKAT: TARİHSEL ZARARLI BÖLGE (İŞLEM ÖNERİLMEZ)' :
                   '⚪ YETERLİ TARİHSEL EŞLEŞME YOK'}
                </span>
                <p className="text-[11px] opacity-80 mt-1 font-sans">
                  Tarihsel verinizde bu parametrelere uyan toplam {checkerResult.total} işlem bulundu.
                </p>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <span className="text-[9px] uppercase tracking-wider opacity-60 block font-sans">Tarihsel Win Rate</span>
                  <span className="text-sm font-black font-sans">%{checkerResult.winRate}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider opacity-60 block font-sans">Net R Getirisi</span>
                  <span className="text-sm font-black font-sans">{checkerResult.netR >= 0 ? '+' : ''}{checkerResult.netR} R</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
});

export default StrategyOptimizerHub;
