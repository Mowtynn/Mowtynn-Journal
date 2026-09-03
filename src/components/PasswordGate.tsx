import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PasswordGateProps {
  children: React.ReactNode;
}

export const STORAGE_KEY = 'tj_access_token_v3';
export const getSiteToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || '';
};
const LOCKOUT_KEY = 'tj_app_lockout';
const ATTEMPTS_KEY = 'tj_app_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000; // 1 minute

// Eager token verification at parse time
const isBrowser = typeof window !== 'undefined';
const tokenToVerify = isBrowser 
  ? (localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)) 
  : null;

let initialAuthPromise: Promise<boolean> | null = null;

if (tokenToVerify) {
  initialAuthPromise = fetch('/api/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenToVerify })
  })
  .then(res => res.ok ? res.json() : { success: false })
  .then(data => !!data.success)
  .catch(() => false);
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const initGate = async () => {
      localStorage.removeItem('tj_app_access_granted');
      sessionStorage.removeItem('tj_app_access_granted');
      localStorage.removeItem('tj_access_token_v2');
      sessionStorage.removeItem('tj_access_token_v2');

      if (initialAuthPromise) {
        const isValid = await initialAuthPromise;
        if (isValid) {
          setIsAuthenticated(true);
          setIsChecking(false);
          return;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } else {
        // WARM-UP PING: Wake up the serverless function immediately when the gate mounts 
        // if the user needs to login. This eliminates the cold-start delay when they submit.
        fetch('/api/health').catch(() => {});
      }

      const storedLockout = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
      const storedAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
      
      if (storedLockout > Date.now()) {
        setLockoutTime(storedLockout);
        setRemainingTime(Math.ceil((storedLockout - Date.now()) / 1000));
        setAttempts(MAX_ATTEMPTS);
      } else {
        setAttempts(storedAttempts);
        if (storedLockout > 0) {
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.setItem(ATTEMPTS_KEY, '0');
          setAttempts(0);
        }
      }

      setIsChecking(false);
    };

    initGate();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (lockoutTime > 0) {
      setRemainingTime(Math.max(1, Math.ceil((lockoutTime - Date.now()) / 1000)));
      interval = setInterval(() => {
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutTime(0);
          setRemainingTime(0);
          setAttempts(0);
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.setItem(ATTEMPTS_KEY, '0');
          clearInterval(interval);
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || lockoutTime > Date.now()) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, data.token);
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          sessionStorage.setItem(STORAGE_KEY, data.token);
          localStorage.removeItem(STORAGE_KEY);
        }
        
        localStorage.removeItem(ATTEMPTS_KEY);
        localStorage.removeItem(LOCKOUT_KEY);
        setIsAuthenticated(true);
        setError(false);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(ATTEMPTS_KEY, newAttempts.toString());
        
        if (newAttempts >= MAX_ATTEMPTS) {
          const newLockout = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutTime(newLockout);
          setRemainingTime(Math.ceil(LOCKOUT_DURATION_MS / 1000));
          localStorage.setItem(LOCKOUT_KEY, newLockout.toString());
        }
        
        setError(true);
        setInput('');
        setTimeout(() => setError(false), 2500);
      }
    } catch (err) {
      console.error("Verification request failed.", err);
      setError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <span className="text-zinc-500 text-sm animate-pulse">Güvenlik kontrol ediliyor...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const isLockedOut = lockoutTime > Date.now();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-11 w-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-400 font-sans text-lg select-none mb-4">
            TJ
          </div>
          <h1 className="text-xl font-bold tracking-wide text-zinc-100">
            TRADING JOURNAL
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-widest">
            Kısıtlı Erişim
          </p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    {isLockedOut ? (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    ) : (
                      <Lock className={`h-4 w-4 transition-colors ${error ? 'text-rose-500' : 'text-zinc-500 group-focus-within:text-blue-400'}`} />
                    )}
                  </div>
                  <input
                    type="password"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLockedOut ? `Kilitli (${remainingTime}s)` : "Erişim Şifresi"}
                    autoFocus
                    disabled={isLockedOut || isProcessing}
                    className={`w-full bg-zinc-950/80 border ${error || isLockedOut ? 'border-rose-500/40 focus:border-rose-500/60' : 'border-zinc-800 focus:border-blue-500/30'} rounded-xl py-3 pl-10 pr-4 text-white font-mono text-sm placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:ring-1 ${error || isLockedOut ? 'focus:ring-rose-500/20' : 'focus:ring-blue-500/20'} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {error && !isLockedOut && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-5 left-1 text-[10px] text-rose-400 font-medium font-mono"
                    >
                      Hatalı şifre. Kalan hak: {Math.max(0, MAX_ATTEMPTS - attempts)}
                    </motion.p>
                  )}
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-1 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={isLockedOut || isProcessing}
                    onClick={() => setRememberMe(false)}
                    className={`py-2 px-3 text-xs font-bold font-mono tracking-wide rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                      !rememberMe
                        ? "bg-zinc-800/80 text-blue-400 border border-zinc-700/40 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
                    }`}
                  >
                    <span>Tek Seferlik Giriş</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLockedOut || isProcessing}
                    onClick={() => setRememberMe(true)}
                    className={`py-2 px-3 text-xs font-bold font-mono tracking-wide rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                      rememberMe
                        ? "bg-zinc-800/80 text-blue-400 border border-zinc-700/40 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
                    }`}
                  >
                    <span>Beni Hatırla</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLockedOut || isProcessing || !input}
                className="w-full h-11 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 font-mono font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ease-out group disabled:opacity-50 disabled:cursor-not-allowed shadow-xs mt-2 text-[11px] cursor-pointer"
              >
                <span>{isProcessing ? 'DOĞRULANIYOR...' : 'GİRİŞ YAP'}</span>
                {!isProcessing && !isLockedOut && (
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-zinc-600 text-[10px] mt-6 font-mono tracking-wide">
          <ShieldCheck className="w-3 h-3 inline-block mr-1 -mt-0.5 opacity-50" />
          SECURE ENCRYPTED SESSION
        </p>
      </motion.div>
    </div>
  );
}
