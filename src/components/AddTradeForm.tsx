import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trade } from "../types";
import { VoiceToTradeButton } from "./VoiceToTradeButton";
import { useAppStore } from "../store/useAppStore";
import {
  Plus,
  AlertCircle,
  X,
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
}

const AddTradeForm = React.memo(function AddTradeForm({
  onSave,
  editingTrade,
  onCancelEdit,
  currency,
  platforms,
  defaultPlatform,
  timeframes,
  htfTimeframes = [],
  sessions,
  concepts,
  confirmations,
  assets,
}: AddTradeFormProps) {
  const { isQuantMode } = useAppStore();
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setErrorMsg(null);

    setSelectedPlatform(defaultPlatform || localStorage.getItem("last_used_trade_platform") || platforms[0] || "");
    setSelectedTimeframe("");
    setSelectedHtfTimeframe("");
    setSelectedSession("");
    setSelectedConcept("");
    setSelectedConfirmations([]);
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
    if (data.status) setTradeStatus(data.status);
    if (data.rr !== undefined) setRrValue(Math.abs(data.rr));
    if (data.pnl !== undefined) setManualPnl(Math.abs(data.pnl));
    if (data.notes) setNotes(data.notes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const safeAsset = (asset || "").trim();
    const safeNotes = (notes || "").trim();

    if (!safeAsset) {
      setErrorMsg("Lütfen bir enstrüman girin (örn: BTC/USDT, ETH, AAPL).");
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
      setErrorMsg(
        "R:R değeri gerçekçi değil (-20 ile 100 R arası olmalıdır).",
      );
      return;
    }
    if (Math.abs(numericPnl) > 100000000) {
      setErrorMsg(
        "Kâr/Zarar değeri limiti aşıyor.",
      );
      return;
    }
    if (tradeStatus === "WIN" && numericRR <= 0 && numericPnl <= 0) {
      setErrorMsg(
        "WIN statüsündeki bir işlemin R:R veya PnL değeri pozitif olmalıdır.",
      );
      return;
    }
    if (tradeStatus === "LOSS" && numericRR >= 0 && numericPnl >= 0) {
      setErrorMsg(
        "LOSS statüsündeki bir işlemin R:R veya PnL değeri girilmeli ve negatif olmalıdır.",
      );
      return;
    }

    const tradeData = {
      ...(editingTrade ? { id: editingTrade.id } : {}),
      asset: finalAsset,
      type,
      status: tradeStatus,
      createdAt: new Date(tradeDate).getTime(),
      rr: numericRR,
      pnl: numericPnl,
      timeframe: selectedTimeframe || undefined,
      htfTimeframe: selectedHtfTimeframe || undefined,
      session: selectedSession || undefined,
      concept: selectedConcept || undefined,
      confirmations: selectedConfirmations.length > 0 ? selectedConfirmations : undefined,
      notes: safeNotes || undefined,
      screenshot: screenshot || undefined,
      platform: selectedPlatform || undefined,
    };

    if (selectedPlatform) {
      localStorage.setItem("last_used_trade_platform", selectedPlatform);
    }

    onSave(tradeData);
    if (!editingTrade) {
      resetForm();
    }
  };

  return (
    <div
      id="trade-form-container"
      className="p-4 sm:p-6 text-zinc-100 flex flex-col relative"
    >
      <button
        type="button"
        onClick={onCancelEdit}
        className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition p-1 rounded-full hover:bg-zinc-800/80 cursor-pointer"
      >
        <X size={16} />
      </button>

      <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2 mb-4">
        {editingTrade ? (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 " />
            {isQuantMode ? "UPDATE DATA LOG" : "İşlemi Düzenle"}
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-blue-400 " />
            {isQuantMode ? "DATA STREAM & MODEL LOG REGISTRY" : "Yeni İşlem Kaydı"}
          </>
        )}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ scaleY: 0.8, opacity: 0, originY: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0.8, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg p-3 text-[10px] font-sans leading-relaxed overflow-hidden"
            >
              <AlertCircle size={13} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid ${isQuantMode ? 'grid-cols-2' : 'grid-cols-3'} gap-2 sm:gap-3`}>
          <div className="relative" ref={assetDropdownRef}>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
              {isQuantMode ? "DATA STREAM" : "Parite"}
            </label>
            <input
              type="text"
              placeholder="Ara veya seç..."
              value={asset}
              onChange={(e) => {
                setAsset(e.target.value.toUpperCase());
                setIsAssetDropdownOpen(true);
              }}
              onFocus={() => setIsAssetDropdownOpen(true)}
              className="w-full h-10 sm:h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition uppercase shadow-inner"
            />
            {isAssetDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg max-h-60 flex flex-col overflow-hidden shadow-md">
                <div className="overflow-y-auto flex-1 py-1">
                  {assets.filter((a) =>
                    a.toLowerCase().includes(asset.toLowerCase()),
                  ).length > 0 ? (
                    assets
                      .filter((a) =>
                        a.toLowerCase().includes(asset.toLowerCase()),
                      )
                      .map((a, idx) => (
                        <div
                          key={`asset-${a}-${idx}`}
                          onMouseDown={() => {
                            setAsset(a);
                            setIsAssetDropdownOpen(false);
                            setErrorMsg(null);
                          }}
                          className="px-3 py-2 text-xs text-white cursor-pointer hover:bg-zinc-800 uppercase"
                        >
                          {a}
                        </div>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-[10px] text-zinc-500 text-center">
                      Sonuç bulunamadı
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isQuantMode && (
            <div className="relative" ref={platformDropdownRef}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 font-mono">
                Platform
              </label>
              <div
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                className="w-full h-10 sm:h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-zinc-500 transition shadow-inner font-mono uppercase select-none"
              >
                <span className={selectedPlatform ? "text-white" : "text-zinc-500"}>
                  {selectedPlatform || "Platform Seçin"}
                </span>
                <span className="text-zinc-500 text-[10px]">▼</span>
              </div>
              {isPlatformDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg max-h-60 flex flex-col overflow-hidden shadow-md">
                  <div className="overflow-y-auto flex-1 py-1">
                    {platforms.map((p, idx) => (
                      <div
                        key={`plat-${p}-${idx}`}
                        onMouseDown={() => {
                          setSelectedPlatform(p);
                          setIsPlatformDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-xs text-white cursor-pointer hover:bg-zinc-800 font-mono uppercase"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 font-mono">
              {isQuantMode ? "BIAS" : "Yön"}
            </label>
            <div className="grid grid-cols-2 gap-1.5 h-10 sm:h-8">
              <button
                type="button"
                onClick={() => setType("LONG")}
                className={`rounded-lg text-[10px] font-black tracking-widest transition-colors duration-200 ease-out flex items-center justify-center border cursor-pointer uppercase ${
                  type === "LONG"
                    ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/25 shadow-sm"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {isQuantMode ? "BULLISH" : "LONG"}
              </button>
              <button
                type="button"
                onClick={() => setType("SHORT")}
                className={`rounded-lg text-[10px] font-black tracking-widest transition-colors duration-200 ease-out flex items-center justify-center border cursor-pointer uppercase ${
                  type === "SHORT"
                    ? "bg-rose-400/10 text-rose-400 border-rose-400/25 shadow-sm"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {isQuantMode ? "BEARISH" : "SHORT"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {isQuantMode ? "VALIDATION STATUS" : "İşlem Durumu"}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {(["WIN", "LOSS", "BREAKEVEN"] as const).map(
                (statusValue) => {
                  const colors: Record<string, string> = {
                    WIN: "bg-emerald-400/10 text-emerald-400 border-emerald-400/25 shadow-sm",
                    LOSS: "bg-rose-400/10 text-rose-400 border-rose-400/25 shadow-sm",
                    BREAKEVEN: "bg-blue-400/10 text-blue-400 border-blue-400/25 shadow-sm",
                  };
                  const labels: Record<string, string> = {
                    WIN: isQuantMode ? "🏆 VALIDATED" : "🏆 WIN",
                    LOSS: isQuantMode ? "📈 NULL / REJECTED" : "📈 LOSS",
                    BREAKEVEN: isQuantMode ? "⚖️ EQUILIBRIUM" : "⚖️ BREAKEVEN",
                  };
                  const active = tradeStatus === statusValue;
                  return (
                    <button
                      key={statusValue}
                      type="button"
                      onClick={() => {
                        setTradeStatus(statusValue);
                        if (statusValue === "BREAKEVEN") {
                          setRrValue(0);
                          setManualPnl("");
                        } else if (rrValue === 0) {
                          setRrValue("");
                        }
                      }}
                      className={`px-2 py-1 text-[10px] font-black font-mono rounded border cursor-pointer uppercase transition-colors duration-200 ease-out ${
                        active
                          ? colors[statusValue]
                          : "bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-700/50"
                      }`}
                    >
                      {labels[statusValue]}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0 pt-2 md:pt-0 md:pl-3 md:border-l border-zinc-700">
            <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {isQuantMode ? "R:R METRIC" : "R:R Oranı"}
            </label>
            <div className="flex h-10 sm:h-8 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition w-36">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Örn: 2.5"
                value={tradeStatus === "BREAKEVEN" ? 0 : rrValue}
                disabled={tradeStatus === "BREAKEVEN"}
                onChange={(e) =>
                  setRrValue(
                    e.target.value !== "" ? Number(e.target.value) : "",
                  )
                }
                className={`w-full bg-transparent px-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono ${
                  tradeStatus === "BREAKEVEN"
                    ? "opacity-55 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1 pt-2 md:pt-0 md:pl-3 md:border-l border-zinc-700">
            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest font-mono">
              {isQuantMode 
                ? `DELTA OUTPUT (${currency})`
                : tradeStatus === "BREAKEVEN"
                  ? "Breakeven"
                  : `Elde Edilen Net ${tradeStatus === "WIN" ? "Kâr" : tradeStatus === "LOSS" ? "Zarar" : "Kâr / Zarar"} (${currency})`}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              disabled={tradeStatus === "BREAKEVEN"}
              placeholder="0.00"
              value={tradeStatus === "BREAKEVEN" ? "0" : manualPnl}
              onChange={(e) =>
                setManualPnl(
                  e.target.value !== "" ? Number(e.target.value) : "",
                )
              }
              className={`w-full h-10 sm:h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono transition-colors duration-200 ease-out ${tradeStatus === "BREAKEVEN" ? "opacity-50 cursor-not-allowed !bg-zinc-900" : ""}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 font-mono">
            {isQuantMode ? "MODEL PARAMETERS & SPECIFICATION" : "Notlar"}
          </label>
          <textarea
            placeholder={isQuantMode ? "Algorithmic bias, model parameters, price variance indicators..." : "Kurgulanan setup, destek direnç seviyeleri veya psikolojik etkenler..."}
            rows={1}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition resize-none leading-relaxed font-sans"
          />
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px]">
                {isQuantMode ? "TIME WINDOW (UTC)" : "Session"}
              </span>
              <div className="flex flex-wrap gap-1.5 w-full">
                {sessions.map((sess, idx) => (
                  <button
                    key={`sess-${sess}-${idx}`}
                    type="button"
                    onClick={() =>
                      setSelectedSession(sess === selectedSession ? "" : sess)
                    }
                    className={`px-2 py-1 text-[9px] font-bold rounded-md uppercase transition-colors duration-200 ease-out font-mono ${
                      sess === selectedSession
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-zinc-800/80 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {sess}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 border-t border-zinc-800 pt-1.5">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px]">
              {isQuantMode ? "MACRO TIMEFRAME" : "HTF"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {htfTimeframes.map((tf, idx) => (
                <button
                  key={`htf-${tf}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedHtfTimeframe(tf === selectedHtfTimeframe ? "" : tf)
                  }
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase transition-colors duration-200 ease-out font-mono ${
                    tf === selectedHtfTimeframe
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                      : "bg-zinc-800/80 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 border-t border-zinc-800 pt-1.5">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px]">
              {isQuantMode ? "MICRO RESOLUTION" : "ETF"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {timeframes.map((tf, idx) => (
                <button
                  key={`tf-${tf}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedTimeframe(tf === selectedTimeframe ? "" : tf)
                  }
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase transition-colors duration-200 ease-out font-mono ${
                    tf === selectedTimeframe
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                      : "bg-zinc-800/80 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 border-t border-zinc-800 pt-1.5">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px]">
              {isQuantMode ? "MODEL ARCHITECTURE" : "Konsept"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {concepts.map((s, idx) => {
                const isActive = selectedConcept === s;
                return (
                  <button
                    key={`concept-${s}-${idx}`}
                    type="button"
                    onClick={() => setSelectedConcept(isActive ? "" : s)}
                    className={`px-2.5 py-1 text-[9px] rounded-full transition-colors duration-200 ease-out font-sans tracking-wide ${
                      isActive
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/50"
                        : "bg-zinc-800/80 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 border-t border-zinc-800 pt-1.5">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px] mt-1">
              {isQuantMode ? "VALIDATION TRIGGERS" : "Onay"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {confirmations.map((c, idx) => {
                const isActive = selectedConfirmations.includes(c);
                const quantLabelMap: Record<string, string> = {
                  "LİKİDİTE": "Price Inefficiency",
                  "FVG": "Value Gap",
                  "CHoCH": "Structural Shift",
                  "BOS": "Trend Extension"
                };
                const displayLabel = isQuantMode ? (quantLabelMap[c.toUpperCase()] || c) : c;
                return (
                  <button
                    key={`conf-${c}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setSelectedConfirmations(
                          selectedConfirmations.filter((item) => item !== c),
                        );
                      } else {
                        setSelectedConfirmations([...selectedConfirmations, c]);
                      }
                    }}
                    className={`px-2.5 py-1 text-[9px] rounded-full transition-colors duration-200 ease-out font-sans tracking-wide ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-zinc-800/80 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {isQuantMode ? "TECHNICAL SPECIFICATION / URL" : "Görsel"}
            </label>
          </div>

          <input
            type="url"
            value={screenshot || ""}
            onChange={(e) => setScreenshot(e.target.value)}
            placeholder={isQuantMode ? "https://... (Technical spec / log URL)" : "https://... (Görsel URL yapıştırın)"}
            className="w-full h-10 sm:h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition font-mono"
          />
          {screenshot && (
            <div className="mt-2 relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center p-1 min-h-[100px]">
              {previewError ? (
                <div className="flex flex-col items-center justify-center p-4 text-center text-rose-400">
                  <span className="text-xs mb-1">⚠️</span>
                  <p className="text-[10px] font-medium font-sans">
                    Geçersiz veya yüklenemeyen görsel URL'si
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-xs leading-normal font-mono">
                    Yapıştırdığınız URL'nin doğrudan bir görsel linki (.png,
                    .jpg vb.) olduğundan emin olun.
                  </p>
                </div>
              ) : (
                <img
                  src={screenshot}
                  alt="Trade Chart Preview"
                  className="object-contain max-h-[140px] w-full rounded"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={() => setPreviewError(true)}
                />
              )}
              <button
                type="button"
                onClick={removeScreenshot}
                className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1.5 items-end justify-between border-t border-zinc-800 mt-1">
          <div className="w-full sm:w-auto">
            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5 pl-1">
              {isQuantMode ? "TIMESTAMP (UTC)" : "İşlem Tarihi"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full sm:w-auto h-10 sm:h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-2 text-[10px] text-zinc-300 focus:outline-none focus:border-zinc-500 transition font-mono"
              />
              <VoiceToTradeButton
                options={{ platforms, sessions, concepts, confirmations, timeframes, htfTimeframes }}
                onParsed={handleVoiceParsed}
              />
            </div>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto flex-1 justify-end">
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-red-500/10 px-4 hover:bg-red-500/20 border border-red-500/30 text-red-500 hover:text-red-400 h-10 sm:h-8 text-[9px] font-black tracking-widest rounded-lg uppercase transition-colors duration-200 ease-out cursor-pointer font-mono"
            >
              {isQuantMode ? "CANCEL" : "İptal / Kapat"}
            </button>
            <button
              type="submit"
              className={`px-6 h-10 sm:h-8 flex-1 sm:flex-none text-[9px] font-black tracking-widest rounded-lg uppercase transition-all duration-200 ease-out flex items-center justify-center gap-1 cursor-pointer border shadow-xs backdrop-blur-sm ${
                editingTrade
                  ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-500"
                  : "bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-400"
              }`}
            >
              {editingTrade ? (
                <>{isQuantMode ? "UPDATE DATA LOG" : "💾 DEĞİŞİKLİKLERİ KAYDET"}</>
              ) : (
                <>
                  <Plus size={12} /> {isQuantMode ? "COMMIT DATA LOG" : "POZİSYON EKLE"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

export default AddTradeForm;
