import { EASE } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  TrendingUp,
  Compass,
  Sparkles,
  ShieldCheck,
  Activity,
  Brain,
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
import { RuleSimulatorTab } from './strategy/RuleSimulatorTab';
import { ExcursionSimulators } from './strategy/ExcursionSimulators';
import { SectionErrorBoundary } from './SectionErrorBoundary';


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
  | 'mae_mfe';

// İş akışı sırasıyla: önce ne çalıştığını gör, sonra ayrıntıya in, en son davranışı kontrol et
const SUBTABS: Array<{ id: LabTab; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'edge_summary', label: 'Edge Özeti', desc: 'Ne çalışıyor, ne sızdırıyor', icon: Sparkles },
  { id: 'setup_scorecard', label: 'Kurulum Karnesi', desc: 'Kurulumları karşılaştır', icon: ClipboardList },
  { id: 'asia_lab', label: 'Asia Edge Lab', desc: "Asia Range'e özgü analiz", icon: Compass },
  { id: 'mae_mfe', label: 'MAE, MFE & Stop', desc: 'Stop ve TP ayarı', icon: Target },
  { id: 'rule_sim', label: 'Kural Simülatörü', desc: 'Bir kuralı geçmişte dene', icon: FlaskConical },
  { id: 'discipline', label: 'Disiplin', desc: 'Kural ihlalinin bedeli', icon: ShieldCheck },
  { id: 'psychology', label: 'Psikoloji & Tilt', desc: 'Seri ve kayıp sonrası', icon: Brain },
];

const TAB_KEY = 'tj.lab.tab';
const loadTab = (): LabTab => {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (v && SUBTABS.some((t) => t.id === v)) return v as LabTab;
  } catch {
    /* depolama kapalı olabilir */
  }
  return 'edge_summary';
};

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
  onEdit,
}: StrategyOptimizerHubProps) {
  // Edge Özeti / Disiplin satırlarına tıklanınca ilgili işlemler geçmiş penceresinde açılır
  const [shownTrades, setShownTrades] = useState<{ title: string; trades: Trade[] } | null>(null);
  const showTrades = useCallback((title: string, list: Trade[]) => setShownTrades({ title, trades: list }), []);
  const [activeSubTab, setActiveSubTabState] = useState<LabTab>(loadTab);
  const setActiveSubTab = useCallback((id: LabTab) => {
    setActiveSubTabState(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* depolama kapalı olabilir */
    }
  }, []);

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
      
      {/* 1. Başlık */}
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
      </div>

      {/* 2. SubTab Navigation Bar */}
      <nav aria-label="Laboratuvar sekmeleri" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveSubTab(tab.id)}
              className={`group min-w-0 rounded-xl border px-3 py-2.5 text-left transition-ui cursor-pointer select-none ${
                isActive
                  ? 'border-blue-500/50 bg-blue-500/10 shadow-xs'
                  : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <span className={`flex items-center gap-1.5 text-[12px] font-bold font-sans ${isActive ? 'text-blue-200' : 'text-zinc-200'}`}>
                <Icon size={14} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span className="truncate">{tab.label}</span>
              </span>
              <span className={`mt-0.5 block text-[10px] font-sans leading-snug truncate ${isActive ? 'text-blue-300/70' : 'text-zinc-500'}`}>{tab.desc}</span>
            </button>
          );
        })}
      </nav>

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
      {/* Bir sekmede hata olursa yalnızca o sekme etkilenir; sekme değişince sıfırlanır */}
      <SectionErrorBoundary key={activeSubTab} sectionName={SUBTABS.find((t) => t.id === activeSubTab)?.label}>

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
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Maks. Kayıp Serisi</span>
                <span className="text-base font-bold text-rose-400 font-sans">
                  {streakStats.maxLossStreak} İşlem
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
                <span className="block text-[11px] text-zinc-400 mt-0.5">Fiyat en az stop mesafesi kadar lehine gitti ama işlem zararla ya da başabaşta kapandı. BE / kısmi kâr kuralını aşağıdaki TP simülatörüyle test et.</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-amber-300">
                {mfeStats.missedProfitTradesCount} işlem · {(Math.round(mfeStats.missedProfitTrades.reduce((a, t) => a + Math.min(0, t.rr || 0), 0) * 100) / 100).toFixed(2)} R
              </span>
            </button>
          )}

          <ExcursionSimulators trades={trades} />
        </div>
      )}





      </SectionErrorBoundary>
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
