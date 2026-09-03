import React, { useEffect } from 'react';
import { Mic, RefreshCw, ShieldAlert, Lock, Volume2, CheckCircle2, X } from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-200 ease-out animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-100 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm">
              <Mic size={28} className="animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-zinc-900 p-1.5 rounded-full border border-zinc-700 text-amber-400">
              <ShieldAlert size={14} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
            <Volume2 size={12} /> SESLİ KOMUT İZNİ
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-2">
            Mikrofon Erişimi Gerekiyor
          </h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed max-w-sm">
            Sesli işlem ekleme, hızlı not kaydetme ve günlük oluşturma özelliklerini kullanabilmek için tarayıcınızdan mikrofon iznine onay vermeniz gerekmektedir.
          </p>
        </div>

        {/* Instructions Card */}
        <div className="space-y-3 bg-zinc-950/40 rounded-2xl p-4 border border-zinc-800/80 mb-6 text-xs">
          <div className="flex items-start gap-3 text-zinc-300">
            <div className="p-2 rounded-xl bg-zinc-800 text-amber-400 shrink-0 mt-0.5">
              <Lock size={14} />
            </div>
            <div>
              <span className="font-semibold text-zinc-200 block mb-0.5 font-mono">1. Adres Çubuğu İzinleri</span>
              Tarayıcınızın adres çubuğunda bulunan kilit (🔒) veya site ayarları simgesine tıklayın.
            </div>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <div className="p-2 rounded-xl bg-zinc-800 text-blue-400 shrink-0 mt-0.5">
              <Mic size={14} />
            </div>
            <div>
              <span className="font-semibold text-zinc-200 block mb-0.5 font-mono">2. Mikrofon İznini Açın</span>
              "Mikrofon" seçeneğini <strong className="text-emerald-400">İzin Ver (Allow)</strong> konumuna getirin.
            </div>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <div className="p-2 rounded-xl bg-zinc-800 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 size={14} />
            </div>
            <div>
              <span className="font-semibold text-zinc-200 block mb-0.5 font-mono">3. Bağlantıyı Yenileyin</span>
              Aşağıdaki butona basarak mikrofon iznini tekrar kontrol ettirin.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 hover:text-white text-[11px] font-bold font-mono tracking-widest uppercase transition-colors duration-200 cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[11px] font-bold font-mono tracking-widest uppercase transition-colors duration-200 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            Tekrar Denetle
          </button>
        </div>
      </div>
    </div>
  );
};

