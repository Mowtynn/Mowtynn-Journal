import React, { useState, useMemo } from 'react';
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
  Info,
  Award
} from 'lucide-react';
import { Trade } from '../types';
import { calculateStrategyAnalytics } from '../lib/strategyAnalytics';

interface StrategyOptimizerHubProps {
  trades: Trade[];
  currency?: string;
  onViewTrade?: (trade: Trade) => void;
}

export const StrategyOptimizerHub = React.memo(function StrategyOptimizerHub({
  trades,
}: StrategyOptimizerHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'mae_mfe' | 'asia_range' | 'ict_concepts' | 'trend_time'>('overview');

  const stats = useMemo(() => calculateStrategyAnalytics(trades), [trades]);

  if (!trades || trades.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-400">
        <Compass className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-200">Strateji Geliştirme İçin Yeterli Veri Yok</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
          İşlem eklerken girdiğiniz Parite, Stop/TP Pip, MAE, MFE, Asia Range, Likidite Süpürmeleri ve Giriş Modelleri burada otomatik strateji önerilerine dönüştürülür.
        </p>
      </div>
    );
  }

  const { maeStats, mfeStats, asiaRangeStats, liquiditySweepStats, entryModelStats, trendStats, timeframeMatrix, hourlyStats, disciplineStats, goldenSetup, actionableInsights } = stats;

  return (
    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Compass size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-sans tracking-tight">
                Strateji & Edge Geliştirme Laboratuvarı
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {trades.length} İşlem İncelendi
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Girilen Pip, MAE, MFE, Asia Range ve ICT parametrelerinin matematiksel optimizasyon analizi
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Genel Bakış & Öneriler
          </button>
          <button
            onClick={() => setActiveSubTab('mae_mfe')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'mae_mfe'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            MAE & MFE (Pip)
          </button>
          <button
            onClick={() => setActiveSubTab('asia_range')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'asia_range'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Asia Range Matrisi
          </button>
          <button
            onClick={() => setActiveSubTab('ict_concepts')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'ict_concepts'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Likidite & Giriş Modelleri
          </button>
          <button
            onClick={() => setActiveSubTab('trend_time')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'trend_time'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Trend, HTF & Saatler
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OVERVIEW & TOP ACTIONABLE RECOMMENDATIONS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Top Hero Cards: Golden Formula & Discipline Delta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Golden Setup Formula */}
            <div className="bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-950 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={13} className="text-amber-400" /> Senin Altın Setup Formülün
                </span>
                {goldenSetup.hasFormula && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {goldenSetup.sampleSize} İşlem
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-zinc-100 leading-relaxed mb-3">
                {goldenSetup.hasFormula ? goldenSetup.description : 'Farklı parite, seans ve modellerde daha fazla işlem kaydettikçe en karlı formülünüz burada belirecektir.'}
              </p>
              {goldenSetup.hasFormula ? (
                <div className="flex items-center gap-4 pt-2 border-t border-amber-500/15 text-xs font-mono">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Kazanma Oranı</span>
                    <span className="text-emerald-400 font-bold font-sans">%{goldenSetup.winRate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Üretilen Net R</span>
                    <span className="text-amber-300 font-bold font-sans">+{goldenSetup.netR} R</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 italic">
                  İşlem eklerken Seans, Likidite Süpürmesi ve Giriş Modeli seçmeyi unutmayın.
                </div>
              )}
            </div>

            {/* Discipline Alpha */}
            <div className="bg-gradient-to-br from-indigo-950/20 via-zinc-900/60 to-zinc-950 border border-indigo-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-indigo-400" /> Disiplin Deltası (Kural Sadakati)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Plan Kalitesi
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-100 leading-relaxed mb-3">
                {disciplineStats.disciplineAlphaR > 0 ? (
                  <>Plan dışı / FOMO / C-kalite işlemler elenseydi, kasanız tam <span className="text-emerald-400 font-bold">+{disciplineStats.disciplineAlphaR} R</span> daha kârda olacaktı!</>
                ) : (
                  <>A+ ve Plana Sadık işlemleriniz: <span className="text-indigo-300 font-bold">{disciplineStats.highQualityTradesCount} işlemde %{disciplineStats.highQualityWinRate} WR</span> ve <span className="text-emerald-400 font-bold">+{disciplineStats.highQualityNetR} R</span> kazanç sağladı.</>
                )}
              </p>
              <div className="flex items-center gap-4 pt-2 border-t border-indigo-500/15 text-xs font-mono">
                <div>
                  <span className="text-zinc-400 text-[10px] block">A+ / Sadık İşlemler</span>
                  <span className="text-emerald-400 font-bold font-sans">+{disciplineStats.highQualityNetR} R</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">Disiplinsiz İşlemler</span>
                  <span className={`font-bold font-sans ${disciplineStats.lowQualityNetR >= 0 ? 'text-zinc-300' : 'text-rose-400'}`}>
                    {disciplineStats.lowQualityNetR >= 0 ? '+' : ''}{disciplineStats.lowQualityNetR} R
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Insights List */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={13} className="text-indigo-400" />
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Verilerinizden Çıkarılan En Kritik Strateji İpuçları
              </h4>
            </div>

            {actionableInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {actionableInsights.map((insight, idx) => {
                  const isWarning = insight.type === 'warning';
                  const isOpportunity = insight.type === 'opportunity';
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                        isWarning 
                          ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50' 
                          : isOpportunity
                            ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                            : 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                            isWarning ? 'text-rose-400' : isOpportunity ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {isWarning ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                            {insight.title}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                            isWarning ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {insight.metricTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-400">
                Verileriniz toplandıkça spesifik iyileştirme ipuçları ve optimizasyon alarmları burada listelenecektir.
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">Ort. Kazanan MAE</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {maeStats.hasData ? `${maeStats.avgMaeWins} Pip` : '-'}
              </span>
              <span className="text-[9px] text-zinc-500 block">Kazanmadan önceki max düşüş</span>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">Ort. Kazanan MFE</span>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {mfeStats.hasData ? `${maeStats.avgMaeWins} Pip` : '-'}
              </span>
              <span className="text-[9px] text-zinc-500 block">Görülen max lehte tepe</span>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">MFE Realizasyon Oranı</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {mfeStats.hasData && mfeStats.mfeRealizationRate > 0 ? `%${mfeStats.mfeRealizationRate}` : '-'}
              </span>
              <span className="text-[9px] text-zinc-500 block">Potansiyel kârı alma oranı</span>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">En Verimli Asia Range</span>
              <span className="text-xs font-bold text-indigo-400 font-mono">
                {asiaRangeStats.hasData ? asiaRangeStats.bestBracket : '-'}
              </span>
              <span className="text-[9px] text-zinc-500 block">En yüksek WR getiren aralık</span>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MAE & MFE DEEP DIVE */}
      {activeSubTab === 'mae_mfe' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MAE CARD */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    MAE
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">Maximum Adverse Excursion</h4>
                    <span className="text-[10px] text-zinc-400">İşlem içi aleyhte yaşanan en derin drawdown</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {maeStats.tradeCount} Veri
                </span>
              </div>

              {maeStats.hasData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Tüm İşlemler Ort.</span>
                      <span className="text-xs font-bold text-zinc-200 font-mono">{maeStats.avgMaeAll} Pip</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Kazananlarda Ort.</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{maeStats.avgMaeWins} Pip</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Kaybedenlerde Ort.</span>
                      <span className="text-xs font-bold text-rose-400 font-mono">{maeStats.avgMaeLosses} Pip</span>
                    </div>
                  </div>

                  {/* Stop Cushion Meter */}
                  <div className="bg-zinc-900/70 p-3 rounded-lg border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 text-[11px] font-medium">Stop Loss Güvenlik Yastığı (Cushion)</span>
                      <span className="font-bold text-indigo-400 font-mono">%{maeStats.stopCushionEfficiency} Boş Alan</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.max(5, 100 - maeStats.stopCushionEfficiency)}%` }} 
                        title={`Kullanılan MAE: ${maeStats.avgMaeWins} Pip`}
                      />
                      <div 
                        className="h-full bg-indigo-500/50" 
                        style={{ width: `${Math.min(95, maeStats.stopCushionEfficiency)}%` }} 
                        title={`Kullanılmayan Güvenlik Marjı`}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal pt-1">
                      Kazanan işlemlerinizde ortalama stop mesafesi <strong>{maeStats.avgStopPips} Pip</strong> iken, fiyat lehinize dönmeden önce aleyhinize sadece <strong>{maeStats.avgMaeWins} Pip</strong> gitti.
                    </p>
                  </div>

                  {maeStats.tightStopRecommendation && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                        <Sparkles size={13} />
                        Stop Optimizasyon Fırsatı
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-300">
                        {maeStats.tightStopRecommendation.insight}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  İşlem eklerken MAE (Pip) ve Stop (Pip) değerlerini girdiğinizde stop daraltma simülasyonları burada görünecektir.
                </div>
              )}
            </div>

            {/* MFE CARD */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    MFE
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">Maximum Favorable Excursion</h4>
                    <span className="text-[10px] text-zinc-400">İşlem içi lehte ulaşılan en yüksek tepe kâr</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {mfeStats.tradeCount} Veri
                </span>
              </div>

              {mfeStats.hasData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Ort. MFE</span>
                      <span className="text-xs font-bold text-cyan-400 font-mono">{mfeStats.avgMfeWins} Pip</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Ort. Alınan TP</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{mfeStats.avgTpPips} Pip</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block">Masada Bırakılan</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">{mfeStats.leftOnTheTablePips} Pip</span>
                    </div>
                  </div>

                  {/* Realization Rate Progress Bar */}
                  <div className="bg-zinc-900/70 p-3 rounded-lg border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 text-[11px] font-medium">Kâr Realizasyon Verimliliği</span>
                      <span className="font-bold text-emerald-400 font-mono">%{mfeStats.mfeRealizationRate} Alındı</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, Math.max(5, mfeStats.mfeRealizationRate))}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal pt-1">
                      İşlem lehinize ortalama <strong>{mfeStats.avgMfeWins} Pip</strong> gitmesine rağmen, realize edilen kâr ortalama <strong>{mfeStats.avgTpPips} Pip</strong>.
                    </p>
                  </div>

                  {mfeStats.missedProfitTradesCount > 0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs">
                      <div className="font-bold flex items-center justify-between text-rose-400 mb-1">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={13} />
                          {mfeStats.missedProfitTradesCount} İşlemde Kâr Korunamadı
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Fiyat lehinize derin gitmesine rağmen (yüksek MFE), trailing stop veya kısmi kâr (Partial TP) alınmadığı için işlem BE/Zarar kapandı.
                      </p>
                    </div>
                  )}

                  {mfeStats.optimalTpRecommendation && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs text-indigo-200">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-indigo-400">
                        <Target size={13} />
                        TP Eşiği Tavsiyesi
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {mfeStats.optimalTpRecommendation.insight}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  İşlem eklerken MFE (Pip) ve Take Profit (Pip) değerlerini girdiğinizde masada bırakılan kâr analizi burada görünecektir.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ASIA RANGE VOLATILITY MATRIX */}
      {activeSubTab === 'asia_range' && (
        <div className="space-y-4">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  🌏
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">Asia Range Volatilite & Strateji Filtresi</h4>
                  <span className="text-[10px] text-zinc-400">Asya seansı aralığının Londra ve New York işlemlerindeki başarıya etkisi</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {asiaRangeStats.tradeCount} Veri
              </span>
            </div>

            {asiaRangeStats.hasData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Tight */}
                  <div className={`p-3.5 rounded-xl border ${
                    asiaRangeStats.brackets.tight.winRate >= 60 ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-zinc-900/60 border-zinc-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-200">Dar Asia (&lt; 20 Pip)</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {asiaRangeStats.brackets.tight.count} İşlem
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Win Rate:</span>
                        <span className="font-bold text-emerald-400 font-mono">%{asiaRangeStats.brackets.tight.winRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Net R:</span>
                        <span className="font-bold font-mono text-zinc-200">{asiaRangeStats.brackets.tight.netR >= 0 ? '+' : ''}{asiaRangeStats.brackets.tight.netR} R</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Profit Factor:</span>
                        <span className="font-bold font-mono text-zinc-200">{asiaRangeStats.brackets.tight.profitFactor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Medium */}
                  <div className={`p-3.5 rounded-xl border ${
                    asiaRangeStats.brackets.medium.winRate >= 60 ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-zinc-900/60 border-zinc-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-200">Normal (20 - 35 Pip)</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {asiaRangeStats.brackets.medium.count} İşlem
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Win Rate:</span>
                        <span className="font-bold text-emerald-400 font-mono">%{asiaRangeStats.brackets.medium.winRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Net R:</span>
                        <span className="font-bold font-mono text-zinc-200">{asiaRangeStats.brackets.medium.netR >= 0 ? '+' : ''}{asiaRangeStats.brackets.medium.netR} R</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Profit Factor:</span>
                        <span className="font-bold font-mono text-zinc-200">{asiaRangeStats.brackets.medium.profitFactor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wide */}
                  <div className={`p-3.5 rounded-xl border ${
                    asiaRangeStats.brackets.wide.netR < 0 ? 'bg-rose-950/20 border-rose-500/40' : 'bg-zinc-900/60 border-zinc-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-200">Geniş (&gt; 35 Pip)</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {asiaRangeStats.brackets.wide.count} İşlem
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Win Rate:</span>
                        <span className={`font-bold font-mono ${asiaRangeStats.brackets.wide.winRate < 45 ? 'text-rose-400' : 'text-zinc-200'}`}>
                          %{asiaRangeStats.brackets.wide.winRate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Net R:</span>
                        <span className={`font-bold font-mono ${asiaRangeStats.brackets.wide.netR < 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                          {asiaRangeStats.brackets.wide.netR >= 0 ? '+' : ''}{asiaRangeStats.brackets.wide.netR} R
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Profit Factor:</span>
                        <span className="font-bold font-mono text-zinc-200">{asiaRangeStats.brackets.wide.profitFactor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                    <Info size={13} />
                    ICT Volatilite Kuralı Tespiti
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {asiaRangeStats.insight}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-500">
                İşlem eklerken Asia Range (Pip) girdiğinizde aralık performansınız burada analiz edilir.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: ICT CONCEPTS (LIQUIDITY SWEEPS & ENTRY MODELS) */}
      {activeSubTab === 'ict_concepts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Liquidity Sweeps */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-zinc-100">Likidite Süpürmeleri (Liquidity Sweeps)</h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Net R Sıralı</span>
              </div>

              {liquiditySweepStats.hasData ? (
                <div className="space-y-2">
                  {liquiditySweepStats.ranking.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-zinc-200 text-[11px]">{s.sweep}</div>
                        <div className="text-[10px] text-zinc-500">
                          {s.total} İşlem ・ %{s.winRate} WR ・ PF: {s.profitFactor}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className={s.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {s.netR >= 0 ? '+' : ''}{s.netR} R
                        </span>
                        <div className="text-[9px] text-zinc-500">
                          Ort: {s.avgR >= 0 ? '+' : ''}{s.avgR} R
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Multi-sweep comparison box */}
                  <div className="mt-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                    <span className="font-bold text-blue-300 block mb-0.5 text-[11px]">Çoklu Likidite Süpürmesi Karşılaştırması:</span>
                    <div className="flex justify-between text-[10px] text-zinc-300 pt-1">
                      <span>Tek Süpürme: %{liquiditySweepStats.multiSweepEdge.singleSweepWinRate} WR ({liquiditySweepStats.multiSweepEdge.singleSweepNetR >= 0 ? '+' : ''}{liquiditySweepStats.multiSweepEdge.singleSweepNetR} R)</span>
                      <span className="font-bold text-emerald-400">Çoklu: %{liquiditySweepStats.multiSweepEdge.multiSweepWinRate} WR ({liquiditySweepStats.multiSweepEdge.multiSweepNetR >= 0 ? '+' : ''}{liquiditySweepStats.multiSweepEdge.multiSweepNetR} R)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  İşlem eklerken Likidite Süpürmesi seçtiğinizde burası güncellenir.
                </div>
              )}
            </div>

            {/* Entry Models */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100">Giriş Modelleri (Entry Models)</h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Net R Sıralı</span>
              </div>

              {entryModelStats.hasData ? (
                <div className="space-y-2">
                  {entryModelStats.ranking.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-zinc-200 text-[11px]">{m.model}</div>
                        <div className="text-[10px] text-zinc-500">
                          {m.total} İşlem ・ %{m.winRate} WR ・ PF: {m.profitFactor}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className={m.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {m.netR >= 0 ? '+' : ''}{m.netR} R
                        </span>
                        <div className="text-[9px] text-zinc-500">
                          Ort: {m.avgR >= 0 ? '+' : ''}{m.avgR} R
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  İşlem eklerken Giriş Modeli (IFVG, FVG, OB vb.) seçtiğinizde burası güncellenir.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: TREND, TIMEFRAME & TIME */}
      {activeSubTab === 'trend_time' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trend Performance & Reversal Leak */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-cyan-400" />
                  <h4 className="text-xs font-bold text-zinc-100">Trend Yapısı Performansı</h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Continuation vs Reversal</span>
              </div>

              {trendStats.hasData ? (
                <div className="space-y-2">
                  {trendStats.ranking.map((tr, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-zinc-200 text-[11px]">{tr.trend}</div>
                        <div className="text-[10px] text-zinc-500">
                          {tr.total} İşlem ・ %{tr.winRate} WR
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className={tr.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {tr.netR >= 0 ? '+' : ''}{tr.netR} R
                        </span>
                      </div>
                    </div>
                  ))}

                  {trendStats.reversalCostR > 0 && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-300">
                      <span className="font-bold block text-[11px]">Trend Tersi Sızıntısı:</span>
                      Trend dönüşü (Reversal) aranan işlemleriniz toplam <strong>-{trendStats.reversalCostR} R</strong> zarar yarattı.
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Trend yapısı (Continuation/Reversal) seçildiğinde burada analiz edilir.
                </div>
              )}
            </div>

            {/* Timeframe Matrix (HTF + LTF) */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <h4 className="text-xs font-bold text-zinc-100">HTF + LTF Zaman Dilimi Sinerjisi</h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">En Verimli Çiftler</span>
              </div>

              {timeframeMatrix.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {timeframeMatrix.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-zinc-200 text-[11px]">{item.pair}</div>
                        <div className="text-[10px] text-zinc-500">
                          {item.total} İşlem ・ %{item.winRate} WR
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className={item.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.netR >= 0 ? '+' : ''}{item.netR} R
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Zaman dilimleri (HTF ve LTF) girildiğinde sinerji listesi burada oluşur.
                </div>
              )}
            </div>
          </div>

          {/* Hourly Stats Widget */}
          {hourlyStats.length > 0 && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100">Giriş Saati Performansı (Silver Bullet & Seans Zamanları)</h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Günün Saatleri</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {hourlyStats.map((h, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-[11px] font-bold text-zinc-200 block">{h.hour}</span>
                    <span className={`text-[11px] font-mono font-bold block ${h.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {h.netR >= 0 ? '+' : ''}{h.netR} R
                    </span>
                    <span className="text-[9px] text-zinc-500 block">{h.total} İşlem ・ %{h.winRate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
