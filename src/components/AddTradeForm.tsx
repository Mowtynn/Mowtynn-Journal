import { PANE } from '../lib/motion';
import React, { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Trade, DefinitionTitles, AccountCategory } from "../types";
import { formatR } from "../lib/format";
import {
  DEFAULT_TREND_TYPES,
  DEFAULT_DEFINITION_TITLES,
  DEFAULT_PREMIUM_DISCOUNTS,
  DEFAULT_POI_TIMEFRAMES,
  getTradeAccountKind,
} from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { missingRequired, loadRequiredFields, REQUIRED_FIELDS_EVENT } from "../lib/requiredFields";
import { Plus, X, Zap, Copy } from "lucide-react";
import { Num, Direction, buildInitial, useTitles, statusOfR } from './tradeForm/shared';
import { roundR, tradeConfirmations } from '../lib/tradeModel';
import { autoSessionForNyTime } from '../lib/sessions';
import { nyInputToTs, newTradeDateInput } from '../lib/tradingTime';
import { BasicInfoCard } from './tradeForm/BasicInfoCard';
import { ResultCard } from './tradeForm/ResultCard';
import { SetupChips } from './tradeForm/SetupChips';
import { NotesCard, ChartLinkCard } from './tradeForm/NotesCard';

interface AddTradeFormProps {
  onSave: (
    trade: Omit<Trade, "id" | "createdAt"> & {
      id?: string;
      createdAt?: number;
    },
  ) => void;
  editingTrade: Trade | null;
  onCancelEdit: () => void;
  sessions: string[];
  assets: string[];
  trendTypes?: string[];
  premiumDiscounts?: string[];
  /** POI Timeframe seçenekleri (Tanımlamalar) */
  poiTimeframes?: string[];
  definitionTitles?: DefinitionTitles;
  /** En son kaydedilen işlem: "Son kurulumu kopyala" için */
  lastTrade?: Trade | null;
  /** Pencere kapatma isteği (Esc / X / arka plan) önce forma sorulur; true dönerse form isteği karşıladı demektir */
  registerCloseGuard?: (guard: (() => boolean) | null) => void;
  /** Hızlı kayıt: yalnızca temel bilgiler + sonuç; ayrıntılar sonra düzenle ile tamamlanır */
  quickMode?: boolean;
  onQuickModeChange?: (v: boolean) => void;
  /**
   * Pencere şu an açık mı? App, yeni işlem formunu arka planda HAZIR (gizli) tutar; tıklanınca yalnızca görünür olur.
   * Kapalıyken: kaydırma kilidi, odak ve kapatma koruması devre dışı.
   */
  active?: boolean;
  /** Yeni işlemde önceden seçili hesap türü: üst çubukta Hesapsız seçiliyse o, değilse son işleminki */
  defaultAccountKind?: AccountCategory | null;
}

