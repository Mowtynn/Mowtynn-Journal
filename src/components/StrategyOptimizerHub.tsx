import { SPRING } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Target,
  Compass,
  Sparkles,
  Activity,
  Brain,
  ClipboardList,
  FlaskConical,
} from 'lucide-react';
import { Trade } from '../types';
import { useNewsDayLabels } from '../hooks/useNewsDayLabels';
import { calculateStrategyAnalytics, StrategyAnalyticsResult, MIN_SAMPLE } from '../lib/strategyAnalytics';
import { AsiaEdgeLab } from './AsiaEdgeLab';
import { SetupScorecardTab } from './strategy/SetupScorecardTab';
import { EdgeSummaryCard } from './deepAnalysis/EdgeCockpit';
import { TradeHistoryModal } from './TradeHistoryModal';
import { RuleSimulatorTab } from './strategy/RuleSimulatorTab';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { fixed, formatR } from '../lib/format';


interface StrategyOptimizerHubProps {
  trades: Trade[];
  onViewTrade?: (trade: Trade) => void;
  /** Edge Özeti satırlarından açılan işlem listesinde düzenleme */
  onEdit?: (trade: Trade) => void;
}

type LabTab =
  | 'edge_summary'
  | 'rule_sim'
  | 'setup_scorecard'
  | 'asia_lab'
  | 'psychology'
  | 'stop_range';

// İş akışı sırasıyla: önce ne çalıştığını gör, sonra ayrıntıya in, en son davranışı kontrol et
const SUBTABS: Array<{ id: LabTab; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'edge_summary', label: 'Edge Özeti', desc: 'Ne çalışıyor, ne sızdırıyor', icon: Sparkles },
  { id: 'setup_scorecard', label: 'Kurulum Karnesi', desc: 'Kurulumları karşılaştır', icon: ClipboardList },
  { id: 'asia_lab', label: 'Asia Edge Lab', desc: "Asia Range'e özgü analiz", icon: Compass },
  { id: 'stop_range', label: 'Stop & Range', desc: 'Stop ve range genişliği', icon: Target },
  { id: 'rule_sim', label: 'Kural Simülatörü', desc: 'Bir kuralı geçmişte dene', icon: FlaskConical },
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

