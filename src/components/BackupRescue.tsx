import React, { useState, useRef, useEffect, useMemo } from 'react';
import { smartUpper } from '../constants/constants';
import { Download, Upload, Database, AlertTriangle, Cloud, X, CheckCircle2, Pencil, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { PANE } from '../lib/motion';
import { Trade, Note, DefinitionTitles, PropAccount } from '../types';
import { missingFields, logicProblem } from '../lib/integrity';
import { localDateKey } from '../utils/math';
import { mapAccountImages } from '../lib/propAccounts';
import { ACCOUNT_CATEGORY_LABELS, getTradeAccountCategory } from '../constants/constants';
import { isImageRef, loadImage } from '../lib/imageStore';
import { nyWallDate, nyNow } from '../lib/tradingTime';

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
  settings?: {
    timeframes: string[];
    htfTimeframes?: string[];
    confirmations: string[];
    sessions: string[];
    assets: string[];
    planFidelities?: string[];
    entryModels?: string[];
    trendTypes?: string[];
    tpTargets?: string[];
    premiumDiscounts?: string[];
    newsDays?: string[];
    strategies?: string[];
    asiaRangeFvgs?: string[];
    definitionTitles?: DefinitionTitles;
    propAccounts?: PropAccount[];
  };
  onImportTrades: (
    importedTrades: Trade[],
    importedNotes?: Note[],
    importedJournals?: any[],
    importedSettings?: any
  ) => Promise<boolean | void> | boolean | void;
  onClearAll: () => Promise<boolean | void> | boolean | void;
  /** Eksik/hatalı kaydı düzenleme formunda açar */
  onEditTrade?: (trade: Trade) => void;
}

