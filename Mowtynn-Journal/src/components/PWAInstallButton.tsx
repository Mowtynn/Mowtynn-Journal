import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 h-6 px-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-[10px] font-bold font-sans uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-xs ${className}`}
        title="Uygulamayı Cihazınıza Yükleyin (PWA)"
      >
        <Download size={11} className="text-blue-400" />
        <span>{variant === 'full' ? 'Uygulamayı Yükle' : 'Yükle'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 h-6 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-[10px] font-bold font-sans uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-xs ${className}`}
          title="iPhone / iPad'e Yükle"
        >
          <Smartphone size={11} className="text-blue-400" />
          <span>{variant === 'full' ? 'iOS Uygulama Yükle' : 'iOS Yükle'}</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <motion.div
              key="ios-pwa-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100000] bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
              onClick={() => setShowIOSGuide(false)}
            >
              <motion.div
                key="ios-pwa-modal-content"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/80 p-5 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wide font-sans">
                        iPhone / iPad Kurulumu
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-sans">
                        Tam Ekran PWA Deneyimi
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide(false)}
                    className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-zinc-300 font-sans">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Share size={12} />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      1. Safari tarayıcısının altındaki <strong className="text-blue-400">Paylaş</strong> butonuna dokunun.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare size={12} />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      2. Açılan menüyü aşağı kaydırıp <strong className="text-emerald-400">"Ana Ekrana Ekle"</strong> seçeneğini seçin.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={12} />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      3. Sağ üstteki <strong className="text-purple-400">"Ekle"</strong> butonuna dokunun. Artık ana ekranınızda yerel uygulama gibi çalışacaktır.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Anladım, Kapat
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
