import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_PLAN_FIDELITIES, DEFAULT_ENTRY_MODELS, DEFAULT_TREND_TYPES, DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString } from "../constants/constants";
import { VoiceToTradeButton } from "./VoiceToTradeButton";
import { TurkishDateTimePicker } from "./TurkishDateTimePicker";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  Plus,
  X,
  Search,
  ChevronDown,
  Layers,
  Activity,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  Zap,
  TrendingUp,
  ExternalLink,
  Check,
  Bookmark,
  Clock,
  Maximize2,
  Target,
  Monitor
} from "lucide-react";

interface AddTradeFormProps {
  onSave: (
    trade: Omit<Trade, "id" | "createdAt"> & {
      id?: string;
      createdAt?: number;
    },
  ) => void;
  editingTrade: Trade | null;
  onCancelEdit: () => void;
  currency: string;
  platforms: string[];
  defaultPlatform?: string;
  timeframes: string[];
  htfTimeframes?: string[];
  sessions: string[];
  concepts: string[];
  confirmations: string[];
  assets: string[];
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
  definitionTitles?: DefinitionTitles;
}

const AddTradeForm = React.memo(function AddTradeForm({
  onSave,
  editingTrade,
  onCancelEdit,
  currency: _currency,
  platforms,
  defaultPlatform,
  timeframes,
  htfTimeframes = [],
  sessions,
  concepts,
  confirmations,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
}: AddTradeFormProps) {
  useBodyScrollLock(true);

  const [asset, setAsset] = useState("");
  const [type, setType] = useState<"LONG" | "SHORT">("LONG");
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    return defaultPlatform || localStorage.getItem("last_used_trade_platform") || platforms[0] || "";
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedHtfTimeframe, setSelectedHtfTimeframe] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedConcept, setSelectedConcept] = useState("");
  const [selectedConfirmations, setSelectedConfirmations] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [selectedTrend, setSelectedTrend] = useState("");
  const [planFidelity, setPlanFidelity] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancelEdit) {
        onCancelEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancelEdit]);

  const [rrValue, setRrValue] = useState<number | "">("");
  const [tradeStatus, setTradeStatus] = useState<"WIN" | "LOSS" | "BREAKEVEN">("WIN");
  const [manualPnl, setManualPnl] = useState<number | "">("");

  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [screenshot]);

  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  const [tradeDate, setTradeDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  useEffect(() => {
    if (editingTrade) {
      setAsset(editingTrade.asset || "");
      setType(editingTrade.type || "LONG");

      const initialStatus = editingTrade.status || (editingTrade.rr < 0 ? "LOSS" : editingTrade.rr === 0 ? "BREAKEVEN" : "WIN");
      setTradeStatus(initialStatus);

      if (editingTrade.rr !== undefined && editingTrade.rr !== null) {
        setRrValue(Math.abs(editingTrade.rr));
      } else {
        setRrValue("");
      }

      setManualPnl(
        editingTrade.pnl !== null && editingTrade.pnl !== undefined
          ? Math.abs(editingTrade.pnl)
          : "",
      );

      setNotes(editingTrade.notes || "");
      setScreenshot(editingTrade.screenshot || null);
      setSelectedPlatform(editingTrade.platform || defaultPlatform || platforms[0] || "");
      setSelectedTimeframe(editingTrade.timeframe || "");
      setSelectedHtfTimeframe(editingTrade.htfTimeframe || "");
      setSelectedSession(editingTrade.session || "");
      setSelectedConcept(editingTrade.concept || "");
      setSelectedConfirmations(editingTrade.confirmations || []);
      let initialEntries: string[] = [];
      if (Array.isArray(editingTrade.entryModels) && editingTrade.entryModels.length > 0) {
        initialEntries = editingTrade.entryModels;
      } else if (editingTrade.entry) {
        initialEntries = typeof editingTrade.entry === 'string'
          ? editingTrade.entry.split(',').map(s => s.trim()).filter(Boolean)
          : Array.isArray(editingTrade.entry) ? (editingTrade.entry as string[]) : [];
      }
      setSelectedEntries(initialEntries);
      setSelectedTrend(editingTrade.trend || "");
      setPlanFidelity(editingTrade.planFidelity || null);
      const d = new Date(editingTrade.createdAt || Date.now());
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setTradeDate(d.toISOString().slice(0, 16));
    } else {
      resetForm();
    }
  }, [editingTrade, platforms]);

  useEffect(() => {
    if (rrValue === 0) {
      setTradeStatus("BREAKEVEN");
    } else if (rrValue !== "" && tradeStatus === "BREAKEVEN") {
      setTradeStatus("WIN");
    }
  }, [rrValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assetDropdownRef.current &&
        !assetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAssetDropdownOpen(false);
      }
      if (
        platformDropdownRef.current &&
        !platformDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPlatformDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const resetForm = () => {
    setAsset("");
    setType("LONG");
    setRrValue("");
    setTradeStatus("WIN");
    setManualPnl("");
    setNotes("");
    setScreenshot(null);

    setSelectedPlatform(defaultPlatform || localStorage.getItem("last_used_trade_platform") || platforms[0] || "");
    setSelectedTimeframe("");
    setSelectedHtfTimeframe("");
    setSelectedSession("");
    setSelectedConcept("");
    setSelectedConfirmations([]);
    setSelectedEntries([]);
    setSelectedTrend("");
    setPlanFidelity(null);
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setTradeDate(d.toISOString().slice(0, 16));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
  };

  const handleVoiceParsed = (data: any) => {
    if (data.asset) setAsset(data.asset);
    if (data.type === 'LONG' || data.type === 'SHORT') setType(data.type);
    if (data.platform) setSelectedPlatform(data.platform);
    if (data.timeframe) setSelectedTimeframe(data.timeframe);
    if (data.htfTimeframe) setSelectedHtfTimeframe(data.htfTimeframe);
    if (data.session) setSelectedSession(data.session);
    if (data.concept) setSelectedConcept(data.concept);
    if (data.confirmations && Array.isArray(data.confirmations)) setSelectedConfirmations(data.confirmations);
    if (data.entryModels && Array.isArray(data.entryModels)) {
      setSelectedEntries(data.entryModels);
    } else if (data.entry) {
      const parsed = typeof data.entry === 'string' ? data.entry.split(',').map((s: string) => s.trim()).filter(Boolean) : data.entry;
      setSelectedEntries(Array.isArray(parsed) ? parsed : [data.entry]);
    }
    if (data.trend) setSelectedTrend(data.trend);
    if (data.planFidelity) setPlanFidelity(data.planFidelity);
    if (data.status) setTradeStatus(data.status);
    if (data.rr !== undefined) setRrValue(Math.abs(data.rr));
    if (data.pnl !== undefined) setManualPnl(Math.abs(data.pnl));
    if (data.notes) setNotes(data.notes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const safeAsset = (asset || "").trim();
    const safeNotes = (notes || "").trim();

    if (!safeAsset) {
      toast.error("Lütfen bir enstrüman girin (örn: BTC/USDT, ETH, AAPL).");
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
    const numericPnl =
      manualPnl !== ""
        ? Number(manualPnl) * (tradeStatus === "LOSS" ? -1 : 1)
        : 0;

    if (numericRR > 100 || numericRR < -20) {
      toast.error(
        "R:R değeri gerçekçi değil (-20 ile 100 R arası olmalıdır).",
      );
      return;
    }
    if (Math.abs(numericPnl) > 100000000) {
      toast.error(
        "Kâr/Zarar değeri limiti aşıyor.",
      );
      return;
    }
    if (tradeStatus === "WIN" && numericRR <= 0 && numericPnl <= 0) {
      toast.error(
        "WIN statüsündeki bir işlemin R:R veya PnL değeri pozitif olmalıdır.",
      );
      return;
    }
    if (tradeStatus === "LOSS" && numericRR >= 0 && numericPnl >= 0) {
      toast.error(
        "LOSS statüsündeki bir işlemin R:R veya PnL değeri pozitif OLMAMALIDIR. Lütfen eksi girmeyin, statü eksiye çevirecek, sadece mutlak değeri yazın. Ancak 0 girdiniz. Lütfen geçerli bir zarar büyüklüğü girin.",
      );
      return;
    }

    try {
      localStorage.setItem("last_used_trade_platform", selectedPlatform);
    } catch (e) {
      console.warn("Could not save last_used_trade_platform", e);
    }

    const entryStr = selectedEntries.join(", ");
    const parsedTime = tradeDate ? new Date(tradeDate).getTime() : Date.now();
    const safeCreatedAt = !isNaN(parsedTime) && parsedTime > 0 ? parsedTime : Date.now();

    onSave({
      ...(editingTrade?.id ? { id: editingTrade.id } : {}),
      createdAt: editingTrade?.createdAt || safeCreatedAt,
      asset: finalAsset,
      type,
      status: tradeStatus,
      rr: Number(numericRR.toFixed(2)),
      pnl: numericPnl,
      timeframe: selectedTimeframe || undefined,
      htfTimeframe: selectedHtfTimeframe || undefined,
      session: selectedSession || undefined,
      concept: selectedConcept || undefined,
      confirmations: selectedConfirmations.length > 0 ? selectedConfirmations : undefined,
      entry: entryStr || undefined,
      entryModels: selectedEntries.length > 0 ? selectedEntries : undefined,
      trend: selectedTrend || undefined,
      planFidelity: planFidelity || undefined,
      notes: safeNotes || undefined,
      screenshot: screenshot || undefined,
      platform: selectedPlatform || undefined,
    });
  };

  return (
    <div className="flex flex-col bg-[#0a0a0c] overflow-hidden rounded-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${editingTrade ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"}`} />
          <h2 className="heading-1 text-sm sm:text-base tracking-wider">
            {editingTrade ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelEdit();
            }}
            className="btn-icon w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-3.5 sm:p-4 lg:p-5 flex flex-col lg:grid lg:grid-cols-12 gap-3.5 sm:gap-4 overflow-y-auto max-h-[calc(92vh-115px)]">
          
          {/* 1. SÜTUN: TEMEL & FİNANS (4 / 12) */}
          <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-3.5 min-w-0">

            {/* KART 1: TEMEL BİLGİLER */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/60">
                <Layers size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">Temel Bilgiler</span>
              </div>

              {/* Satır 1: Parite & Yön */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* PARİTE */}
                <div className="relative" ref={assetDropdownRef}>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">
                    {(cleanDefinitionTitleString(definitionTitles.assets) || "PARİTE").toUpperCase()}
                  </label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                      <Search size={13} />
                    </span>
                    <input
                      type="text"
                      placeholder="ARA..."
                      value={asset}
                      onChange={(e) => {
                        setAsset(e.target.value.toUpperCase());
                        setIsAssetDropdownOpen(true);
                      }}
                      onFocus={() => setIsAssetDropdownOpen(true)}
                      className="w-full h-9.5 pl-8.5 pr-2.5 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all uppercase shadow-inner font-sans font-bold"
                    />
                  </div>
                  {isAssetDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl max-h-48 flex flex-col overflow-hidden shadow-2xl">
                      <div className="overflow-y-auto flex-1 py-1 divide-y divide-zinc-800/50 custom-scrollbar">
                        {assets.filter((a) => a.toLowerCase().includes(asset.toLowerCase())).length > 0 ? (
                          assets.filter((a) => a.toLowerCase().includes(asset.toLowerCase())).map((a, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => {
                                setAsset(a);
                                setIsAssetDropdownOpen(false);
                              }}
                              className="px-3 py-2 text-xs font-sans font-bold text-zinc-200 cursor-pointer hover:bg-zinc-800 hover:text-white uppercase transition-colors"
                            >
                              {a}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-500 text-center font-sans font-bold">Bulunamadı</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* YÖN (LONG/SHORT) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">YÖN</label>
                  <div className="grid grid-cols-2 gap-1.5 h-9.5 bg-zinc-950/80 border border-zinc-700/70 rounded-xl p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setType("LONG")}
                      className={`h-full rounded-lg text-xs font-sans font-bold uppercase transition-all flex items-center justify-center cursor-pointer ${
                        type === "LONG" ? "toggle-item-win font-bold shadow-xs" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 font-bold"
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("SHORT")}
                      className={`h-full rounded-lg text-xs font-sans font-bold uppercase transition-all flex items-center justify-center cursor-pointer ${
                        type === "SHORT" ? "toggle-item-loss font-bold shadow-xs" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 font-bold"
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              </div>

              {/* Satır 2: Platform & Tarih */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* PLATFORM */}
                <div className="relative" ref={platformDropdownRef}>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">
                    {(cleanDefinitionTitleString(definitionTitles.platforms) || "PLATFORM").toUpperCase()}
                  </label>
                  <div
                    onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                    className="w-full h-9.5 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 rounded-xl px-3 text-xs text-white flex items-center justify-between cursor-pointer transition-all shadow-inner font-sans uppercase select-none"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Monitor size={13} className="text-zinc-400 shrink-0" />
                      <span className={`truncate font-sans font-bold uppercase ${selectedPlatform ? "text-zinc-100" : "text-zinc-500"}`}>
                        {selectedPlatform || "Seç"}
                      </span>
                    </div>
                    <ChevronDown size={13} className="text-zinc-400 shrink-0" />
                  </div>
                  {isPlatformDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl max-h-48 flex flex-col overflow-hidden shadow-2xl">
                      <div className="overflow-y-auto flex-1 py-1 divide-y divide-zinc-800/50 custom-scrollbar">
                        {platforms.map((p, idx) => (
                          <div
                            key={idx}
                            onMouseDown={() => {
                              setSelectedPlatform(p);
                              setIsPlatformDropdownOpen(false);
                            }}
                            className="px-3 py-2 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-800 hover:text-white font-sans font-bold uppercase transition-colors"
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* TARİH */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">TARİH</label>
                  <div className="h-9.5 flex items-center">
                    <TurkishDateTimePicker value={tradeDate} onChange={setTradeDate} className="w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* KART 2: FİNANSAL SONUÇ */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/60">
                <Activity size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">Finansal Sonuç</span>
              </div>

              {/* DURUM: WIN / LOSS / BREAKEVEN */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">İŞLEM DURUMU</label>
                <div className="grid grid-cols-3 gap-1.5 h-9.5 bg-zinc-950/80 border border-zinc-700/70 rounded-xl p-1 shadow-inner">
                  {(["WIN", "LOSS", "BREAKEVEN"] as const).map((sVal) => {
                    const colors: Record<string, string> = {
                      WIN: "toggle-item-win font-bold shadow-xs",
                      LOSS: "toggle-item-loss font-bold shadow-xs",
                      BREAKEVEN: "toggle-item-brand font-bold shadow-xs",
                    };
                    return (
                      <button
                        key={sVal}
                        type="button"
                        onClick={() => {
                          setTradeStatus(sVal);
                          if (sVal === "BREAKEVEN") {
                            setRrValue(0);
                            setManualPnl("");
                          } else if (rrValue === 0) {
                            setRrValue("");
                          }
                        }}
                        className={`h-full text-xs font-bold font-sans rounded-lg border uppercase transition-all cursor-pointer ${
                          tradeStatus === sVal
                            ? colors[sVal]
                            : "bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        {sVal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* R:R ORANI & PNL */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* R:R */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">
                    R:R ORANI
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="2.5"
                    value={tradeStatus === "BREAKEVEN" ? 0 : rrValue}
                    disabled={tradeStatus === "BREAKEVEN"}
                    onChange={(e) => setRrValue(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-9.5 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner disabled:opacity-50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                </div>

                {/* PNL */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 block font-sans">
                    PNL
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={tradeStatus === "BREAKEVEN" ? "0" : manualPnl}
                    disabled={tradeStatus === "BREAKEVEN"}
                    onChange={(e) => setManualPnl(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-9.5 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans shadow-inner disabled:opacity-50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                </div>
              </div>
            </div>

            {/* KART 3: GRAFİK BAĞLANTISI */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">Grafik Linki</span>
                </div>
                {screenshot && (
                  <span className="text-[11px] text-emerald-400 font-sans flex items-center gap-1 font-bold">
                    <Check size={11} /> Link Eklendi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={screenshot || ""}
                  onChange={(e) => setScreenshot(e.target.value)}
                  placeholder="https://... TradingView veya grafik linki"
                  className="flex-1 h-9.5 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-sans font-medium shadow-inner"
                />
                {screenshot && (
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="h-9.5 px-3 bg-zinc-900 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700/70 rounded-xl text-zinc-400 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 font-sans cursor-pointer"
                  >
                    <X size={13} />
                    <span>Sil</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* 2. SÜTUN: TEKNİK STRATEJİ & KURGU (5 / 12) */}
          <div className="lg:col-span-5 flex flex-col min-w-0">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-sm h-full">
              
              {/* 1. SETUP KALİTESİ */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                  <ShieldCheck size={13} className="text-blue-400" />
                  {(cleanDefinitionTitleString(definitionTitles.planFidelities) || "SETUP KALİTESİ").toUpperCase()}
                </label>
                <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 h-9.5 shadow-inner">
                  {planFidelities.map((item) => {
                    const isSelected = planFidelity === item;
                    const lower = item.toLowerCase();
                    let activeStyle = "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold shadow-xs";
                    if (lower === "tam" || lower.includes("uygun") || lower.includes("sadık") || lower.includes("disciplined") || lower.includes("a+") || lower.includes("yüksek") || lower.includes("kusursuz")) {
                      activeStyle = "toggle-item-win font-bold shadow-xs";
                    } else if (lower === "kısmen" || lower.includes("partial") || lower.includes("orta") || lower === "b") {
                      activeStyle = "toggle-item-breakeven font-bold shadow-xs";
                    } else if (lower === "fomo" || lower.includes("ihlal") || lower.includes("disiplinsiz") || lower.includes("intikam") || lower.includes("düşük") || lower === "c") {
                      activeStyle = "toggle-item-loss font-bold shadow-xs";
                    }
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPlanFidelity(isSelected ? null : item)}
                        className={`min-w-0 h-full flex items-center justify-center px-2.5 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-all duration-150 select-none border cursor-pointer ${
                          isSelected ? activeStyle : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. TREND YAPISI */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                  <TrendingUp size={13} className="text-emerald-400" />
                  {(cleanDefinitionTitleString(definitionTitles.trendTypes) || "TREND").toUpperCase()}
                </label>
                <div className="w-full grid grid-flow-col auto-cols-fr bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-1 gap-1 h-9.5 shadow-inner">
                  {(trendTypes.length > 0 ? trendTypes : ["Continuation", "Reversal"]).map((tr, idx) => {
                    const isSelected = selectedTrend === tr;
                    const lower = tr.toLowerCase();
                    const isContinuation = lower.includes("continuation") || lower.includes("devam") || lower.includes("trend");
                    const isReversal = lower.includes("reversal") || lower.includes("dönüş") || lower.includes("ters");

                    const activeStyle = (isReversal || (!isContinuation && idx === 1))
                      ? "toggle-item-loss font-bold shadow-xs"
                      : "toggle-item-win font-bold shadow-xs";

                    return (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => setSelectedTrend(isSelected ? "" : tr)}
                        className={`min-w-0 h-full flex items-center justify-center px-3 rounded-lg text-xs font-sans font-bold tracking-wide uppercase transition-all duration-150 select-none border cursor-pointer ${
                          isSelected
                            ? activeStyle
                            : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="truncate">{tr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 SATIRLI TEKNİK MATRİS:
                  1. Satır: KONSEPT yanında SESSION
                  2. Satır: TIMEFRAME yanında PD ARRAY
                  3. Satır: ENTRY TIMEFRAME yanında ENTRY MODEL */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 border-t border-zinc-800/60">
                {/* 1. SATIR SOL: KONSEPT */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Bookmark size={12} className="text-amber-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.concepts) || "KONSEPT").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {concepts.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedConcept(c === selectedConcept ? "" : c)}
                        className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                          c === selectedConcept
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs"
                            : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. SATIR SAĞ: SESSION */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Clock size={12} className="text-purple-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.sessions) || "SESSION").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sessions.map((sess, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSession(sess === selectedSession ? "" : sess)}
                        className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                          sess === selectedSession
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-xs"
                            : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                        }`}
                      >
                        {sess}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SATIR SOL: TIMEFRAME */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Maximize2 size={12} className="text-rose-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.htfTimeframes) || "TIMEFRAME").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {htfTimeframes.map((tf, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedHtfTimeframe(tf === selectedHtfTimeframe ? "" : tf)}
                        className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                          tf === selectedHtfTimeframe
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-xs"
                            : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SATIR SAĞ: PD ARRAY */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Layers size={12} className="text-emerald-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.confirmations) || "PD ARRAY").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {confirmations.map((c, idx) => {
                      const isActive = selectedConfirmations.includes(c);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setSelectedConfirmations(
                              isActive
                                ? selectedConfirmations.filter((x) => x !== c)
                                : [...selectedConfirmations, c]
                            )
                          }
                          className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-xs"
                              : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SATIR SOL: ENTRY TIMEFRAME */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Target size={12} className="text-blue-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.timeframes) || "ENTRY TIMEFRAME").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {timeframes.map((tf, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTimeframe(tf === selectedTimeframe ? "" : tf)}
                        className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                          tf === selectedTimeframe
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-xs"
                            : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. SATIR SAĞ: ENTRY MODEL (Multi-select) */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 font-sans">
                    <Zap size={12} className="text-amber-400 shrink-0" />
                    {(cleanDefinitionTitleString(definitionTitles.entryModels) || "ENTRY MODEL").toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {entryModels.map((em, idx) => {
                      const isActive = selectedEntries.includes(em);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setSelectedEntries(
                              isActive
                                ? selectedEntries.filter((x) => x !== em)
                                : [...selectedEntries, em]
                            )
                          }
                          className={`px-3 py-1.5 text-xs rounded-xl transition-all font-sans font-bold tracking-wide cursor-pointer border uppercase ${
                            isActive
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs"
                              : "bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/60"
                          }`}
                        >
                          {em}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. SÜTUN: ANALİZ, NOTLAR & SES (3 / 12) */}
          <div className="lg:col-span-3 flex flex-col min-w-0">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-sm h-full">
              
              {/* BAŞLIK & VOICE-TO-TRADE */}
              <div className="flex items-center justify-between shrink-0 pb-1 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">Analiz & Notlar</span>
                </div>
                <VoiceToTradeButton
                  options={{ platforms, sessions, concepts, confirmations, timeframes, htfTimeframes, planFidelities, entryModels, trendTypes }}
                  onParsed={handleVoiceParsed}
                />
              </div>

              {/* NOTLAR TEXTAREA */}
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  placeholder="Setup kurgusu, destek/direnç, psikolojik etkenler veya FOMO notlarınız..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full flex-1 min-h-[130px] sm:min-h-[150px] bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all resize-none leading-relaxed font-sans font-medium shadow-inner"
                />
              </div>

              {/* GÖRSEL ÖNİZLEME */}
              {screenshot ? (
                <div className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 h-[88px] flex items-center justify-center shrink-0">
                  {previewError ? (
                    <p className="text-xs text-rose-400 font-sans font-bold text-center px-3">Görsel yüklenemedi (URL geçersiz)</p>
                  ) : (
                    <img
                      src={screenshot}
                      alt="Grafik Önizleme"
                      className="object-cover h-full w-full opacity-90 group-hover:opacity-100 transition-opacity"
                      onError={() => setPreviewError(true)}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={screenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-zinc-900/90 hover:bg-zinc-800 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 font-sans font-bold"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="bg-red-500/90 hover:bg-red-500 text-white p-1.5 rounded-lg text-xs font-sans font-bold cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : null}

            </div>
          </div>

        </div>

        {/* ALT AKSİYON BUTONLARI */}
        <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-end shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 hover:border-zinc-500 text-zinc-300 hover:text-white px-5 h-10 text-xs font-bold tracking-wider rounded-xl uppercase transition-all cursor-pointer font-sans"
            >
              İptal
            </button>
            <button
              type="submit"
              className={`px-7 h-10 text-xs font-black font-sans tracking-wider rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                editingTrade
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 active:scale-[0.98]"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-[0.98]"
              }`}
            >
              {editingTrade ? "Değişiklikleri Kaydet" : <><Plus size={14} /> İşlemi Ekle</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

export default AddTradeForm;
