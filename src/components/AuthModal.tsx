import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginWithGoogle } from '../lib/firebase';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

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

  const handleGoogleLogin = () => {
    setLoading(true);
    loginWithGoogle().then(() => {
      setLoading(false);
      toast.success('Giriş başarılı!');
      onClose();
    }).catch((err: any) => {
      setLoading(false);
      if (!err) {
        onClose();
        return;
      }
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Google Auth notice:', err?.code || err?.message);
      if (err?.code === 'auth/unauthorized-domain') {
        toast.error('Bu alan adı Firebase yetkili alan adları listesinde değil.');
      } else if (err?.code === 'auth/missing-initial-state' || err?.message?.includes('missing initial state')) {
        toast.error('Tarayıcı gizlilik/çerez kısıtlamaları nedeniyle oturum başlatılamadı. Lütfen çerez izinlerini kontrol edin.');
      } else {
        toast.error('Google ile giriş yapılırken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          
          onClick={onClose}
           className="will-change-[opacity] fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-zinc-950/80 "
        >
          <motion.div
            key="auth-modal-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl p-5 overflow-hidden text-center"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors duration-200 ease-out cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400">
              <ShieldCheck size={26} />
            </div>

            <h2 className="heading-1 flex items-center gap-3">
              Hesabınıza Giriş Yapın
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 mb-6 font-sans leading-relaxed">
              İşlem günlüğünüzü, analizlerinizi ve grafik notlarınızı tüm cihazlarınızda güvenle saklayın ve senkronize edin.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-zinc-100 rounded-xl text-xs font-bold font-sans text-zinc-900 transition-colors duration-200 ease-out shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.15C3.26 21.3 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.26 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{loading ? 'Yönlendiriliyor...' : 'Google ile Giriş Yap'}</span>
            </button>

            <p className="text-[10px] text-zinc-500 font-sans mt-4">
              Tek tıkla güvenli ve hızlı Google doğrulama
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
