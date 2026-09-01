import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Database, AlertTriangle, Cloud, X, CheckCircle2 } from 'lucide-react';
import { Trade, Note, Certificate } from '../types';
import { useAppStore } from '../store/useAppStore';

function getLocalStorageUsage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { usedBytes: 0, percentage: 0, isHeavilyUsed: false };
  }
  let usedBytes = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const val = localStorage.getItem(key);
      if (val) {
        usedBytes += (key.length + val.length) * 2;
      }
    }
  }
  const maxQuota = 5 * 1024 * 1024;
  const percentage = Math.min((usedBytes / maxQuota) * 100, 100);
  const isHeavilyUsed = percentage > 80;
  return { usedBytes, percentage, isHeavilyUsed };
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface BackupRescueProps {
  trades: Trade[];
  notes?: Note[];
  journals?: any[];
  certificates?: Certificate[];
  settings?: {
    platforms: string[];
    timeframes: string[];
    htfTimeframes?: string[];
    confirmations: string[];
    concepts: string[];
    sessions: string[];
    assets: string[];
    currency?: string;
    isRrMode?: boolean;
  };
  onImportTrades: (
    importedTrades: Trade[],
    importedNotes?: Note[],
    importedJournals?: any[],
    importedCertificates?: Certificate[],
    importedSettings?: any
  ) => Promise<void> | void;
  onClearAll: () => Promise<void> | void;
}

