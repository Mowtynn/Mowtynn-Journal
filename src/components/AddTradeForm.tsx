import { PANE } from '../lib/motion';
import React, { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Trade, DefinitionTitles, PropAccount } from "../types";
import { defaultRiskAmount } from "../lib/propAccounts";
import { formatMoney, formatR } from "../lib/format";
import {
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_ENTRY_MODELS,
  DEFAULT_TREND_TYPES,
  DEFAULT_DEFINITION_TITLES,
  DEFAULT_TP_TARGETS,
  DEFAULT_PREMIUM_DISCOUNTS,
  DEFAULT_NEWS_DAYS,
  DEFAULT_ASIA_RANGE_FVGS,
  DEFAULT_RISK_PRESETS,
  parseRiskPreset,
} from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { missingRequired } from "../lib/requiredFields";
import { Plus, X, Zap, Copy } from "lucide-react";
import { NO_ACCOUNT, Num, AccountOption, buildInitial, useTitles, statusOfR } from './tradeForm/shared';
import { roundR } from '../lib/tradeModel';
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
  sessions: string[];
  assets: string[];
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
  tpTargets?: string[];
  premiumDiscounts?: string[];
  newsDays?: string[];
  asiaRangeFvgs?: string[];
  /** Hazır risk yüzdeleri (Tanımlamalar > Risk) */
  riskPresets?: string[];
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
  sessions,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  tpTargets = DEFAULT_TP_TARGETS,
  premiumDiscounts = DEFAULT_PREMIUM_DISCOUNTS,
  newsDays = DEFAULT_NEWS_DAYS,
  asiaRangeFvgs = DEFAULT_ASIA_RANGE_FVGS,
  riskPresets = DEFAULT_RISK_PRESETS,
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
  const riskPresetValues = useMemo(
    () => riskPresets.map(parseRiskPreset).filter((n): n is number => n !== null),
    [riskPresets],
  );
  const [init] = useState(() => {
    const base = buildInitial(editingTrade, riskPresetValues);
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

  const [selectedSession, setSelectedSession] = useState(init.session);
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
  const [selectedAsiaFvg, setSelectedAsiaFvg] = useState(init.asiaFvg);

  const [rrValue, setRrValue] = useState<Num>(init.rrValue);

  const [notes, setNotes] = useState(init.notes);
  const [screenshot, setScreenshot] = useState<string | null>(init.screenshot);
  const [tradeDate, setTradeDate] = useState(init.tradeDate);

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

  // Alt çubuk özeti: varlık yazılınca ya da R girilince görünür
  const summary = useMemo(() => {
    const r = rrValue === "" || !Number.isFinite(Number(rrValue)) ? null : roundR(Number(rrValue));
    const a = asset.trim();
    if (!a && r === null) return null;
    return {
      asset: a,
      dir: a ? type : null,
      r,
      money: r !== null && riskDollar ? formatMoney(r * riskDollar, true) : null,
    };
  }, [asset, type, rrValue, riskDollar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const safeAsset = (asset || "").trim();
    const safeNotes = (notes || "").trim();

    if (!safeAsset) {
      setPairError(true);
      assetInputRef.current?.focus();
      toast.error("Bir parite seç ya da yaz.");
      return;
    }
    if (!accountChoice || (accountChoice !== NO_ACCOUNT && !selectedAccount)) {
      setAccountError(true);
      document.getElementById("account-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Hesap seç (prop hesabı ya da Hesapsız).");
      return;
    }
    if (selectedAccount && !effectiveRiskPct) {
      setRiskError(true);
      document.getElementById("risk-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Bu işlemin riskini seç (%).");
      return;
    }
    if (selectedAccount && effectiveRiskPct && effectiveRiskPct > 10) {
      setRiskError(true);
      toast.error("Risk % gerçekçi değil (en fazla %10).");
      return;
    }
    if (!isQuick && newsDay === null) {
      setNewsDayError(true);
      document.getElementById("news-day-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("News Day / Bank Holiday seçimini yap (Var / Yok).");
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

    // Tarih NY günü olarak seçilir; günün içindeki an kayıt anından gelir (aynı günün işlemleri giriliş sırasıyla dizilir)
    const parsedTime = tradeDate ? nyInputToTs(tradeDate) : null;
    const safeCreatedAt = parsedTime !== null && parsedTime > 0 ? parsedTime : Date.now();

    const record: Partial<Trade> = {
      ...(editingTrade?.id ? { id: editingTrade.id } : {}),
      createdAt: safeCreatedAt,
      asset: finalAsset,
      type,
      status: tradeStatus,
      rr: numericRR,
      session: selectedSession || undefined,
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
      asiaRangeFvg: selectedAsiaFvg || undefined,
      notes: safeNotes || undefined,
      screenshot: screenshot || undefined,
      // Hesap anlık görüntüsü: filtreler hesap aramadan çalışsın (aşama, tip, ad)
      ...accountSnapshot(),
      // Hızlı kayıt işareti; tam formla kaydedilince kalkar. Hızlı kayıtta girilmeyen alanlar düzenlemede korunur.
      quickEntry: isQuick ? true : undefined,
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
    asset, type, accountChoice, riskChoice, customRiskPct, tradeDate,
    rrValue, notes, screenshot, selectedSession,
    selectedEntries, selectedTrend, planFidelity,
    selectedTpTargets, premiumDiscount, newsDay, asiaRange, sweepTime, selectedAsiaFvg,
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
    setSelectedEntries(Array.isArray(t.entryModels) ? t.entryModels : []);
    setSelectedTrend(t.trend || "");
    setSelectedTpTargets(Array.isArray(t.tpTargets) ? t.tpTargets : []);
    setPremiumDiscount(t.premiumDiscount || "");
    setSelectedAsiaFvg(t.asiaRangeFvg || "");
    toast.success("Son işlemin kurulumu uygulandı. Riski ve sonucu gir.");
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
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-xl border border-zinc-700/70 bg-zinc-900/80 text-[11px] font-bold text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-ui cursor-pointer"
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
        <div className={`tf-body p-4 sm:p-5 flex flex-col ${isQuick ? "md:grid md:grid-cols-2 md:items-stretch" : "lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,11fr)_minmax(0,14fr)_minmax(0,8fr)]"} gap-4 overflow-y-auto overscroll-contain flex-1 min-h-0`}>

          {/* 1. SÜTUN: TEMEL BİLGİLER + SONUÇ — işlemin özü tek yerde. Hızlı kayıtta sarmalayıcı "contents" olur: Temel ve Sonuç yan yana iki sütun */}
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
              riskPresets={riskPresetValues}
              riskChoice={riskChoice}
              setRiskChoice={setRiskChoice}
              customRiskPct={customRiskPct}
              setCustomRiskPct={setCustomRiskPct}
              riskError={riskError}
              setRiskError={setRiskError}
              riskDollar={riskDollar}
              tradeDate={tradeDate}
              setTradeDate={setTradeDate}
            />
            <ResultCard
              titles={titles}
              rrValue={rrValue}
              setRrValue={setRrValue}
              riskDollar={riskDollar}
            />
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
                  asiaRangeFvgs={asiaRangeFvgs}
                  selectedAsiaFvg={selectedAsiaFvg}
                  setSelectedAsiaFvg={setSelectedAsiaFvg}
                  sessions={sessions}
                  selectedSession={selectedSession}
                  setSelectedSession={setSelectedSession}
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
              {/* 3. SÜTUN: GRAFİK + NOTLAR — sonradan dönülecek kayıtlar. Geniş ekranda (xl) üç sütun yan yana;
                  1024–1279px'de bu ikili alta, yan yana iner (alanlar sıkışmaz) */}
              <ChartLinkCard titles={titles} screenshot={screenshot} setScreenshot={setScreenshot} />
              <NotesCard titles={titles} notes={notes} setNotes={setNotes} />
            </div>
          )}

        </div>

        {/* ALT AKSİYON BUTONLARI */}
        <div className="tf-foot px-4 sm:px-5 py-3 sm:py-3.5 border-t border-zinc-800/80 bg-zinc-950/90 shrink-0 grid [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
              <motion.div key="actions" {...PANE} className="flex items-center justify-between gap-3">
                {/* Kaydetmeden önce tek bakışta ne kaydedileceği; boşken kısayol ipucu */}
                {summary ? (
                  <span className="hidden md:flex items-center gap-2 min-w-0 text-[11px] font-sans text-zinc-400 select-none tabular-nums" aria-live="polite">
                    {summary.asset && <span className="font-bold text-zinc-200 truncate">{summary.asset}</span>}
                    {summary.dir && <span className={summary.dir === "LONG" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{summary.dir === "LONG" ? "Long" : "Short"}</span>}
                    {summary.r !== null && (
                      <>
                        {summary.asset && <span className="text-zinc-700">·</span>}
                        <span className={`font-bold ${summary.r > 0 ? "text-emerald-400" : summary.r < 0 ? "text-rose-400" : "text-blue-300"}`}>{formatR(summary.r)}</span>
                        {summary.money && <span className="text-zinc-500">{summary.money}</span>}
                      </>
                    )}
                  </span>
                ) : (
                <span className="hidden md:flex items-center gap-1.5 text-[10px] font-sans text-zinc-500 select-none">
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
