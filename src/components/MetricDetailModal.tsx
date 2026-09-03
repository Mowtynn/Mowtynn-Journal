import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Target, Activity, X } from 'lucide-react';

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
  const IconWrapper = metric?.icon || Info;

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
    if (!metric) return '';
    switch (metric.type) {
      case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'negative': return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/25';
      default: return 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50';
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && metric && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ willChange: 'opacity' }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: 'opacity' }}
            onClick={(e) => e.stopPropagation()}
            id="metric-detail-popup"
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-700/40 bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getColorClass()} shadow-xs`}>
                  <IconWrapper size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-zinc-100 uppercase tracking-wide">{metric.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider font-bold">Metrik ve Formül Detayı</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors duration-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[75vh] custom-scrollbar p-5 sm:p-6 bg-zinc-950/30">
              
              {/* Value Highlight */}
              <div className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-700/50 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-xs text-zinc-400 font-mono font-bold tracking-wider uppercase mb-1">Mevcut Değer</span>
                <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${metric.type === 'positive' ? 'text-emerald-400' : metric.type === 'negative' ? 'text-rose-400' : 'text-zinc-100'}`}>
                  {metric.value}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5 bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Info size={14} className="text-blue-400" /> Açıklama
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {metric.description}
                </p>
              </div>

              {/* Formula (if any) */}
              {metric.formula && (
                <div className="space-y-1.5 bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                  <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Target size={14} className="text-purple-400" /> Hesaplama Formülü
                  </h4>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                    <code className="text-xs text-purple-300 font-mono">
                      {metric.formula}
                    </code>
                  </div>
                </div>
              )}

              {/* Additional Details lists */}
              {metric.details && metric.details.length > 0 && (
                <div className="space-y-2 w-full bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-800/80">
                  <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" /> Konsept Çıkarımlar
                  </h4>
                  <ul className="space-y-2">
                    {metric.details.map((detail, index) => (
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
                className="px-5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors duration-200 cursor-pointer shadow-xs"
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
