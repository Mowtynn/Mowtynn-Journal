import { PANE } from '../lib/motion';
import React, { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Trade, DefinitionTitles, PropAccount } from "../types";
import { defaultRiskAmount } from "../lib/propAccounts";
import {
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_ENTRY_MODELS,
  DEFAULT_TREND_TYPES,
  DEFAULT_DEFINITION_TITLES,
  DEFAULT_TP_TARGETS,
  DEFAULT_PREMIUM_DISCOUNTS,
  DEFAULT_NEWS_DAYS,
  DEFAULT_ASIA_RANGE_FVGS,
} from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { missingRequired } from "../lib/requiredFields";
import { Plus, X, Zap, Copy } from "lucide-react";
import { NO_ACCOUNT, Num, Status, AccountOption, buildInitial, useTitles, afterExitTpAsked } from './tradeForm/shared';
import { toNyInput, nyInputToTs } from '../lib/tradingTime';
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
  timeframes: string[];
  htfTimeframes?: string[];
  sessions: string[];
  confirmations: string[];
  assets: string[];
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
  tpTargets?: string[];
  premiumDiscounts?: string[];
  newsDays?: string[];
  asiaRangeFvgs?: string[];
  definitionTitles?: DefinitionTitles;
  /** En son kaydedilen işlem: "Son kurulumu kopyala" için */
  lastTrade?: Trade | null;
  /** Pencere kapatma isteği (Esc / X / arka plan) önce forma sorulur; true dönerse form isteği karşıladı demektir */
  registerCloseGuard?: (guard: (() => boolean) | null) => void;
  /** Prop hesapları: formda aktif hesaplar + "Hesapsız" seçenekleri olarak listelenir */
  propAccounts?: PropAccount[];
  /** Hızlı kayıt: yalnızca temel bilgiler + sonuç; ayrıntılar sonra düzenle ile tamamlanır */
  quickMode?: boolean;
  onQuickModeChange?: (v: boolean) => void;
  /**
   * Pencere şu an açık mı? App, yeni işlem formunu arka planda HAZIR (gizli) tutar; tıklanınca yalnızca görünür olur.
   * Kapalıyken: kaydırma kilidi, odak ve kapatma koruması devre dışı.
   */
  active?: boolean;
  /** Yeni işlemde önceden seçili hesap: üst çubukta tek hesap ya da Hesapsız seçiliyse o */
  defaultAccountChoice?: string | null;
}