const AddTradeForm = React.memo(function AddTradeForm({
  onSave,
  editingTrade,
  onCancelEdit,
  sessions,
  assets,
  trendTypes = DEFAULT_TREND_TYPES,
  premiumDiscounts = DEFAULT_PREMIUM_DISCOUNTS,
  poiTimeframes = DEFAULT_POI_TIMEFRAMES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  lastTrade = null,
  registerCloseGuard,
  quickMode = false,
  onQuickModeChange,
  active = true,
  defaultAccountKind = null,
}: AddTradeFormProps) {
  useBodyScrollLock(active);
  // Hızlı mod yalnızca yeni işlemde; düzenlerken her zaman tam form açılır (eksikler orada tamamlanır)
  const isQuick = quickMode && !editingTrade;
  const titles = useTitles(definitionTitles);

  // İlk değerler bir kez, doğrudan işlemden. Form her açılışta yeniden bağlanır (App'te key).
  // Yeni işlem: son işlemin paritesi; hesap türü üst çubuktan ya da son işlemden
  const [init] = useState(() => {
    const base = buildInitial(editingTrade);
    if (editingTrade) return base;
    return { ...base, asset: lastTrade?.asset || base.asset, accountKind: defaultAccountKind ?? (lastTrade ? getTradeAccountKind(lastTrade) : null) };
  });
  const [asset, setAsset] = useState(init.asset);
  const [type, setType] = useState<Direction>(init.type);
  const [dirError, setDirError] = useState(false);
  // Hesap türü: Prop ya da Hesapsız (demo / backtest). Seçilmeden kayıt yapılmaz.
  const [accountKind, setAccountKind] = useState<AccountCategory | null>(init.accountKind);
  const [accountError, setAccountError] = useState(false);

  const [selectedTrend, setSelectedTrend] = useState(init.trend);
  const [selectedConfirmations, setSelectedConfirmations] = useState<string[]>(init.confirmations);
  const [asiaRange, setAsiaRange] = useState(init.asiaRange);
  const [sweepTime, setSweepTime] = useState(init.sweepTime);
  const [poiTimeframe, setPoiTimeframe] = useState(init.poiTimeframe);
  // Session POI Sweep saatinden otomatik gelir; kullanıcı tıklayıp başka bir session seçebilir.
  // Seçim o saate bağlıdır: saat değişince yeniden otomatiğe döner. Düzenlemede kayıttaki session, saat aynı kaldıkça korunur.
  const autoSession = (sweepTime && autoSessionForNyTime(sweepTime, sessions)) || "";
  const [sessionPick, setSessionPick] = useState<{ t: string; v: string } | null>(() =>
    editingTrade?.session ? { t: editingTrade.sweepTime || "", v: editingTrade.session } : null,
  );
  const session = sessionPick && sessionPick.t === sweepTime ? sessionPick.v : autoSession;
  // Otomatik olan seçilirse otomatiğe döner; başka bir session ya da boş (seçimi kaldırma) o saate bağlı elle seçim olur
  const pickSession = (v: string) => setSessionPick(v === autoSession ? null : { t: sweepTime, v });

  const [rrValue, setRrValue] = useState<Num>(init.rrValue);

  const [notes, setNotes] = useState(init.notes);
  const [screenshot, setScreenshot] = useState<string | null>(init.screenshot);
  const [tradeDate, setTradeDate] = useState(init.tradeDate);

  // Zorunlu alanlar (Tanımlamalar'dan; değişince güncellenir) ve kaydetme denendikten sonra eksiklerin vurgusu
  const [requiredFields, setRequiredFields] = useState(loadRequiredFields);
  useEffect(() => {
    const sync = () => setRequiredFields(loadRequiredFields());
    window.addEventListener(REQUIRED_FIELDS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REQUIRED_FIELDS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const [flagMissing, setFlagMissing] = useState(false);

  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [pairError, setPairError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);


  // Alt çubuk özeti: işlemin tek satırlık "fişi" — parite · yön · hesap · R, ardından kurulum akışının izi
  // (Asia Range › işlem tipi › sweep saati + session · POI TF › confirmations). Varlık yazılınca ya da R girilince görünür.
  const summary = useMemo(() => {
    const r = rrValue === "" || !Number.isFinite(Number(rrValue)) ? null : roundR(Number(rrValue));
    const a = asset.trim();
    if (!a && r === null) return null;
    const trail: { text: string; cls?: string }[] = [];
    // Kurulum akışıyla aynı sıra: Asia Range › İşlem Tipi › POI › Confirmations
    if (asiaRange) trail.push({ text: asiaRange });
    if (selectedTrend) trail.push({ text: selectedTrend });
    const poi = [[sweepTime, session].filter(Boolean).join(" "), poiTimeframe].filter(Boolean).join(" · ");
    if (poi) trail.push({ text: poi });
    if (selectedConfirmations.length) trail.push({ text: selectedConfirmations.length === 1 ? selectedConfirmations[0] : `${selectedConfirmations.length} confirmation` });
    return {
      asset: a,
      dir: a && type ? type : null,
      account: accountKind,
      r,
      trail,
    };
  }, [asset, type, accountKind, rrValue, asiaRange, sweepTime, session, poiTimeframe, selectedConfirmations, selectedTrend]);

  // Çift tıklama / Enter tekrarı aynı işlemi iki kez kaydetmesin
  const submitLockRef = useRef(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    const safeAsset = (asset || "").trim();
    const safeNotes = (notes || "").trim();

    if (!safeAsset) {
      setPairError(true);
      assetInputRef.current?.focus();
      toast.error("Bir parite seç ya da yaz.");
      return;
    }
    if (!type) {
      setDirError(true);
      document.getElementById("direction-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Yönü seç: Long ya da Short.");
      return;
    }
    if (!accountKind) {
      setAccountError(true);
      document.getElementById("account-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Hesap türünü seç: Prop ya da Hesapsız.");
      return;
    }
    const matchedAsset = assets.find(
      (a) => a.toLowerCase() === safeAsset.toLowerCase(),
    );
    const finalAsset = matchedAsset || safeAsset.toUpperCase();

    // Sonuç boş bırakılırsa sessizce başabaş sayılmasın: R zorunlu, durum R'nin işaretinden gelir
    if (rrValue === "" || !Number.isFinite(Number(rrValue))) {
      document.getElementById("tf-result-r")?.focus();
      toast.error("Sonuç R'yi gir (kazanç +, kayıp −, başabaş 0).");
      return;
    }
    // Kayıt 2 ondalıkla tutulur; durum yuvarlanmış değerden gelir (0.004 → 0 → başabaş, "-0" yok)
    const numericRR = roundR(Number(rrValue));
    const tradeStatus = statusOfR(numericRR);

    if (numericRR > 100 || numericRR < -20) {
      toast.error("R değeri gerçekçi değil (-20 ile 100 R arası olmalıdır).");
      return;
    }

    // Seçilen gün (Türkiye takvimi) işlemin günüdür; saat kısmı Türkiye saatinden gelir ve yalnızca aynı günün işlemlerini
    // giriliş sırasıyla dizer. Kayıt aynı tarihli NY gününe düşer, böylece her yerde seçilen tarihte görünür.
    // POI Sweep Time ayrı bir alandır ve New York saatidir.
    const parsedTime = tradeDate ? nyInputToTs(tradeDate) : null;
    const safeCreatedAt = parsedTime !== null && parsedTime > 0 ? parsedTime : Date.now();

    const record: Partial<Trade> = {
      ...(editingTrade?.id ? { id: editingTrade.id } : {}),
      createdAt: safeCreatedAt,
      asset: finalAsset,
      type,
      status: tradeStatus,
      rr: numericRR,
      session: session || undefined,
      trend: selectedTrend || undefined,
      confirmationTags: selectedConfirmations.length > 0 ? selectedConfirmations : undefined,
      // Eski tek değerli alan bilinçli boşaltılır: düzenlemede birleştirme eski değeri geri getirmesin
      premiumDiscount: undefined,
      // Formdan kaldırılan alanlar (strateji, Entry Model, Target, News Day, Asia Range FVG, Setup Kalitesi): düzenlemede eski değer korunur
      planFidelity: editingTrade?.planFidelity || undefined,
      strategy: editingTrade?.strategy || undefined,
      entryModels: editingTrade?.entryModels?.length ? editingTrade.entryModels : undefined,
      tpTargets: editingTrade?.tpTargets?.length ? editingTrade.tpTargets : undefined,
      newsDay: typeof editingTrade?.newsDay === "boolean" ? editingTrade.newsDay : undefined,
      asiaRangeFvg: editingTrade?.asiaRangeFvg || undefined,
      asiaRange: (asiaRange || undefined) as Trade["asiaRange"],
      sweepTime: sweepTime || undefined,
      poiTimeframe: poiTimeframe || undefined,
      notes: safeNotes || undefined,
      screenshot: screenshot || undefined,
      // Hesap türü: Prop ya da Hesapsız. Eski hesap takibi alanları (hesap adı, aşama, risk) düzenlemede korunur.
      prop: accountKind === "PROP" ? true : undefined,
      accountCategory: accountKind === "DEMO" ? "DEMO" : undefined,
      // Hızlı kayıt işareti; tam formla kaydedilince kalkar. Hızlı kayıtta girilmeyen alanlar düzenlemede korunur.
      quickEntry: isQuick ? true : undefined,
    };
    // Zorunlu alanlar (Tanımlamalar > Zorunlu Alanlar): tam kayıtta boş bırakılamaz; Hızlı Kayıt muaf
    if (!isQuick) {
      const missing = missingRequired(record, requiredFields);
      if (missing.length) {
        setFlagMissing(true);
        toast.error(`Zorunlu alanlar eksik: ${missing.join(", ")}. Ayrıntıları sonra girmek için Hızlı Kayıt kullan.`, { duration: 6000 });
        return;
      }
    }
    submitLockRef.current = true;
    // Kayıt başarısız olup form açık kalırsa kilit kendiliğinden kalkar
    window.setTimeout(() => {
      submitLockRef.current = false;
    }, 1200);
    onSave(record as any);
  };

  // Kaydedilmemiş değişiklik takibi: ilk çizimdeki durum temel alınır (ek çizim yok)
  const snapshot = JSON.stringify([
    asset, type, accountKind, tradeDate,
    rrValue, notes, screenshot, selectedTrend,
    selectedConfirmations, asiaRange, sweepTime, session, poiTimeframe,
  ]);
  const baselineRef = useRef(snapshot);
  // Hazır bekleyen form açılınca tarih "şimdi"ye çekilir; bu değişiklik kirli sayılmasın diye taban yenilenir
  const rebaseRef = useRef(false);
  if (rebaseRef.current) {
    baselineRef.current = snapshot;
    rebaseRef.current = false;
  }
  const isDirty = baselineRef.current !== snapshot;

  // Kapatma isteği: önce açık menüyü kapat, sonra kaydedilmemiş değişiklik varsa onay iste
  // Kapatma: açık parite listesi varsa önce o kapanır; aksi halde pencere doğrudan kapanır (onay sorulmaz)
  const guardStateRef = useRef({ isDirty, isAssetDropdownOpen });
  guardStateRef.current = { isDirty, isAssetDropdownOpen };
  useEffect(() => {
    if (!registerCloseGuard || !active) return;
    registerCloseGuard(() => {
      const st = guardStateRef.current;
      if (st.isAssetDropdownOpen) {
        setIsAssetDropdownOpen(false);
        return true;
      }
      return false;
    });
    return () => registerCloseGuard(null);
  }, [registerCloseGuard, active]);

  // Arka planda hazır tutulan yeni işlem formu açıldığında: dokunulmamışsa tarih/saat açılış anına güncellenir
  useEffect(() => {
    if (!active || editingTrade || guardStateRef.current.isDirty) return;
    const now = newTradeDateInput(Date.now());
    if (now !== tradeDate) {
      rebaseRef.current = true;
      setTradeDate(now);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Form işlemler yüklenmeden hazırlandıysa: dokunulmamış yeni formda parite son işlemden gelir
  useEffect(() => {
    if (editingTrade || !lastTrade?.asset || guardStateRef.current.isDirty || asset) return;
    rebaseRef.current = true;
    setAsset(lastTrade.asset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTrade?.asset]);

  const requestClose = () => onCancelEdit();

  // Yeni işlemde imleç doğrudan pariteye (yalnızca fare/klavye cihazlarında; telefonda klavye kendiliğinden açılmasın)
  useEffect(() => {
    if (editingTrade || !active) return;
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
    const t = window.setTimeout(() => assetInputRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [editingTrade, active]);

  // Son işlemin kurulumunu kopyala (sayısal sonuçlar, notlar ve sweep saati kopyalanmaz: bunlar işleme özgü)
  const applyLastSetup = () => {
    const t = lastTrade;
    if (!t) return;
    if (t.asset) setAsset(t.asset);
    if (t.type) { setType(t.type); setDirError(false); }
    setAccountKind(getTradeAccountKind(t));
    setAccountError(false);
    setSelectedTrend(t.trend || "");
    setPoiTimeframe(t.poiTimeframe || "");
    setSelectedConfirmations(tradeConfirmations(t));
    toast.success("Son işlemin kurulumu uygulandı. Sonucu gir.");
  };

  return (
    <div
      className="trade-form-root flex flex-col flex-1 min-h-0 bg-[#0a0a0c] overflow-hidden rounded-2xl"
      data-dirty={isDirty || undefined}
      onKeyDown={(e) => {
        // Ctrl/Cmd + Enter: her alandan kaydet
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      
      {/* Header */}
      <div className="tf-head flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${editingTrade ? "bg-blue-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"}`} />
          <h2 className="heading-1 text-sm sm:text-base tracking-wider">
            {editingTrade ? (editingTrade.quickEntry ? "İşlemi Tamamla" : "İşlemi Düzenle") : isQuick ? "Hızlı Kayıt" : "Yeni İşlem Ekle"}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editingTrade && onQuickModeChange && (
            <button
              type="button"
              onClick={() => onQuickModeChange(!quickMode)}
              aria-pressed={quickMode}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-xl border text-label font-bold transition-ui cursor-pointer ${
                quickMode
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25"
                  : "border-zinc-700/70 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800"
              }`}
            >
              <Zap size={13} className={quickMode ? "text-blue-300" : "text-blue-400"} />
              {quickMode ? "Hızlı Kayıt: Açık" : "Hızlı Kayıt"}
            </button>
          )}
          {!editingTrade && lastTrade && (
            <button
              type="button"
              onClick={applyLastSetup}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-xl border border-zinc-700/70 bg-zinc-900/80 text-label font-bold text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-ui cursor-pointer"
            >
              <Copy size={13} className="text-blue-400" />
              Son Kurulumu Kopyala
            </button>
          )}
          <button lang="en"
            type="button"
            aria-label="Kapat"
            onClick={(e) => {
              e.stopPropagation();
              requestClose();
            }}
            className="btn-icon w-8 h-8"
          >
            <X size={16} />
          </button>
        </div>
      </div>


      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
        {/* Gövde: iki eşit sütun, aynı hizada biter.
            Sol: işlemin kimliği ve sonucu (Temel Bilgiler · Sonuç · Grafik Linki) — Sağ: Kurulum akışı · Notlar.
            Telefonda tek sütun ve okuma sırası: Temel → Sonuç → Kurulum → Grafik → Notlar (sütun sarmalayıcıları "contents" olur,
            kartlar order ile dizilir). Hızlı kayıtta yalnızca Temel ve Sonuç, yan yana. */}
        <div className={`tf-body p-4 sm:p-5 flex flex-col ${isQuick ? "md:grid md:grid-cols-2 md:items-stretch" : "lg:grid lg:grid-cols-2 lg:items-stretch"} gap-4 overflow-y-auto overscroll-contain flex-1 min-h-0`}>

          {/* SOL SÜTUN */}
          <div className={isQuick ? "contents" : "contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0"}>
            <BasicInfoCard
              className="order-1"
              titles={titles}
              assets={assets}
              asset={asset}
              setAsset={setAsset}
              pairError={pairError}
              setPairError={setPairError}
              assetInputRef={assetInputRef}
              isAssetDropdownOpen={isAssetDropdownOpen}
              setIsAssetDropdownOpen={setIsAssetDropdownOpen}
              type={type}
              setType={setType}
              accountKind={accountKind}
              setAccountKind={setAccountKind}
              accountError={accountError}
              setAccountError={setAccountError}
              dirError={dirError}
              setDirError={setDirError}
              tradeDate={tradeDate}
              setTradeDate={setTradeDate}
            />
            <ResultCard
              className="order-2"
              titles={titles}
              rrValue={rrValue}
              setRrValue={setRrValue}
            />
            {!isQuick && <ChartLinkCard className="order-4" titles={titles} screenshot={screenshot} setScreenshot={setScreenshot} />}
          </div>

          {/* SAĞ SÜTUN: KURULUM AKIŞI + NOTLAR (hızlı kayıtta yok) */}
          {!isQuick && (
            <div className="contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
              <SetupChips
                className="order-3 shrink-0"
                titles={titles}
                trendTypes={trendTypes}
                selectedTrend={selectedTrend}
                setSelectedTrend={setSelectedTrend}
                asiaRange={asiaRange}
                setAsiaRange={setAsiaRange}
                sweepTime={sweepTime}
                setSweepTime={setSweepTime}
                session={session}
                sessions={sessions}
                onSessionChange={pickSession}
                poiTimeframes={poiTimeframes}
                poiTimeframe={poiTimeframe}
                setPoiTimeframe={setPoiTimeframe}
                premiumDiscounts={premiumDiscounts}
                selectedConfirmations={selectedConfirmations}
                setSelectedConfirmations={setSelectedConfirmations}
                required={requiredFields}
                flagMissing={flagMissing}
              />
              <NotesCard className="order-5" titles={titles} notes={notes} setNotes={setNotes} />
            </div>
          )}

        </div>

        {/* ALT AKSİYON BUTONLARI */}
        <div className="tf-foot px-4 sm:px-5 py-3 sm:py-3.5 border-t border-zinc-800/80 bg-zinc-950/90 shrink-0 grid [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
              <motion.div key="actions" {...PANE} className="flex items-center justify-between gap-3">
                {/* Kaydetmeden önce tek bakışta ne kaydedileceği; boşken kısayol ipucu */}
                {summary ? (
                  <span className="hidden md:flex items-center gap-2 min-w-0 text-label font-sans text-zinc-400 select-none tabular-nums" aria-live="polite">
                    {summary.asset && <span className="font-bold text-zinc-100 truncate">{summary.asset}</span>}
                    {summary.dir && <span className={summary.dir === "LONG" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{summary.dir === "LONG" ? "Long" : "Short"}</span>}
                    {summary.account && (
                      <span className={`px-1.5 py-px rounded-md border font-bold uppercase ${summary.account === "PROP" ? "border-blue-500/30 text-blue-300" : "border-amber-500/30 text-amber-300"}`}>
                        {summary.account === "PROP" ? "Prop" : "Hesapsız"}
                      </span>
                    )}
                    {summary.r !== null && (
                      <span className={`font-bold ${summary.r > 0 ? "text-emerald-400" : summary.r < 0 ? "text-rose-400" : "text-blue-300"}`}>{formatR(summary.r)}</span>
                    )}
                    {summary.trail.length > 0 && (
                      <span className="flex items-center gap-1.5 min-w-0 pl-2 ml-0.5 border-l border-zinc-800 truncate" lang="en">
                        {summary.trail.map((p, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="text-zinc-700">›</span>}
                            <span className={`whitespace-nowrap ${p.cls || "text-zinc-400"}`}>{p.text}</span>
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                  </span>
                ) : (
                <span className="hidden md:flex items-center gap-1.5 text-label font-sans text-zinc-500 select-none">
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Enter</kbd>
                  <span>kaydet</span>
                  <span className="mx-1 text-zinc-700">·</span>
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Esc</kbd>
                  <span>kapat</span>
                </span>
                )}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 hover:border-zinc-500 text-zinc-300 hover:text-white px-5 h-10 text-xs font-bold tracking-wider rounded-xl uppercase transition-ui cursor-pointer font-sans"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-6 h-10 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 font-bold text-xs rounded-xl transition-ui duration-200 ease-out flex items-center justify-center gap-2 shadow-xs border border-blue-500/30 tracking-wide cursor-pointer font-sans uppercase"
                  >
                    {editingTrade ? "Değişiklikleri Kaydet" : <><Plus size={14} /> İşlemi Ekle</>}
                  </button>
                </div>
              </motion.div>
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
});

export default AddTradeForm;