const BackupRescue = React.memo(function BackupRescue({
  trades,
  notes = [],
  journals = [],
  settings,
  onImportTrades,
  onClearAll,
  onEditTrade,
}: BackupRescueProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { usedBytes } = React.useMemo(
    () => getLocalStorageUsage(),
    [trades.length, notes.length, journals.length]
  );

  const handleExport = async () => {
    const toastId = toast.loading('Yedek hazırlanıyor…');
    try {
      // Prop fotoğrafları yedeğe gömülür (referans → data URL); böylece yedek tek başına eksiksizdir
      let exportSettings = settings;
      let missingImages = 0;
      if (settings?.propAccounts?.length) {
        const propAccounts = await mapAccountImages(settings.propAccounts, async (img) => {
          if (!isImageRef(img)) return img;
          const data = await loadImage(img);
          if (data) return data;
          missingImages++;
          return img;
        });
        exportSettings = { ...settings, propAccounts };
      }
      // Kayıtlı görseller (Firestore) yedeğe gömülür; TradingView vb. dış bağlantılar olduğu gibi kalır
      const embed = new Map<string, string>();
      const storedShots = Array.from(new Set(trades.map((t) => t.screenshot).filter((u): u is string => isImageRef(u))));
      for (let i = 0; i < storedShots.length; i += 8) {
        await Promise.all(
          storedShots.slice(i, i + 8).map(async (u) => {
            const data = await loadImage(u);
            if (data) embed.set(u, data);
            else missingImages++;
          }),
        );
      }
      const tradesOut = embed.size ? trades.map((t) => (t.screenshot && embed.has(t.screenshot) ? { ...t, screenshot: embed.get(t.screenshot)! } : t)) : trades;
      const payload = {
        app: "TradingJournalPro",
        version: "2.7",
        exportedAt: new Date().toISOString(),
        trades: tradesOut,
        notes,
        journals,
        settings: exportSettings,
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      
      const now = nyNow();
      const dateStr = localDateKey(now);
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `trading_journal_backup_${dateStr}_${timeStr}_[${trades.length}_trades]_[${notes.length}_notes]_[${journals.length}_journals].json`;
      
      downloadAnchor.setAttribute('href', downloadUrl);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      // İndirme tıklamadan sonra başlar; adres hemen iptal edilirse bazı tarayıcılarda dosya boş iner
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      if (missingImages > 0) {
        toast.error(
          `${missingImages} görsel (prop / işlem) bulunamadı ya da okunamadı; yedeğe yalnızca referansı yazıldı. Bağlantını kontrol edip tekrar dene.`,
          { id: toastId, duration: 9000 },
        );
      } else {
        toast.success(`Tüm verileriniz (${trades.length} işlem, ${notes.length} not, ${journals.length} günlük, prop hesapları ve ayarlar) dışa aktarıldı.`, { id: toastId });
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Dışa aktarım sırasında bir hata oluştu.', { id: toastId });
    }
  };

  const num = (v: unknown): number | undefined => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.replace(',', '.'));
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  const strArr = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : undefined;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onerror = () => {
      toast.error('Dosya okunamadı. Lütfen tekrar deneyin.');
      input.value = '';
    };

    reader.onload = async (event) => {
      try {
        let parsed: any;
        try {
          parsed = JSON.parse(event.target?.result as string);
        } catch {
          toast.error('Dosya geçerli bir JSON değil. Lütfen "Yedek İndir" ile aldığınız dosyayı seçin.');
          return;
        }

        let importedTrades: any[] = [];
        let importedNotes: any[] = [];
        let importedJournals: any[] = [];
        let importedSettings: any = null;

        if (Array.isArray(parsed)) {
          importedTrades = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.trades)) importedTrades = parsed.trades;
          if (Array.isArray(parsed.notes)) importedNotes = parsed.notes;
          if (Array.isArray(parsed.journals)) importedJournals = parsed.journals;
          else if (Array.isArray(parsed.entries)) importedJournals = parsed.entries;
          if (parsed.settings && typeof parsed.settings === 'object') importedSettings = parsed.settings;
        } else {
          toast.error('Hata: Yüklenen dosya geçerli bir yedek formatı içermiyor.');
          return;
        }

        const validatedTrades: Trade[] = [];
        const validatedNotes: Note[] = [];
        const validatedJournals: any[] = [];

        for (let i = 0; i < importedTrades.length; i++) {
          const item = importedTrades[i];
          if (!item || typeof item !== 'object') continue;

          const rr = num(item.rr);
          const rawAsset = typeof item.asset === 'string' && item.asset.trim() ? item.asset.trim() : (item.symbol || item.pair || 'PARİTE');
          const rawType = item.type === 'SHORT' ? 'SHORT' : 'LONG';
          let rawStatus: 'WIN' | 'LOSS' | 'BREAKEVEN' = 'BREAKEVEN';
          if (['WIN', 'LOSS', 'BREAKEVEN'].includes(item.status)) {
            rawStatus = item.status;
          } else if (rr !== undefined) {
            rawStatus = rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN';
          }

          const created = num(item.createdAt);
          const fromDate = item.date ? new Date(item.date).getTime() : NaN;
          const entryArr = strArr(item.entryModels) ?? (typeof item.entry === 'string' && item.entry
            ? item.entry.split(',').map((x: string) => x.trim()).filter(Boolean)
            : undefined);

          const trade: Trade = {
            id: typeof item.id === 'string' && item.id ? item.id : `trade_${Math.random().toString(36).slice(2, 11)}`,
            asset: rawAsset,
            type: rawType,
            rr: rawStatus === 'BREAKEVEN' ? 0 : (rr ?? 0),
            status: rawStatus,
            notes: typeof item.notes === 'string' ? item.notes : (item.description || ''),
            screenshot: typeof item.screenshot === 'string' ? item.screenshot : (item.image || null),
            createdAt: created && created > 0 ? created : (Number.isFinite(fromDate) ? fromDate : Date.now()),
            platform: typeof item.platform === 'string' ? item.platform : undefined,
            accountCategory: item.accountCategory === 'FUNDED' || item.accountCategory === 'CHALLENGE' || item.accountCategory === 'DEMO' ? item.accountCategory : undefined,
            timeframe: typeof item.timeframe === 'string' ? item.timeframe : undefined,
            htfTimeframe: typeof item.htfTimeframe === 'string' ? item.htfTimeframe : undefined,
            session: typeof item.session === 'string' ? item.session : undefined,
            planFidelity: typeof item.planFidelity === 'string' && item.planFidelity.trim() ? item.planFidelity.trim() : undefined,
            confirmations: strArr(item.confirmations),
            entryModels: entryArr,
            stopPips: num(item.stopPips),
            tpPips: num(item.tpPips),
            asiaRangePips: num(item.asiaRangePips),
            maePips: num(item.maePips),
            mfePips: num(item.mfePips),
            trend: typeof item.trend === 'string' ? item.trend : undefined,
            tpTargets: strArr(item.tpTargets),
            premiumDiscount: typeof item.premiumDiscount === 'string' && item.premiumDiscount.trim() ? item.premiumDiscount.trim() : undefined,
            newsDay: typeof item.newsDay === 'boolean' ? item.newsDay : undefined,
            strategy: typeof item.strategy === 'string' && item.strategy.trim() ? item.strategy.trim() : undefined,
            asiaRangeFvg: typeof item.asiaRangeFvg === 'string' && item.asiaRangeFvg.trim() ? item.asiaRangeFvg.trim() : undefined,
            accountId: typeof item.accountId === 'string' && item.accountId ? item.accountId : undefined,
            accountStage: num(item.accountStage),
            riskPct: num(item.riskPct),
            riskAmount: num(item.riskAmount),
            quickEntry: item.quickEntry === true ? true : undefined,
            exitAt: num(item.exitAt),
          };
          validatedTrades.push(trade);
        }

        for (let i = 0; i < importedNotes.length; i++) {
          const item = importedNotes[i];
          if (!item || typeof item !== 'object') continue;
          validatedNotes.push({
            id: typeof item.id === 'string' && item.id ? item.id : `note_${Math.random().toString(36).slice(2, 11)}`,
            title: typeof item.title === 'string' ? item.title : 'Başlıksız Not',
            content: typeof item.content === 'string' ? item.content : (item.body || ''),
            createdAt: num(item.createdAt) ?? Date.now(),
            updatedAt: num(item.updatedAt) ?? Date.now(),
            isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false,
          });
        }

        for (let i = 0; i < importedJournals.length; i++) {
          const item = importedJournals[i];
          if (!item || typeof item !== 'object') continue;
          validatedJournals.push({
            id: typeof item.id === 'string' && item.id ? item.id : `journal_${Math.random().toString(36).slice(2, 11)}`,
            date: typeof item.date === 'string' ? item.date : localDateKey(),
            title: typeof item.title === 'string' ? item.title : 'Günlük Girişi',
            content: typeof item.content === 'string' ? item.content : (item.notes || ''),
            mood: ['excellent', 'good', 'neutral', 'bad', 'terrible'].includes(item.mood) ? item.mood : undefined,
            tags: strArr(item.tags),
            isFavorite: typeof item.isFavorite === 'boolean' ? item.isFavorite : false,
            // Haftalık değerlendirme cevapları (varsa) korunur
            ...(item.weekly && typeof item.weekly === 'object'
              ? { weekly: { good: String(item.weekly.good ?? ''), avoid: String(item.weekly.avoid ?? ''), focus: String(item.weekly.focus ?? '') } }
              : {}),
            createdAt: num(item.createdAt) ?? Date.now(),
            updatedAt: num(item.updatedAt) ?? Date.now(),
          });
        }

        if (
          validatedTrades.length + validatedNotes.length + validatedJournals.length === 0 &&
          !importedSettings
        ) {
          toast.error('Yedek dosyasında içe aktarılacak veri bulunamadı.');
          return;
        }

        // Başarı / hata bildirimini App (handleImportTrades) verir; burada ikinci bir toast gösterilmez
        await onImportTrades(
          validatedTrades,
          validatedNotes,
          validatedJournals,
          importedSettings
        );
      } catch (err: any) {
        console.error('Import error:', err);
        toast.error(err?.message || 'Dosya okunamadı. Lütfen geçerli bir yedek JSON dosyası seçin.');
      } finally {
        // Aynı dosya tekrar seçilebilsin
        input.value = '';
      }
    };

    reader.readAsText(file);
  };

  const executeWipe = async () => {
    if (confirmInput.toUpperCase() === 'SIFIRLA') {
      try {
        setIsWiping(true);
        const ok = await onClearAll();
        // Başarı / hata bildirimini App (handleClearAll) verir
        if (ok !== false) {
          setShowClearConfirm(false);
          setConfirmInput('');
        }
      } catch (e) {
        toast.error('Sıfırlama sırasında bir sorun oluştu.');
      } finally {
        setIsWiping(false);
      }
    } else {
      toast.error("Doğrulama kelimesi yanlış girildi. Onaylamak için 'SIFIRLA' yazın.");
    }
  };

  return (
    <div id="settings-backup-panel" className="bg-zinc-900/70 border border-zinc-700/50 /80 rounded-2xl p-4 sm:p-5 mt-6 shadow-xl">
      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-4">
        <Database size={14} className="text-blue-400" /> {"Veritabanı ve Yedekleme (Güvenlik)"}
      </h2>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-4`}>
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="heading-3 mb-1.5 font-sans">{"Depolama Durumu"}</span>
            <div className="flex flex-col gap-1.5 mb-1">
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Kullanılan Alan (Yerel):</span>
                <span className="text-zinc-200 font-bold">{formatBytes(usedBytes)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5">
                <span className="text-zinc-400 flex items-center gap-1.5"><Cloud size={10} /> Firebase (Bulut):</span>
                <span className="text-zinc-200 font-bold">Hesapla eşitlenir</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-zinc-500 mt-3 leading-relaxed">
            * Giriş yapınca tüm verilerin (fotoğraflar dahil) Firebase bulutunda saklanır; ücretsiz kota bu günlük için fazlasıyla yeterli.
          </p>
        </div>

        {true && (
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-md">
            <div>
              <span className="heading-3 mb-2">Günlüğü Yedekle</span>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Kayıtlı kullanıcılar için veriler Google Cloud altyapısında (Firebase) gerçek zamanlı yedeklenir ve korunur. Alternatif olarak çevrimdışı arşivleme ve taşıma için aşağıdaki butonu kullanarak tüm işlem, not, günlük, sertifika ve ayarlarınızı indirebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 mt-3">
              <button
                type="button"
                onClick={handleExport}
                className="h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-100 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Download size={12} className="text-blue-400" /> Yedek İndir (JSON)
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 rounded-xl bg-zinc-800 hover:bg-zinc-800 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-200 ease-out cursor-pointer shadow-xs"
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

        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-md">
            <>
              <div>
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block mb-2">{smartUpper("Tehlikeli Bölge")}</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Bu cihazdaki ve buluttaki (Firebase) tüm işlemleri, notları, günlükleri, prop hesaplarını, görselleri ve tanımlamaları kalıcı olarak siler; tanımlamalar varsayılana döner. Giriş ve site şifresi korunur. Bu işlem geri alınamaz.
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
              {!showClearConfirm ? (
                <motion.div key="wipe-start" {...PANE}>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out mt-3 cursor-pointer"
                >
                  Verileri Sıfırla
                </button>
                </motion.div>
              ) : (
                <motion.div key="wipe-confirm" {...PANE} className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl mt-2 space-y-1.5">
                  <span className="text-[9px] text-zinc-300 font-bold block font-sans">Onay için &apos;SIFIRLA&apos; yazın:</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="SIFIRLA"
                      value={confirmInput}
                      disabled={isWiping}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="bg-zinc-900 border border-rose-500/40 rounded-lg px-2.5 text-[10px] font-sans font-bold text-white w-full h-8 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isWiping}
                      onClick={executeWipe}
                      className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-[9px] px-3 py-1 rounded-lg transition-colors uppercase cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                    >
                      {isWiping ? 'Siliniyor...' : 'Sil'}
                    </button>
                    <button aria-label="Kapat" title="Kapat"
                      type="button"
                      disabled={isWiping}
                      onClick={() => {
                        setShowClearConfirm(false);
                        setConfirmInput('');
                      }}
                      className="bg-zinc-800 text-zinc-400 p-1.5 rounded-lg hover:text-zinc-100 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </>
        </div>
      </div>

      <IntegrityPanel trades={trades} onEditTrade={onEditTrade} />
    </div>
  );
});

/* ---------- Sistem bütünlüğü: mantık hataları + eksik kayıtlar (kurallar: lib/integrity) ---------- */

function IntegrityPanel({ trades, onEditTrade }: { trades: Trade[]; onEditTrade?: (t: Trade) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => {
    const list: { t: Trade; problem: string | null; missing: string[] }[] = [];
    trades.forEach((t) => {
      const problem = logicProblem(t);
      const missing = missingFields(t);
      if (problem || missing.length > 0 || t.quickEntry) list.push({ t, problem, missing });
    });
    // Önce mantık hataları, sonra en yeni eksikler
    return list.sort((a, b) => (a.problem ? 0 : 1) - (b.problem ? 0 : 1) || b.t.createdAt - a.t.createdAt);
  }, [trades]);

  const problemCount = rows.filter((r) => r.problem).length;
  const incompleteCount = rows.length - problemCount;
  const ok = rows.length === 0;
  const visible = expanded ? rows : rows.slice(0, 6);

  return (
    <div className={`mt-5 rounded-2xl p-4 border shadow-sm ${ok ? 'bg-emerald-500/5 border-emerald-500/20' : problemCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
      <div className="flex gap-3 items-start w-full">
        <div className="mt-0.5">{ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className={problemCount > 0 ? 'text-rose-400' : 'text-amber-500'} />}</div>
        <div className="w-full min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${ok ? 'text-emerald-500' : problemCount > 0 ? 'text-rose-400' : 'text-amber-500'}`}>
            Sistem Bütünlüğü ve Veri Analizi
          </span>
          {ok ? (
            <p className="text-xs text-emerald-500/80 leading-relaxed max-w-2xl">
              {trades.length === 0
                ? 'Henüz kayıt yok.'
                : `${trades.length} işlemin tamamı eksiksiz ve tutarlı. Analizler tüm örneklemi kullanıyor.`}
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl mb-2">
                {problemCount > 0 && <><b className="text-rose-300">{problemCount} hatalı</b> (istatistiği bozar){incompleteCount > 0 ? ', ' : ' '}</>}
                {incompleteCount > 0 && <><b className="text-amber-300">{incompleteCount} eksik</b> kayıt var (bu işlemler ilgili analizlerin dışında kalır). </>}
                Tamamla ile işlemi açıp boş alanları doldurabilirsin.
                <span className="block text-[10px] text-zinc-500 mt-0.5">Bu kontrol hesap seçiminden bağımsızdır: tüm hesaplar ve hesapsız işlemler dahil.</span>
              </p>
              <ul className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 divide-y divide-zinc-800/80 overflow-hidden">
                {visible.map(({ t, problem, missing }) => (
                  <li key={t.id} className="p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <div className="flex items-center gap-2 min-w-0 sm:w-48 shrink-0">
                      <span className="text-xs font-bold text-zinc-200 truncate">{t.asset || 'Bilinmiyor'}</span>
                      <span className="text-[10px] text-zinc-500 tabular-nums">{nyWallDate(t.createdAt).toLocaleDateString('tr-TR')}</span>
                      <span className="text-[9px] font-bold uppercase text-zinc-500 truncate">{t.platform || ACCOUNT_CATEGORY_LABELS[getTradeAccountCategory(t)]}</span>
                      {t.quickEntry && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300">{smartUpper("Hızlı")}</span>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {problem && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300">{problem}</span>}
                      {missing.map((m) => (
                        <span key={m} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-zinc-700 bg-zinc-900 text-zinc-400">{m}</span>
                      ))}
                    </div>
                    {onEditTrade && (
                      <button
                        type="button"
                        onClick={() => onEditTrade(t)}
                        className="h-7 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        <Pencil size={12} /> Tamamla
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {rows.length > 6 && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer">
                  <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Daha Az Göster' : `Tümünü Göster (${rows.length})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BackupRescue;