/** Hesapsız (demo/backtest) seçimi */
const AddTradeForm = React.memo(function AddTradeForm({
  onSave,
  editingTrade,
  onCancelEdit,
  timeframes,
  htfTimeframes = [],
  sessions,
  confirmations,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  tpTargets = DEFAULT_TP_TARGETS,
  premiumDiscounts = DEFAULT_PREMIUM_DISCOUNTS,
  newsDays = DEFAULT_NEWS_DAYS,
  asiaRangeFvgs = DEFAULT_ASIA_RANGE_FVGS,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  lastTrade = null,
  registerCloseGuard,
  propAccounts = [],
  quickMode = false,
  onQuickModeChange,
  active = true,
  defaultAccountChoice = null,
}: AddTradeFormProps) {
  useBodyScrollLock(active);
  // Hızlı mod yalnızca yeni işlemde; düzenlerken her zaman tam form açılır (eksikler orada tamamlanır)
  const isQuick = quickMode && !editingTrade;
  const titles = useTitles(definitionTitles);

  // İlk değerler bir kez, doğrudan işlemden. Form her açılışta yeniden bağlanır (App'te key).
  const [init] = useState(() => {
    const base = buildInitial(editingTrade);
    return !editingTrade && defaultAccountChoice ? { ...base, accountChoice: defaultAccountChoice } : base;
  });
  const [asset, setAsset] = useState(init.asset);
  const [type, setType] = useState<"LONG" | "SHORT">(init.type);
  // Hesap seçimi: aktif prop hesabı id'si ya da NO_ACCOUNT (demo/backtest). Varsayılan yok; seçilmeden kayıt yapılmaz.
  const [accountChoice, setAccountChoice] = useState<string | null>(init.accountChoice);
  const [accountError, setAccountError] = useState(false);
  // Risk: hazır yüzde çipleri ya da elle yüzde (CUSTOM). Varsayılan yok; hesaplı işlemde seçilmeden kayıt yapılmaz.
  const [riskChoice, setRiskChoice] = useState<number | "CUSTOM" | null>(init.riskChoice);
  const [customRiskPct, setCustomRiskPct] = useState<Num>(init.customRiskPct);
  const [riskError, setRiskError] = useState(false);

  const [selectedTimeframe, setSelectedTimeframe] = useState(init.timeframe);
  const [selectedHtfTimeframe, setSelectedHtfTimeframe] = useState(init.htfTimeframe);
  const [selectedSession, setSelectedSession] = useState(init.session);
  const [selectedConfirmations, setSelectedConfirmations] = useState<string[]>(init.confirmations);
  const [selectedEntries, setSelectedEntries] = useState<string[]>(init.entries);
  const [selectedTrend, setSelectedTrend] = useState(init.trend);
  const [planFidelity, setPlanFidelity] = useState<string | null>(init.planFidelity);
  const [selectedTpTargets, setSelectedTpTargets] = useState<string[]>(init.tpTargets);
  const [premiumDiscount, setPremiumDiscount] = useState(init.premiumDiscount);
  // News Day / Bank Holiday: varsayılan yok; tam kayıtta seçilmesi zorunlu (yanlışlıkla "Yok" kalıp istatistiği kaydırmasın)
  const [newsDay, setNewsDay] = useState<boolean | null>(init.newsDay);
  const [newsDayError, setNewsDayError] = useState(false);
  const [asiaRange, setAsiaRange] = useState(init.asiaRange);
  const [sweepTime, setSweepTime] = useState(init.sweepTime);
  const [management, setManagement] = useState<string[]>(init.management);
  const [afterExitTp, setAfterExitTp] = useState<boolean | null>(init.afterExitTp);
  const [selectedAsiaFvg, setSelectedAsiaFvg] = useState(init.asiaFvg);

  const [stopPips, setStopPips] = useState<Num>(init.stopPips);
  const [tpPips, setTpPips] = useState<Num>(init.tpPips);
  const [asiaRangePips, setAsiaRangePips] = useState<Num>(init.asiaRangePips);
  const [maePips, setMaePips] = useState<Num>(init.maePips);
  const [mfePips, setMfePips] = useState<Num>(init.mfePips);
  const [rrValue, setRrValue] = useState<Num>(init.rrValue);
  const [tradeStatus, setTradeStatus] = useState<Status>(init.status);

  const [notes, setNotes] = useState(init.notes);
  const [screenshot, setScreenshot] = useState<string | null>(init.screenshot);
  const [tradeDate, setTradeDate] = useState(init.tradeDate);
  // Çıkış (NY): isteğe bağlı; boşsa işlemde kalma süresi hesaplanmaz
  const [exitDate, setExitDate] = useState<string>(init.exitDate);

  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [pairError, setPairError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);


  // Seçilebilir hesaplar: aktif prop hesapları + düzenlenen işlemin kendi hesabı (arşivde/silinmiş olsa bile)
  const accountOptions = useMemo<AccountOption[]>(() => {
    const list: AccountOption[] = propAccounts
      .filter((a) => a.status === "ACTIVE")
      .map((a) => ({ id: a.id, name: a.name, label: a.chainName || a.name, stage: a.stage, size: a.size, status: a.status }));
    const ownId = editingTrade?.accountId;
    if (ownId && !list.some((o) => o.id === ownId)) {
      const own = propAccounts.find((a) => a.id === ownId);
      list.push(
        own
          ? { id: own.id, name: own.name, label: own.chainName || own.name, stage: own.stage, size: own.size, status: own.status }
          : { id: ownId, name: editingTrade?.platform || "Silinmiş hesap", label: editingTrade?.platform || "Silinmiş hesap", stage: typeof editingTrade?.accountStage === "number" ? editingTrade.accountStage : 1 },
      );
    }
    return list;
  }, [propAccounts, editingTrade]);

  const selectedAccount = accountChoice && accountChoice !== NO_ACCOUNT ? accountOptions.find((o) => o.id === accountChoice) : undefined;
  const effectiveRiskPct =
    riskChoice === "CUSTOM" ? (typeof customRiskPct === "number" && customRiskPct > 0 ? customRiskPct : null) : riskChoice;
  // Risk hesabın BAŞLANGIÇ bakiyesi üzerinden: $ = bakiye × % / 100 (salt okunur gösterim + hesap bakiyesi için)
  const riskDollar =
    selectedAccount && typeof selectedAccount.size === "number" && effectiveRiskPct
      ? defaultRiskAmount({ size: selectedAccount.size, riskPct: effectiveRiskPct })
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const safeAsset = (asset || "").trim();
    const safeNotes = (notes || "").trim();

    if (!safeAsset) {
      setPairError(true);
      assetInputRef.current?.focus();
      toast.error("Lütfen bir parite seçin veya yazın.");
      return;
    }
    if (!accountChoice || (accountChoice !== NO_ACCOUNT && !selectedAccount)) {
      setAccountError(true);
      document.getElementById("account-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Hesap seçin (prop hesabı ya da Hesapsız).");
      return;
    }
    if (selectedAccount && !effectiveRiskPct) {
      setRiskError(true);
      document.getElementById("risk-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Bu işlemin riskini seçin (%).");
      return;
    }
    if (selectedAccount && effectiveRiskPct && effectiveRiskPct > 10) {
      setRiskError(true);
      toast.error("Risk yüzdesi gerçekçi değil (en fazla %10).");
      return;
    }
    if (!isQuick && newsDay === null) {
      setNewsDayError(true);
      document.getElementById("news-day-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("News Day / Bank Holiday seçimini yapın (Var / Yok).");
      return;
    }
    const matchedAsset = assets.find(
      (a) => a.toLowerCase() === safeAsset.toLowerCase(),
    );
    const finalAsset = matchedAsset || safeAsset.toUpperCase();

    const numericRR =
      rrValue !== ""
        ? Number(rrValue) *
          (tradeStatus === "LOSS"
            ? -1
            : tradeStatus === "BREAKEVEN"
              ? 0
              : 1)
        : 0;

    if (numericRR > 100 || numericRR < -20) {
      toast.error("R değeri gerçekçi değil (-20 ile 100 R arası olmalıdır).");
      return;
    }
    if (tradeStatus === "WIN" && numericRR <= 0) {
      toast.error("WIN işlemde sonuç R pozitif olmalı.");
      return;
    }
    if (tradeStatus === "LOSS" && numericRR >= 0) {
      toast.error("LOSS işlemde R girin (eksi işareti koymayın; durum işareti belirler).");
      return;
    }

    // Giriş ve çıkış NY saatiyle girilir; gerçek ana (UTC) çevrilerek saklanır
    const parsedTime = tradeDate ? nyInputToTs(tradeDate) : null;
    const safeCreatedAt = parsedTime !== null && parsedTime > 0 ? parsedTime : Date.now();
    const exitTs = exitDate ? nyInputToTs(exitDate) : null;
    if (exitTs !== null && exitTs < safeCreatedAt) {
      toast.error("Çıkış saati girişten önce olamaz.");
      return;
    }

    const record: Partial<Trade> = {
      ...(editingTrade?.id ? { id: editingTrade.id } : {}),
      createdAt: safeCreatedAt,
      asset: finalAsset,
      type,
      status: tradeStatus,
      rr: Number(numericRR.toFixed(2)),
      stopPips: stopPips !== "" && typeof stopPips === 'number' ? stopPips : undefined,
      tpPips: tpPips !== "" && typeof tpPips === 'number' ? tpPips : undefined,
      asiaRangePips: asiaRangePips !== "" && typeof asiaRangePips === 'number' ? asiaRangePips : undefined,
      maePips: maePips !== "" && typeof maePips === 'number' ? maePips : undefined,
      mfePips: mfePips !== "" && typeof mfePips === 'number' ? mfePips : undefined,
      timeframe: selectedTimeframe || undefined,
      htfTimeframe: selectedHtfTimeframe || undefined,
      session: selectedSession || undefined,
      confirmations: selectedConfirmations.length > 0 ? selectedConfirmations : undefined,
      entryModels: selectedEntries.length > 0 ? selectedEntries : undefined,
      trend: selectedTrend || undefined,
      planFidelity: planFidelity || undefined,
      tpTargets: selectedTpTargets.length > 0 ? selectedTpTargets : undefined,
      premiumDiscount: premiumDiscount || undefined,
      newsDay: newsDay ?? undefined,
      // Eski sürümün strateji alanı formda yok; düzenlemede eski değer silinmeden korunur
      strategy: editingTrade?.strategy || undefined,
      asiaRange: (asiaRange || undefined) as Trade["asiaRange"],
      sweepTime: sweepTime || undefined,
      management: management.length ? (management as Trade["management"]) : undefined,
      // Çıkış sonrası TP sorusu yalnızca BE / erken kapama / BE'ye çekilen işlemlerde anlamlı
      afterExitTp: afterExitTpAsked(tradeStatus, management) ? afterExitTp ?? undefined : undefined,
      asiaRangeFvg: selectedAsiaFvg || undefined,
      notes: safeNotes || undefined,
      screenshot: screenshot || undefined,
      // Hesap anlık görüntüsü: filtreler hesap aramadan çalışsın (aşama, tip, ad)
      ...accountSnapshot(),
      // Hızlı kayıt işareti; tam formla kaydedilince kalkar. Hızlı kayıtta girilmeyen alanlar düzenlemede korunur.
      quickEntry: isQuick ? true : undefined,
      exitAt: exitTs ?? undefined,
    };
    // Zorunlu alanlar (Tanımlamalar > Zorunlu Alanlar): tam kayıtta boş bırakılamaz; Hızlı Kayıt muaf
    if (!isQuick) {
      const missing = missingRequired(record);
      if (missing.length) {
        toast.error(`Zorunlu alanlar eksik: ${missing.join(", ")}. Ayrıntıları sonra girmek için Hızlı Kayıt kullan.`, { duration: 6000 });
        return;
      }
    }
    onSave(record as any);
  };

  function accountSnapshot(): Pick<Trade, "platform" | "accountId" | "accountStage" | "accountCategory" | "riskPct" | "riskAmount"> {
    if (!selectedAccount) {
      return { platform: undefined, accountId: undefined, accountStage: undefined, accountCategory: "DEMO", riskPct: undefined, riskAmount: undefined };
    }
    // Düzenlemede aynı hesap kaldıysa işlemin alındığı aşama korunur (hesap sonradan bir üst aşamaya geçmiş olabilir)
    const keepStage = editingTrade?.accountId === selectedAccount.id && typeof editingTrade.accountStage === "number";
    const stage = keepStage ? (editingTrade!.accountStage as number) : selectedAccount.stage;
    return {
      platform: selectedAccount.name,
      accountId: selectedAccount.id,
      accountStage: stage,
      accountCategory: stage === 0 ? "FUNDED" : "CHALLENGE",
      riskPct: effectiveRiskPct ?? undefined,
      riskAmount: riskDollar ?? (keepStage ? editingTrade?.riskAmount : undefined),
    };
  }

  // Kaydedilmemiş değişiklik takibi: ilk çizimdeki durum temel alınır (ek çizim yok)
  const snapshot = JSON.stringify([
    asset, type, accountChoice, riskChoice, customRiskPct, tradeDate, exitDate, tradeStatus, stopPips, tpPips, asiaRangePips,
    maePips, mfePips, rrValue, notes, screenshot, selectedTimeframe, selectedHtfTimeframe, selectedSession,
    selectedConfirmations, selectedEntries, selectedTrend, planFidelity,
    selectedTpTargets, premiumDiscount, newsDay, asiaRange, sweepTime, management, afterExitTp, selectedAsiaFvg,
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
    const now = toNyInput(Date.now());
    if (now !== tradeDate) {
      rebaseRef.current = true;
      setTradeDate(now);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const requestClose = () => onCancelEdit();

  // Yeni işlemde imleç doğrudan pariteye (yalnızca fare/klavye cihazlarında; telefonda klavye kendiliğinden açılmasın)
  useEffect(() => {
    if (editingTrade || !active) return;
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
    const t = window.setTimeout(() => assetInputRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [editingTrade, active]);

  // Son işlemin kurulumunu kopyala (sayısal sonuçlar, notlar ve News Day kopyalanmaz: bunlar işleme özgü)
  const applyLastSetup = () => {
    const t = lastTrade;
    if (!t) return;
    if (t.asset) setAsset(t.asset);
    if (t.type) setType(t.type);
    // Hesap yalnızca hâlâ aktifse kopyalanır; risk her işlemde bilinçli seçilir (kopyalanmaz)
    if (t.accountId && accountOptions.some((o) => o.id === t.accountId)) setAccountChoice(t.accountId);
    else if (!t.accountId && t.accountCategory === "DEMO") setAccountChoice(NO_ACCOUNT);
    setSelectedSession(t.session || "");
    setSelectedHtfTimeframe(t.htfTimeframe || "");
    setSelectedTimeframe(t.timeframe || "");
    setSelectedConfirmations(Array.isArray(t.confirmations) ? t.confirmations : []);
    setSelectedEntries(Array.isArray(t.entryModels) ? t.entryModels : []);
    setSelectedTrend(t.trend || "");
    setSelectedTpTargets(Array.isArray(t.tpTargets) ? t.tpTargets : []);
    setPremiumDiscount(t.premiumDiscount || "");
    setSelectedAsiaFvg(t.asiaRangeFvg || "");
    toast.success("Son işlemin kurulumu uygulandı. Riski, sonucu ve pip değerlerini girin.");
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
              title={quickMode ? "Tam forma geç" : "Yalnızca temel bilgiler ve sonuç; ayrıntıları sonra tamamla"}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[11px] font-bold transition-ui cursor-pointer ${
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
              title="Son işlemdeki parite, hesap ve kurulum seçimlerini uygular"
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-xl border border-zinc-700/70 bg-zinc-900/80 text-[11px] font-bold text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-ui cursor-pointer"
            >
              <Copy size={13} className="text-blue-400" />
              Son Kurulumu Kopyala
            </button>
          )}
          <button lang="en"
            type="button"
            aria-label="Kapat"
            title="Kapat (Esc)"
            onClick={(e) => {
              e.stopPropagation();
              requestClose();
            }}
            className="btn-icon w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>


      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
        <div className={`tf-body p-4 sm:p-5 flex flex-col ${isQuick ? "md:grid md:grid-cols-2 md:items-start" : "lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,11fr)_minmax(0,14fr)_minmax(0,8fr)]"} gap-4 overflow-y-auto overscroll-contain flex-1 min-h-0`}>

          {/* 1. SÜTUN: TEMEL BİLGİLER + NOTLAR. Hızlı kayıtta sarmalayıcı "contents" olur: Temel ve Sonuç yan yana iki sütun */}
          <div className={isQuick ? "contents" : "flex flex-col gap-4 min-w-0"}>
            <BasicInfoCard
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
              accountOptions={accountOptions}
              accountChoice={accountChoice}
              setAccountChoice={setAccountChoice}
              accountError={accountError}
              setAccountError={setAccountError}
              selectedAccount={selectedAccount}
              riskChoice={riskChoice}
              setRiskChoice={setRiskChoice}
              customRiskPct={customRiskPct}
              setCustomRiskPct={setCustomRiskPct}
              riskError={riskError}
              setRiskError={setRiskError}
              riskDollar={riskDollar}
              tradeDate={tradeDate}
              setTradeDate={setTradeDate}
              exitDate={exitDate}
              setExitDate={setExitDate}
            />
            {!isQuick && <NotesCard titles={titles} notes={notes} setNotes={setNotes} />}
            {isQuick && (
              <ResultCard
                titles={titles}
                isQuick={isQuick}
                tradeStatus={tradeStatus}
                setTradeStatus={setTradeStatus}
                rrValue={rrValue}
                setRrValue={setRrValue}
                stopPips={stopPips}
                setStopPips={setStopPips}
                tpPips={tpPips}
                setTpPips={setTpPips}
                maePips={maePips}
                setMaePips={setMaePips}
                mfePips={mfePips}
                setMfePips={setMfePips}
                asiaRangePips={asiaRangePips}
                setAsiaRangePips={setAsiaRangePips}
              />
            )}
          </div>

          {/* 2. SÜTUN: KURULUM ÇİPLERİ — 3. SÜTUN: NOTLAR (hızlı kayıtta yok) */}
          {!isQuick && (
            <div className="flex flex-col min-w-0">
              <SetupChips
                  titles={titles}
                  newsDays={newsDays}
                  planFidelities={planFidelities}
                  planFidelity={planFidelity}
                  setPlanFidelity={setPlanFidelity}
                  trendTypes={trendTypes}
                  selectedTrend={selectedTrend}
                  setSelectedTrend={setSelectedTrend}
                  newsDay={newsDay}
                  setNewsDay={setNewsDay}
                  newsDayError={newsDayError}
                  setNewsDayError={setNewsDayError}
                  asiaRange={asiaRange}
                  setAsiaRange={setAsiaRange}
                  sweepTime={sweepTime}
                  setSweepTime={setSweepTime}
                  management={management}
                  setManagement={setManagement}
                  afterExitTp={afterExitTp}
                  setAfterExitTp={setAfterExitTp}
                  tradeStatus={tradeStatus}
                  asiaRangeFvgs={asiaRangeFvgs}
                  selectedAsiaFvg={selectedAsiaFvg}
                  setSelectedAsiaFvg={setSelectedAsiaFvg}
                  sessions={sessions}
                  selectedSession={selectedSession}
                  setSelectedSession={setSelectedSession}
                  htfTimeframes={htfTimeframes}
                  selectedHtfTimeframe={selectedHtfTimeframe}
                  setSelectedHtfTimeframe={setSelectedHtfTimeframe}
                  timeframes={timeframes}
                  selectedTimeframe={selectedTimeframe}
                  setSelectedTimeframe={setSelectedTimeframe}
                  confirmations={confirmations}
                  selectedConfirmations={selectedConfirmations}
                  setSelectedConfirmations={setSelectedConfirmations}
                  entryModels={entryModels}
                  selectedEntries={selectedEntries}
                  setSelectedEntries={setSelectedEntries}
                  tpTargets={tpTargets}
                  selectedTpTargets={selectedTpTargets}
                  setSelectedTpTargets={setSelectedTpTargets}
                  premiumDiscounts={premiumDiscounts}
                  premiumDiscount={premiumDiscount}
                  setPremiumDiscount={setPremiumDiscount}
                />
            </div>
          )}
          {!isQuick && (
            <div className="flex flex-col gap-4 min-w-0 lg:col-span-2 lg:grid lg:grid-cols-2 xl:col-span-1 xl:flex">
              {/* 3. SÜTUN: SONUÇ + GRAFİK LİNKİ. Geniş ekranda (xl) üç sütun yan yana ve form kaydırmadan sığar;
                  1024–1279px'de iki sütuna sığmayan bu ikili alta, yan yana iner (alanlar sıkışmaz) */}
              <ResultCard
                titles={titles}
                isQuick={isQuick}
                tradeStatus={tradeStatus}
                setTradeStatus={setTradeStatus}
                rrValue={rrValue}
                setRrValue={setRrValue}
                stopPips={stopPips}
                setStopPips={setStopPips}
                tpPips={tpPips}
                setTpPips={setTpPips}
                maePips={maePips}
                setMaePips={setMaePips}
                mfePips={mfePips}
                setMfePips={setMfePips}
                asiaRangePips={asiaRangePips}
                setAsiaRangePips={setAsiaRangePips}
              />
              <ChartLinkCard titles={titles} screenshot={screenshot} setScreenshot={setScreenshot} />
            </div>
          )}

        </div>

        {/* ALT AKSİYON BUTONLARI */}
        <div className="tf-foot px-4 sm:px-5 py-3 sm:py-3.5 border-t border-zinc-800/80 bg-zinc-950/90 shrink-0 grid [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
              <motion.div key="actions" {...PANE} className="flex items-center justify-between gap-3">
                <span className="hidden md:flex items-center gap-1.5 text-[10px] font-sans text-zinc-500 select-none">
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Enter</kbd>
                  <span>kaydet</span>
                  <span className="mx-1 text-zinc-700">·</span>
                  <kbd className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 font-sans">Esc</kbd>
                  <span>kapat</span>
                </span>
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
