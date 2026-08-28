import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Info, Crown, Skull, X } from 'lucide-react';
import { Trade } from '../types';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
}

export const HeatmapModal: React.FC<HeatmapModalProps> = ({ isOpen, onClose, trades }) => {
  const [timeFilter, setTimeFilter] = useState<'7' | '30' | '90' | '180' | 'all'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTrades = useMemo(() => {
    if (timeFilter === 'all') return trades;
    const now = Date.now();
    const cutoff = now - parseInt(timeFilter) * 24 * 60 * 60 * 1000;
    return trades.filter(t => t.createdAt >= cutoff);
  }, [trades, timeFilter]);

  const heatmapData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return { matrix: {}, sessions: [], days: [], bestCellKey: null, worstCellKey: null };

    const closedTrades = filteredTrades.filter(t => t.status === "WIN" || t.status === "LOSS");

    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const sessionSet = new Set<string>();

    closedTrades.forEach(t => {
      if (t.session && t.session.trim() !== '') {
        sessionSet.add(t.session);
      }
    });

    const sessions = Array.from(sessionSet).sort();
    if (sessions.length === 0) sessions.push("Bilinmeyen");

    // Initialize matrix
    const matrix: { [day: string]: { [session: string]: { pnl: number, r: number, count: number, winCount: number, conceptCounts: Record<string, number> } } } = {};
    days.forEach(d => {
      matrix[d] = {};
      sessions.forEach(s => {
        matrix[d][s] = { pnl: 0, r: 0, count: 0, winCount: 0, conceptCounts: {} };
      });
    });

    closedTrades.forEach(t => {
      if (t.createdAt) {
        const d = new Date(t.createdAt);
        let dayIndex = d.getDay(); // 0 = Sunday, 1 = Monday
        dayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to 0 = Monday
        const dayName = days[dayIndex];
        const s = (t.session && t.session.trim() !== '') ? t.session : "Bilinmeyen";

        if (matrix[dayName] && matrix[dayName][s]) {
          matrix[dayName][s].count += 1;
          if (t.status === 'WIN') matrix[dayName][s].winCount += 1;
          matrix[dayName][s].pnl += (t.pnl || 0);
          matrix[dayName][s].r += (t.rr || 0);
          
          const strat = t.concept?.trim() || t.confirmations?.[0]?.trim();
          if (strat) {
            matrix[dayName][s].conceptCounts[strat] = (matrix[dayName][s].conceptCounts[strat] || 0) + (t.status === 'WIN' ? 1 : 0);
          }
        }
      }
    });

    let bestCellKey: string | null = null;
    let worstCellKey: string | null = null;
    let maxPnL = -Infinity;
    let minPnL = Infinity;

    days.forEach(d => {
      sessions.forEach(s => {
        const cell = matrix[d]?.[s];
        if (cell && cell.count > 0) {
          const wr = cell.count > 0 ? (cell.winCount / cell.count) : 0;
          // Best: positive PnL and high WR
          if (cell.pnl > maxPnL && cell.pnl > 0 && wr >= 0.4) {
            maxPnL = cell.pnl;
            bestCellKey = `${d}-${s}`;
          }
          // Worst: lowest PnL
          if (cell.pnl < minPnL && cell.pnl < 0) {
            minPnL = cell.pnl;
            worstCellKey = `${d}-${s}`;
          }
        }
      });
    });

    return { matrix, sessions, days, bestCellKey, worstCellKey };
  }, [filteredTrades]);

  const { matrix, sessions, days, bestCellKey, worstCellKey } = heatmapData;

  const getCellColor = (pnl: number, count: number) => {
    if (count === 0) return 'bg-zinc-900/60 border-zinc-800/60';
    if (pnl > 0) {
      if (pnl > 100) return 'bg-emerald-500/80 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
      if (pnl > 50) return 'bg-emerald-500/60 border-emerald-500/80';
      if (pnl > 20) return 'bg-emerald-500/40 border-emerald-500/60';
      return 'bg-emerald-500/25 border-emerald-500/40';
    } else if (pnl < 0) {
      if (pnl < -100) return 'bg-rose-500/80 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
      if (pnl < -50) return 'bg-rose-500/60 border-rose-500/80';
      if (pnl < -20) return 'bg-rose-500/40 border-rose-500/60';
      return 'bg-rose-500/25 border-rose-500/40';
    }
    return 'bg-zinc-800 border-zinc-700'; // Break even
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          onClick={onClose}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <CalendarIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 font-mono">İşlem Isı Haritası</h2>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">Gün ve Seans bazlı kâr/zarar dağılımınız</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 overflow-x-auto hide-scrollbar">
                {[
                  { id: '7', label: '7G' },
                  { id: '30', label: '1A' },
                  { id: '90', label: '3A' },
                  { id: '180', label: '6A' },
                  { id: 'all', label: 'TÜMÜ' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTimeFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all duration-150 ${
                      timeFilter === f.id 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
            <div className="w-full">
              {/* Heatmap Grid */}
              <div className="flex gap-2">
                {/* Y Axis (Days) */}
                <div className="flex flex-col gap-2 mt-8 mr-2">
                  {days.map(day => (
                    <div key={day} className="h-10 text-[11px] font-medium text-zinc-400 flex items-center justify-end pr-2 w-24 shrink-0 font-sans">
                      {day}
                    </div>
                  ))}
                </div>

                {/* X Axis (Sessions) and Grid */}
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    {sessions.map(session => (
                      <div key={session} className="flex-1 text-[11px] font-bold font-mono text-zinc-400 flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis px-1 uppercase tracking-wider">
                        {session}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    {days.map(day => (
                      <div key={day} className="flex gap-2 relative hover:z-50">
                        {sessions.map((session) => {
                          const cellKey = `${day}-${session}`;
                          const cell = matrix[day]?.[session];
                          const hasTrades = cell && cell.count > 0;
                          const isBest = cellKey === bestCellKey;
                          const isWorst = cellKey === worstCellKey;
                          const winRatePercent = hasTrades ? Math.round((cell.winCount / cell.count) * 100) : 0;

                          return (
                            <div
                              key={cellKey}
                              className="relative group cursor-crosshair flex-1 hover:z-50"
                            >
                              <div 
                                className={`w-full h-10 rounded-lg border transition-all duration-200 flex items-center justify-center overflow-hidden relative ${
                                  getCellColor(cell?.pnl || 0, cell?.count || 0)
                                } ${isWorst ? 'ring-1 ring-rose-500/50' : ''}`}
                              >
                                {hasTrades && (
                                  <span className="text-[11px] font-mono font-bold text-white select-none pointer-events-none">
                                    %{winRatePercent}
                                  </span>
                                )}
                              </div>
                              
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-zinc-950 border border-zinc-700 text-zinc-200 text-[11px] rounded-lg p-2.5 shadow-2xl z-50 whitespace-nowrap pointer-events-none font-mono">
                                <span className="font-bold text-blue-400 border-b border-zinc-800 pb-1 mb-1">{day} — {session}</span>
                                <div className="space-y-0.5 text-zinc-300">
                                  <div>İşlem: <span className="text-white font-bold">{cell?.count || 0}</span></div>
                                  <div>Net PnL: <span className={(cell?.pnl || 0) >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{(cell?.pnl || 0).toLocaleString()}</span></div>
                                  <div>Net R: <span className="text-indigo-300 font-bold">{(cell?.r || 0).toFixed(1)} R</span></div>
                                  <div>Başarı Oranı: <span className="text-amber-300 font-bold">%{winRatePercent}</span></div>
                                </div>
                              </div>

                              {isBest && (
                                <div className="absolute -top-2 -right-1 z-10">
                                  <Crown className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" size={14} fill="currentColor" />
                                </div>
                              )}
                              
                              {isWorst && (
                                <div className="absolute -top-2 -right-1 z-10">
                                  <Skull className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" size={14} fill="currentColor" />
                                </div>
                              )}
                              
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-sans">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Info size={13} className="text-blue-400 shrink-0" />
              <span>Renk yoğunluğu PnL büyüklüğünü, kutu içi değerler ise Başarı Oranını (Win Rate %) belirtir.</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
              <span className="text-rose-400 font-bold">Zarar</span>
              <div className="flex gap-1">
                <div className="w-3.5 h-3.5 rounded bg-rose-500/80 border border-rose-500"></div>
                <div className="w-3.5 h-3.5 rounded bg-rose-500/40 border border-rose-500/60"></div>
              </div>
              <div className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700 mx-1"></div>
              <div className="flex gap-1">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500/40 border border-emerald-500/60"></div>
                <div className="w-3.5 h-3.5 rounded bg-emerald-500/80 border border-emerald-500"></div>
              </div>
              <span className="text-emerald-400 font-bold">Kâr</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