const BackupRescue = React.memo(function BackupRescue({
  trades,
  notes = [],
  journals = [],
  certificates = [],
  settings,
  onImportTrades,
  onClearAll,
}: BackupRescueProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isQuantMode } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showClearConfirm) {
          setShowClearConfirm(false);
          setConfirmInput('');
        }
      }
    };
    if (showClearConfirm) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showClearConfirm]);

  const { usedBytes } = getLocalStorageUsage();

  const handleExport = () => {
    try {
      const payload = {
        app: "TradingJournalPro",
        version: "2.5",
        exportedAt: new Date().toISOString(),
        trades,
        notes,
        journals,
        certificates,
        settings,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `trading_journal_backup_${dateStr}_${timeStr}_[${trades.length}_trades]_[${notes.length}_notes]_[${journals.length}_journals]_[${certificates.length}_certs].json`;
      
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg(`Tüm verileriniz (${trades.length} işlem, ${notes.length} not, ${journals.length} günlük, ${certificates.length} sertifika ve ayarlar) başarıyla JSON dosyası olarak dışa aktarıldı.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Export error:', err);
      setErrorMsg('Dışa aktarım sırasında bir hata oluştu.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          
          let importedTrades: any[] = [];
          let importedNotes: any[] = [];
          let importedJournals: any[] = [];
          let importedCertificates: any[] = [];
          let importedSettings: any = null;

          if (Array.isArray(parsed)) {
            importedTrades = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.trades)) importedTrades = parsed.trades;
            if (Array.isArray(parsed.notes)) importedNotes = parsed.notes;
            if (Array.isArray(parsed.journals)) importedJournals = parsed.journals;
            if (Array.isArray(parsed.certificates)) importedCertificates = parsed.certificates;
            if (parsed.settings && typeof parsed.settings === 'object') importedSettings = parsed.settings;
          } else {
            setErrorMsg('Hata: Yüklenen dosya geçerli bir yedek formatı içermiyor.');
            return;
          }

          const validatedTrades: Trade[] = [];
          const validatedNotes: Note[] = [];
          const validatedJournals: any[] = [];
          const validatedCertificates: Certificate[] = [];

          for (let i = 0; i < importedTrades.length; i++) {
            const item = importedTrades[i];
            if (!item || typeof item !== 'object') continue;
            
            const rawAsset = typeof item.asset === 'string' ? item.asset.trim() : (item.symbol || item.pair || 'VARLIK');
            const rawType = item.type === 'SHORT' ? 'SHORT' : 'LONG';
            let rawStatus: 'WIN' | 'LOSS' | 'BREAKEVEN' = 'BREAKEVEN';
            if (['WIN', 'LOSS', 'BREAKEVEN'].includes(item.status)) {
              rawStatus = item.status;
            } else if (typeof item.pnl === 'number') {
              rawStatus = item.pnl > 0 ? 'WIN' : item.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
            } else if (typeof item.rr === 'number') {
              rawStatus = item.rr > 0 ? 'WIN' : item.rr < 0 ? 'LOSS' : 'BREAKEVEN';
            }

            validatedTrades.push({
              id: typeof item.id === 'string' && item.id ? item.id : `trade_${Math.random().toString(36).slice(2, 11)}`,
              asset: rawAsset,
              type: rawType,
              rr: typeof item.rr === 'number' && !isNaN(item.rr) ? item.rr : 0,
              pnl: typeof item.pnl === 'number' && !isNaN(item.pnl) ? item.pnl : 0,
              status: rawStatus,
              notes: typeof item.notes === 'string' ? item.notes : (item.description || ''),
              screenshot: typeof item.screenshot === 'string' ? item.screenshot : (item.image || null),
              createdAt: typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : (item.date ? new Date(item.date).getTime() : Date.now()),
              platform: typeof item.platform === 'string' ? item.platform : undefined,
              timeframe: typeof item.timeframe === 'string' ? item.timeframe : undefined,
              htfTimeframe: typeof item.htfTimeframe === 'string' ? item.htfTimeframe : undefined,
              session: typeof item.session === 'string' ? item.session : undefined,
              concept: typeof item.concept === 'string' ? item.concept : undefined,
              confirmations: Array.isArray(item.confirmations) ? item.confirmations.filter((c: any) => typeof c === 'string') : undefined,
            });
          }

          for (let i = 0; i < importedNotes.length; i++) {
            const item = importedNotes[i];
            if (!item || typeof item !== 'object') continue;
            validatedNotes.push({
              id: typeof item.id === 'string' && item.id ? item.id : `note_${Math.random().toString(36).slice(2, 11)}`,
              title: typeof item.title === 'string' ? item.title : 'Başlıksız Not',
              content: typeof item.content === 'string' ? item.content : (item.body || ''),
              createdAt: typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : Date.now(),
              updatedAt: typeof item.updatedAt === 'number' && !isNaN(item.updatedAt) ? item.updatedAt : Date.now(),
              isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false,
            });
          }

          for (let i = 0; i < importedJournals.length; i++) {
            const item = importedJournals[i];
            if (!item || typeof item !== 'object') continue;
            validatedJournals.push({
              id: typeof item.id === 'string' && item.id ? item.id : `journal_${Math.random().toString(36).slice(2, 11)}`,
              date: typeof item.date === 'string' ? item.date : new Date().toISOString().split('T')[0],
              title: typeof item.title === 'string' ? item.title : 'Günlük Girişi',
              content: typeof item.content === 'string' ? item.content : (item.notes || ''),
              mood: ['excellent', 'good', 'neutral', 'bad', 'terrible'].includes(item.mood) ? item.mood : undefined,
              tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : undefined,
              createdAt: typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : Date.now(),
              updatedAt: typeof item.updatedAt === 'number' && !isNaN(item.updatedAt) ? item.updatedAt : Date.now(),
            });
          }

          for (let i = 0; i < importedCertificates.length; i++) {
            const item = importedCertificates[i];
            if (!item || typeof item !== 'object') continue;
            validatedCertificates.push({
              id: typeof item.id === 'string' && item.id ? item.id : `cert_${Math.random().toString(36).slice(2, 11)}`,
              title: typeof item.title === 'string' ? item.title : 'Sertifika',
              type: item.type === 'PAYOUT' ? 'PAYOUT' : (item.type === 'OTHER' ? 'OTHER' : 'PHASE'),
              date: typeof item.date === 'string' ? item.date : new Date().toISOString().split('T')[0],
              description: typeof item.description === 'string' ? item.description : '',
              amount: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0,
              image: typeof item.image === 'string' ? item.image : (item.screenshot || null),
              createdAt: typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : Date.now(),
            });
          }

          await onImportTrades(
            validatedTrades,
            validatedNotes,
            validatedJournals,
            validatedCertificates,
            importedSettings
          );

          setSuccessMsg(`Başarıyla içeri aktarıldı: ${validatedTrades.length} işlem, ${validatedNotes.length} not, ${validatedJournals.length} günlük, ${validatedCertificates.length} sertifika ve ayarlar.`);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: any) {
          console.error('Import error:', err);
          setErrorMsg(err.message || 'Dosya okunamadı. Lütfen geçerli bir yedek JSON dosyası seçin.');
        }
      };

      reader.readAsText(file);
    }
  };

  const executeWipe = async () => {
    if (confirmInput.toUpperCase() === 'SIFIRLA') {
      try {
        setIsWiping(true);
        await onClearAll();
        setShowClearConfirm(false);
        setConfirmInput('');
        setSuccessMsg('Projedeki bütün veriler başarıyla sıfırlandı.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (e) {
        setErrorMsg('Sıfırlama sırasında bir sorun oluştu.');
      } finally {
        setIsWiping(false);
      }
    } else {
      setErrorMsg("Doğrulama kelimesi yanlış girildi. Onaylamak için 'SIFIRLA' yazın.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  return (
    <div id="settings-backup-panel" className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 mt-6 shadow-xl">
      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-4">
        <Database size={14} className="text-blue-400" /> {isQuantMode ? "DATABASE & DATA INTEGRITY REGISTRY" : "Veritabanı ve Yedekleme (Güvenlik)"}
      </h2>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-3 text-xs font-sans">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg p-3 text-xs font-sans">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className={`grid grid-cols-1 md:${isQuantMode ? 'grid-cols-2' : 'grid-cols-3'} gap-4 mb-4`}>
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5 font-sans">{isQuantMode ? "Allocated Cloud Memory" : "Depolama Durumu"}</span>
            <div className="flex flex-col gap-1.5 mb-1">
              <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Kullanılan Alan (Yerel):</span>
                <span className="text-zinc-200 font-bold">{formatBytes(usedBytes)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1.5">
                <span className="text-zinc-400 flex items-center gap-1.5"><Cloud size={10} /> Firebase (Bulut):</span>
                <span className="text-zinc-200 font-bold">{(usedBytes > 0) ? formatBytes(usedBytes * 0.8) : '0 Bytes'}</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-zinc-500 mt-3 leading-relaxed">
            * Firebase entegrasyonu ile tüm verileriniz bulutta şifreli olarak saklanır ve kotalara takılmaz.
          </p>
        </div>

        {!isQuantMode && (
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between shadow-md">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Günlüğü Yedekle</span>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Kayıtlı kullanıcılar için veriler Google Cloud altyapısında (Firebase) gerçek zamanlı yedeklenir ve korunur. Alternatif olarak çevrimdışı arşivleme ve taşıma için aşağıdaki butonu kullanarak tüm işlem, not, günlük, sertifika ve ayarlarınızı indirebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 mt-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={trades.length === 0 && notes.length === 0 && journals.length === 0 && certificates.length === 0}
                className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-100 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Download size={12} className="text-blue-400" /> Yedek İndir (JSON)
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-200 ease-out cursor-pointer shadow-xs"
              >
                <Upload size={12} /> Yedekten Veri Yükle
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        )}

        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between shadow-md">
          {isQuantMode ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <CheckCircle2 size={24} className="text-emerald-500 mb-2 opacity-50" />
              <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest block mb-1">Registry Status</span>
              <p className="text-[11px] font-mono text-zinc-400 font-bold">Immutable / Read-Only</p>
            </div>
          ) : (
            <>
              <div>
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block mb-1.5">Tehlikeli Bölge</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Tüm işlem kayıtlarını, notları, günlükleri, sertifikaları ve kişisel tanımlamaları kalıcı olarak siler ve sistemi ilk haline sıfırlar. Bu işlem geri alınamaz.
                </p>
              </div>

              {!showClearConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out mt-3 cursor-pointer"
                >
                  Verileri Sıfırla
                </button>
              ) : (
                <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg mt-2 space-y-1.5">
                  <span className="text-[9px] text-zinc-300 font-bold block font-mono">Onay için &apos;SIFIRLA&apos; yazın:</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="SIFIRLA"
                      value={confirmInput}
                      disabled={isWiping}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="bg-zinc-900 border border-rose-500/40 rounded px-2 text-[10px] font-mono font-bold text-white w-full h-8 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isWiping}
                      onClick={executeWipe}
                      className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-[9px] px-3 py-1 rounded transition-colors uppercase cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[50px] active:scale-95"
                    >
                      {isWiping ? 'Siliniyor...' : 'Sil'}
                    </button>
                    <button
                      type="button"
                      disabled={isWiping}
                      onClick={() => {
                        setShowClearConfirm(false);
                        setConfirmInput('');
                      }}
                      className="bg-zinc-800 text-zinc-400 p-1.5 rounded hover:text-zinc-100 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {(() => {
        const problematicTrades = trades.filter(t => {
          if (!t.asset || !t.status) return true;
          if (t.status === 'WIN' && t.rr < 0) return true;
          if (t.status === 'LOSS' && t.rr > 0) return true;
          if (t.status === 'BREAKEVEN' && t.rr !== 0) return true;
          return false;
        });

        const getProblemReason = (t: Trade) => {
          if (!t.asset || !t.status) return "Kritik veri (Varlık/Durum) eksik";
          if (t.status === 'WIN' && t.rr < 0) return "Kazançlı (WIN) işlemde R değeri negatif girilmiş, R > 0 olmalıdır";
          if (t.status === 'LOSS' && t.rr > 0) return "Zararlı (LOSS) işlemde R değeri pozitif girilmiş, R < 0 olmalıdır";
          if (t.status === 'BREAKEVEN' && t.rr !== 0) return "Başabaş (BREAKEVEN) işlemde R değeri 0 olmalıdır";
          return "Bilinmeyen mantıksal hata";
        };

        const hasIssues = problematicTrades.length > 0;

        return (
          <div className={`mt-5 rounded-xl p-4 border shadow-sm ${
            hasIssues 
              ? 'bg-amber-500/5 border-amber-500/20' 
              : 'bg-emerald-500/5 border-emerald-500/20'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3 items-start w-full">
                <div className="mt-0.5">
                  {hasIssues ? (
                    <AlertTriangle size={16} className="text-amber-500" />
                  ) : (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  )}
                </div>
                <div className="w-full">
                  <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${
                    hasIssues ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    Sistem Bütünlüğü ve Veri Analizi
                  </span>
                  
                  {hasIssues ? (
                    <>
                      <p className="text-[11px] text-amber-500/70 leading-relaxed max-w-2xl mb-2">
                        Veritabanınızda istatistiklerin (Kazanma Oranı, Toplam R, vs.) yanlış hesaplanmasına sebep olabilecek {problematicTrades.length} hatalı kayıt tespit edildi. Lütfen bu kayıtları güncelleyin veya silin.
                      </p>
                      <div className="bg-amber-500/10 rounded overflow-hidden">
                        <ul className="text-[11px] text-amber-200/90 divide-y divide-amber-500/10">
                          {problematicTrades.slice(0, 5).map(pt => (
                            <li key={pt.id} className="p-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="font-mono text-amber-400 min-w-[80px]">{pt.asset || 'Bilinmiyor'}</span>
                              <span className="font-mono text-amber-500/60 text-[9px]">{new Date(pt.createdAt).toLocaleDateString()}</span>
                              <span className="text-amber-300 flex-1">{getProblemReason(pt)}</span>
                            </li>
                          ))}
                          {problematicTrades.length > 5 && (
                            <li className="p-2 text-center text-amber-500/60 font-medium italic">
                              ...ve {problematicTrades.length - 5} işlem daha.
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-emerald-500/70 leading-relaxed max-w-2xl">
                      {isQuantMode ? "Mevcut veritabanında tüm model kayıtları istatistiksel açıdan uyumlu. Çelişen bir kayıt bulunamadı (Tüm Validated çıktılar pozitif delta, Null sapmalar negatif delta olarak doğrulanmıştır.). Veri sağlığı mükemmel durumda." : "Mevcut veritabanında tüm işlemler istatistiksel açıdan uyumlu. Çelişen bir kayıt bulunamadı (Tüm WIN'ler pozitif R, LOSS'lar negatif R vb.). Veri sağlığı mükemmel durumda."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default BackupRescue;