/** R değeri: işaret + 2 basamak (projedeki diğer R gösterimleriyle aynı) */
const fmtSignedR = (v: number) => formatR(v);

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
  onEdit,
}: StrategyOptimizerHubProps) {
  // Edge Özeti satırlarına tıklanınca ilgili işlemler geçmiş penceresinde açılır
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
          İşlem eklerken girdiğin Parite, Stop/TP Pip, Asia Range, Target (çıkış hedefi), Confirmations, Onaylar ve Giriş Modelleri burada otomatik strateji önerilerine ve edge matrislerine dönüştürülür.
        </p>
      </div>
    
  );

  const { 
    asiaRangeStats, 
    stopSizeStats,
    streakStats,
  } = stats;

  if (isEmpty) return emptyState;

  return (
    // Giriş animasyonu Detaylı Analiz'in görünüm sarmalayıcısında (.pane-content-in); burada ikinci bir animasyon yok
    <div className="space-y-3">
      
      {/* Laboratuvar sekmeleri: Detaylı Analiz sekme çubuğuyla aynı görünüm (kayan gösterge, ok tuşları) */}
      <div
        role="tablist"
        aria-label="Laboratuvar sekmeleri"
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1 bg-zinc-950/60 border border-zinc-800/80 p-1 rounded-2xl"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
          const els = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const idx = els.findIndex((el) => el === document.activeElement);
          if (idx < 0) return;
          e.preventDefault();
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (idx + (e.key === 'ArrowRight' ? 1 : -1) + els.length) % els.length;
          els[next].focus();
          els[next].click();
        }}
      >
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              title={tab.desc}
              onClick={() => setActiveSubTab(tab.id)}
              className={`relative min-w-0 px-2 py-2 text-xs font-bold rounded-xl transition-ui duration-150 cursor-pointer select-none ${
                isActive ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeLabTabIndicator"
                  className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/30 shadow-xs"
                  transition={SPRING.indicator}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5 min-w-0">
                <Icon size={14} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span className="truncate">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Animated SubTab Content */}
      {/* Sekme içeriği anında değişir (çıkış animasyonu beklenmez); girişte kısa CSS geçişi */}
        <div key={activeSubTab} className="pane-content-in space-y-3">
      {/* Bir sekmede hata olursa yalnızca o sekme etkilenir; sekme değişince sıfırlanır */}
      <SectionErrorBoundary key={activeSubTab} sectionName={SUBTABS.find((t) => t.id === activeSubTab)?.label}>

      {activeSubTab === 'edge_summary' && <EdgeSummaryCard trades={trades} onShowTrades={showTrades} />}

      {activeSubTab === 'rule_sim' && <RuleSimulatorTab trades={trades} />}


      {activeSubTab === 'setup_scorecard' && <SetupScorecardTab trades={trades} />}

      {activeSubTab === 'asia_lab' && <AsiaEdgeLab trades={trades} />}




      {/* SUBTAB 4: PSYCHOLOGY & TILT */}
      {activeSubTab === 'psychology' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-blue-400" />
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

            <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg font-sans">
              {streakStats.insight}
            </p>
            <p className="text-[10px] text-zinc-500 font-sans -mt-2">
              Seriler tüm geçmişten sayılır; başabaş (BE) işlemler seriyi bozmaz, seriye de sayılmaz. "Aynı gün" kartları yalnızca aynı NY gününde bir kazanç / kayıptan sonra açılan işlemlere bakar; karşılaştırma tabanı günün ilk işlemidir.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">{smartUpper("Mevcut Seri")}</span>
                <span className={`text-base font-bold font-sans ${streakStats.currentStreak.type === 'WIN' ? 'text-emerald-400' : streakStats.currentStreak.type === 'LOSS' ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {streakStats.currentStreak.type === 'WIN' ? `${streakStats.currentStreak.count} Kazanç` : streakStats.currentStreak.type === 'LOSS' ? `${streakStats.currentStreak.count} Kayıp` : '—'}
                </span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Maks. Kayıp Serisi</span>
                <span className="text-base font-bold text-rose-400 font-sans">
                  {streakStats.maxLossStreak} İşlem
                </span>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Aynı Gün Kazanç Sonrası</span>
                <span className="text-base font-bold text-zinc-200 font-sans tabular-nums">
                  {streakStats.postWinTotal > 0 ? `%${fixed(streakStats.postWinWinRate, 1)}` : '—'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">
                  {streakStats.postWinTotal > 0 ? `${streakStats.postWinTotal} işlem · ${formatR(streakStats.postWinAvgR)} ort.` : 'İşlem yok'}
                </span>
                {streakStats.postWinTotal > 0 && streakStats.postWinTotal < MIN_SAMPLE && <span className="mt-1 inline-block px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide">Az Veri</span>}
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-sans">Aynı Gün Kayıp Sonrası</span>
                <span className={`text-base font-bold font-sans tabular-nums ${streakStats.postLossTiltRisk !== 'DÜŞÜK' ? 'text-rose-400' : 'text-zinc-200'}`}>
                  {streakStats.postLossTotal > 0 ? `%${fixed(streakStats.postLossWinRate, 1)}` : '—'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">
                  {streakStats.postLossTotal > 0 ? `${streakStats.postLossTotal} işlem · ${formatR(streakStats.postLossAvgR)} ort.` : 'İşlem yok'}
                </span>
                <span className="text-[9px] text-zinc-600 block">
                  Günün ilk işlemi: {formatR(streakStats.firstTradeAvgR)} ort.
                </span>
                {streakStats.postLossTotal > 0 && streakStats.postLossTotal < MIN_SAMPLE && <span className="mt-1 inline-block px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide">Az Veri</span>}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* STOP & ASIA RANGE: stop mesafesi ve range genişliğine göre sonuç */}
      {activeSubTab === 'stop_range' && (
        <div className="space-y-4">
          {/* Stop Size Volatility Distribution */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            {/* Başlık kendi satırında; uzun yorum cümlesi başlığın yanına sıkışmaz, kartların altında not olarak durur */}
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-200 font-sans flex items-center gap-1.5">
                <Target size={14} className="text-blue-400 shrink-0" />
                {smartUpper("Stop Mesafesi (Pip) Dağılımı")}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-sans -mt-1">Stop pip'in, paritenin kendi medyan stop'una oranına göre üç grup: her grubun net R'si, kazanma oranı ve işlem başı R'si.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {stopSizeStats.brackets.map((b) => (
                <div key={b.label} className="px-3 py-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center gap-3">
                  <div>
                    <span className="font-bold text-zinc-200 block font-sans">{b.label}</span>
                    <span className="text-[10px] text-zinc-500 font-sans">{b.total || b.count} işlem</span>
                    {b.count < MIN_SAMPLE && <span className="ml-1.5 px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide align-middle">Az Veri</span>}
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block font-sans tabular-nums ${b.netR > 0 ? 'text-emerald-400' : b.netR < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                      {fmtSignedR(b.netR)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans tabular-nums whitespace-nowrap">%{fixed(b.winRate, 1)} WR · ort. {fmtSignedR(b.avgR)}</span>
                  </div>
                </div>
              ))}
            </div>
            {stopSizeStats.insight && (
              <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-zinc-300 font-sans leading-relaxed">{stopSizeStats.insight}</p>
            )}
          </div>

          {/* Asia Range Volatility Analysis */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-200 font-sans flex items-center gap-1.5">
                <Activity size={14} className="text-blue-400 shrink-0" />
                {smartUpper("Asia Range Genişliği")}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-sans -mt-1">Asia Range pip'in, aynı paritenin ÖNCEKİ işlemlerindeki medyan range'e oranı (girişte bilinen; paritenin ilk 5 işlemi sınıflanmaz): dar / normal / geniş günlerde sonuçlar.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[asiaRangeStats.brackets.tight, asiaRangeStats.brackets.medium, asiaRangeStats.brackets.wide].map((b) => (
                <div key={b.label} className="px-3 py-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center gap-3">
                  <div>
                    <span className="font-bold text-zinc-200 block font-sans">{b.label}</span>
                    <span className="text-[10px] text-zinc-500 font-sans">{b.count} işlem</span>
                    {b.count < MIN_SAMPLE && <span className="ml-1.5 px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide align-middle">Az Veri</span>}
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block font-sans tabular-nums ${b.netR > 0 ? 'text-emerald-400' : b.netR < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                      {fmtSignedR(b.netR)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans tabular-nums whitespace-nowrap">%{fixed(b.winRate, 1)} WR · ort. {fmtSignedR(b.avgR)}</span>
                  </div>
                </div>
              ))}
            </div>
            {asiaRangeStats.insight && (
              <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-zinc-300 font-sans leading-relaxed">{asiaRangeStats.insight}</p>
            )}
          </div>
        </div>
      )}





      </SectionErrorBoundary>
        </div>

      <TradeHistoryModal
        isOpen={!!shownTrades}
        onClose={() => setShownTrades(null)}
        title={shownTrades?.title || ''}
        icon={<Compass size={16} className="shrink-0" />}
        trades={shownTrades?.trades || []}
        onEdit={onEdit ? (t) => { onEdit(t); setShownTrades(null); } : undefined}
      />
    </div>
  );
});

export default StrategyOptimizerHub;
