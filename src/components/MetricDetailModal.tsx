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
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'opacity' }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform, opacity' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 w-full max-w-lg relative z-10 overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-5 w-full">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getColorClass()} shadow-xs`}>
                  <IconWrapper size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-mono text-zinc-100 uppercase tracking-wide">{metric.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider font-bold">Metrik ve Formül Detayı</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto max-h-[75vh] copilot-scrollbar pr-1">
              
              {/* Value Highlight */}
              <div className="bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800/80 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-xs text-zinc-400 font-mono font-bold tracking-wider uppercase mb-1">Mevcut Değer</span>
                <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${metric.type === 'positive' ? 'text-emerald-400' : metric.type === 'negative' ? 'text-rose-400' : 'text-zinc-100'}`}>
                  {metric.value}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Info size={14} className="text-blue-400" /> Açıklama
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {metric.description}
                </p>
              </div>

              {/* Formula (if any) */}
              {metric.formula && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Target size={14} className="text-purple-400" /> Hesaplama Formülü
                  </h4>
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
                    <code className="text-xs text-purple-300 font-mono">
                      {metric.formula}
                    </code>
                  </div>
                </div>
              )}

              {/* Additional Details lists */}
              {metric.details && metric.details.length > 0 && (
                <div className="space-y-2 w-full">
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
            <div className="mt-5 pt-4 border-t border-zinc-800/80 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs active:scale-95 backdrop-blur-sm"
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
