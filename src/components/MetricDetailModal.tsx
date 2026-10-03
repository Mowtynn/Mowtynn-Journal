import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Target, Activity, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export interface MetricDetail {
  id: string;
  title: string;
  value: string | number;
  description: string;
  formula?: string;
  details?: string[];
  type?: 'positive' | 'negative' | 'neutral' | 'info';
  icon?: any;
}

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: MetricDetail | null;
  currency?: string;
}

export function MetricDetailModal({
  isOpen,
  onClose,
  metric,
}: MetricDetailModalProps) {
  useBodyScrollLock(isOpen);
  const [displayedMetric, setDisplayedMetric] = useState<MetricDetail | null>(metric);

  useEffect(() => {
    if (metric) {
      setDisplayedMetric(metric);
    }
  }, [metric]);

  const currentMetric = metric || displayedMetric;
  const IconWrapper = currentMetric?.icon || Info;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getColorClass = () => {
    if (!currentMetric) return '';
    switch (currentMetric.type) {
      case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'negative': return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/25';
      default: return 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50';
    }
  };

  if (!currentMetric && !isOpen) return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!isOpen) {
          setDisplayedMetric(null);
        }
      }}
    >
      {isOpen && currentMetric && (
        <motion.div
          key="metric-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          
          onClick={onClose}
           className="will-change-[opacity] fixed inset-0 bg-zinc-950/80 z-[1500] flex items-center justify-center p-4"
        >
          <motion.div
            key="metric-detail-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            onClick={(e) => e.stopPropagation()}
            id="metric-detail-popup"
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-lg h-[520px] max-h-[85vh] min-h-0 sm:min-h-[380px] relative z-10 overflow-hidden flex flex-col shadow-2xl"
          >
            
          {/* Header */}
          <div className="modal-header">
            <h2 className="heading-1 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${getColorClass()}`}>
                <IconWrapper size={16} />
              </div>
              Metrik Detayları
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="btn-icon"
              >
                <X size={16} />
              </button>
            </div>
          </div>


            <div className="flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar p-5 bg-zinc-950/30 min-h-0">
              
              {/* Value Highlight */}
              <div className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-700/50 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-xs text-zinc-400 font-sans font-bold tracking-wider uppercase mb-1">Mevcut Değer</span>
                <span className={`text-3xl sm:text-4xl font-extrabold font-sans tracking-tight ${currentMetric.type === 'positive' ? 'text-emerald-400' : currentMetric.type === 'negative' ? 'text-rose-400' : 'text-zinc-100'}`}>
                  {currentMetric.value}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5 bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                <h4 className="text-xs font-bold font-sans text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Info size={14} className="text-blue-400" /> Açıklama
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {currentMetric.description}
                </p>
              </div>

              {/* Formula (if any) */}
              {currentMetric.formula && (
                <div className="space-y-1.5 bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                  <h4 className="text-xs font-bold font-sans text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Target size={14} className="text-purple-400" /> Hesaplama Formülü
                  </h4>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                    <code className="text-xs text-purple-300 font-sans">
                      {currentMetric.formula}
                    </code>
                  </div>
                </div>
              )}

              {/* Additional Details lists */}
              {currentMetric.details && currentMetric.details.length > 0 && (
                <div className="space-y-2 w-full bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                  <h4 className="text-xs font-bold font-sans text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" /> Konsept Çıkarımlar
                  </h4>
                  <ul className="space-y-2">
                    {currentMetric.details.map((detail, index) => (
                      <li key={index} className="flex gap-2 text-xs text-zinc-300 items-start font-sans">
                        <div className="min-w-[4px] w-1.5 h-1.5 rounded-full bg-blue-500/80 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="px-5 py-3.5 border-t border-zinc-700/40 bg-zinc-900/60 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-colors duration-200 cursor-pointer shadow-xs"
              >
                Anladım
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
