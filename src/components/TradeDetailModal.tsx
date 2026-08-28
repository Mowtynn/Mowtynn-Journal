import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trade } from '../types';
import { Calendar, Edit3, FileText, ImageIcon, Trash2, X } from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  currency: string;
}

const TradeDetailModal = React.memo(function TradeDetailModal({ trade, onClose, onEdit, onDelete, currency }: TradeDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (trade) {
      setImageError(false);
    }
  }, [trade?.id, trade?.screenshot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (trade) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [trade, onClose]);

  const isWin = trade?.status === 'WIN';
  const isLoss = trade?.status === 'LOSS';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pnlColorClass = isWin 
    ? 'text-emerald-400' 
    : isLoss 
      ? 'text-rose-400' 
      : 'text-zinc-500';

  return createPortal(
    <AnimatePresence>
      {trade && (
        <motion.div 
          key={trade.id ? `trade-detail-modal-${trade.id}` : 'trade-detail-modal'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-[1100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ willChange: 'opacity' }}
        >
          {/* Container Card with Motion spring effects */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform, opacity' }}
            onClick={(e) => e.stopPropagation()}
            id="trade-detail-popup" 
            className="w-full max-w-xl bg-zinc-950/60 border border-zinc-800/80 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
              {/* Header Bar */}
              <div className="border-b border-zinc-800/80 p-4 flex justify-between items-center bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-zinc-100 font-sans tracking-wider uppercase">{trade.asset}</span>
                  {trade.type === 'LONG' ? (
                    <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/15 text-[9px] font-black px-2 py-0.5 rounded font-sans tracking-wider">
                      LONG
                    </span>
                  ) : (
                    <span className="text-rose-400 bg-rose-400/10 border border-rose-400/15 text-[9px] font-black px-2 py-0.5 rounded font-sans tracking-widest">
                      SHORT
                    </span>
                  )}

                  {/* Status Pills */}
                  {isWin ? (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      🏆 WIN
                    </span>
                  ) : isLoss ? (
                    <span className="text-rose-400 bg-rose-500/10 border border-rose-500/25 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      📉 LOSS
                    </span>
                  ) : (
                    <span className="text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 text-[9px] font-bold px-2 py-0.5 rounded">
                      ⚡ BREAKEVEN
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors duration-200 ease-out cursor-pointer uppercase font-mono"
                      title="İşlemi Sil"
                    >
                      <Trash2 size={11} /> Sil
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onEdit(trade);
                      onClose();
                    }}
                    className="text-[9px] bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700/80 text-zinc-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors duration-200 ease-out cursor-pointer uppercase font-mono"
                  >
                    <Edit3 size={10} /> Düzenle
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors duration-200 ease-out cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Scrollable Document Content */}
              <div className="overflow-y-auto p-5 space-y-4 flex-1">
                
                {/* Main Financial parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Financial Box */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 font-mono">FİNANSAL DURUM</span>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-[10px]">Net Kâr / Zarar:</span>
                          <span className={`font-black text-sm ${pnlColorClass}`}>
                            {(trade.pnl || 0) > 0 ? '+' : ''}{(trade.pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                          </span>
                      </div>
                    </div>
                  </div>

                  {/* R:R Multiplier/target Box */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 font-mono">PROFİT / RİSK YÖNETİMİ</span>
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-[10px]">Ulaşılan R:R Oranı:</span>
                        <span className={`font-black text-sm ${trade.rr !== undefined && trade.rr !== null && trade.rr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.rr !== undefined && trade.rr !== null ? (trade.rr > 0 ? `+${trade.rr}R` : `${trade.rr}R`) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Date and Custom platform notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black mb-2 uppercase tracking-widest font-mono">
                      📅 İŞLEM ZAMANI
                    </div>
                    <div className="text-[10px] text-zinc-400 flex flex-col gap-1.5">
                      <div className="flex gap-1.5 items-center font-mono">
                        <Calendar size={11} className="text-zinc-500" />
                        <span>{formatDate(trade.createdAt)}</span>
                      </div>
                      {(trade.timeframe || trade.htfTimeframe || trade.session) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {trade.htfTimeframe && (
                            <span key="htf" className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">{trade.htfTimeframe}</span>
                          )}
                          {trade.timeframe && (
                            <span key="tf" className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">{trade.timeframe}</span>
                          )}
                          {trade.session && (
                            <span key="sess" className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">{trade.session}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black mb-2 uppercase tracking-widest font-mono">
                      🖥️ İŞLEM BAĞLAMI
                    </div>
                    <div className="text-[10px] text-zinc-300 font-mono font-bold uppercase flex flex-col gap-1.5">
                      <div className="flex gap-1 items-center">
                        <span className="text-zinc-500 mr-1">Platform:</span>
                        <span>{trade.platform || "Belirtilmedi"}</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className="text-zinc-500 mr-1">Konsept:</span>
                        <span>{trade.concept || "Belirtilmedi"}</span>
                      </div>
                      {trade.confirmations && trade.confirmations.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {trade.confirmations.map((c, idx) => (
                            <span key={`${c}-${idx}`} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] tracking-widest">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black mb-2 uppercase tracking-widest font-mono">
                    <FileText size={11} className="text-blue-400" /> GİRİŞ / ANALİZ NOTLARI
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2.5 text-[10px] leading-relaxed text-zinc-300 min-h-[70px] whitespace-pre-wrap font-sans">
                    {trade.notes ? trade.notes : "Bu işlem için henüz bir kurgu veya analiz notu eklenmemiş."}
                  </div>
                </div>

                {/* Screen layout screenshot illustration */}
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black mb-2 uppercase tracking-widest font-mono">
                    <ImageIcon size={11} className="text-zinc-400" />
                    <span>Teknik Analiz Görseli</span>
                  </div>
                  
                  {trade.screenshot ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950/60 p-1 ">
                      {imageError ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-rose-400 bg-zinc-950 rounded-lg min-h-[140px]">
                          <span className="text-sm mb-1">⚠️</span>
                          <p className="text-[10px] font-medium font-sans">Görsel yüklenemedi</p>
                          <p className="text-[9px] text-zinc-500 mt-1 max-w-xs leading-relaxed font-mono">Girdiğiniz URL geçersiz, erişilemez veya hotlink korumalı olabilir.</p>
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(trade);
                              onClose();
                            }}
                            className="text-[9px] text-blue-400 hover:text-blue-300 font-bold mt-2.5 cursor-pointer uppercase font-mono"
                          >
                            URL'Yİ GÜNCELLE
                          </button>
                        </div>
                      ) : (
                        <img 
                          src={trade.screenshot} 
                          alt="Pasted trading setup chart" 
                          className="rounded-lg object-contain w-full max-h-[300px]"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          onError={() => setImageError(true)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="border border-zinc-800/80 border-dashed rounded-xl p-5 text-center text-zinc-500 bg-zinc-950/60">
                      <p className="text-[10px]">Forma herhangi bir ekran görüntüsü yüklenmemiş ya da yapıştırılmamış.</p>
                      <button
                        type="button"
                        onClick={() => {
                          onEdit(trade);
                          onClose();
                        }}
                        className="text-[9px] text-zinc-300 hover:text-white hover:underline font-bold mt-1.5 cursor-pointer uppercase font-mono"
                      >
                        GÜNCELLEMEK İÇİN DÜZENLEYİN
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer closing button */}
              <div className="bg-zinc-900 border-t border-zinc-800/80 p-3.5 flex justify-end">
                <button
                  onClick={onClose}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-black tracking-widest px-5 py-2 rounded-lg uppercase font-mono transition-colors duration-200 ease-out cursor-pointer"
                >
                  Kapat
                </button>
              </div>
          </motion.div>
        </motion.div>
      )}

      {/* DELETE TRADE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && trade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[2200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative shadow-rose-500/5"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent"></div>
              
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              
              <h3 className="text-base font-bold tracking-wide text-zinc-100 uppercase text-center mb-2">
                İşlemi Sil
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-mono">
                <span className="font-semibold text-zinc-200">{trade.asset}</span> ({trade.type === 'LONG' ? 'Long' : 'Short'} - {trade.platform || 'Platform'}) pozisyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete && trade) {
                      onDelete(trade.id);
                      setShowDeleteConfirm(false);
                      onClose();
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>Evet, Sil</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>,
    document.body
  );
});

export default TradeDetailModal;
