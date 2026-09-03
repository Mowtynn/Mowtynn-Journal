import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trade } from "../types";
import { VoiceToTradeButton } from "./VoiceToTradeButton";
import { TurkishDateTimePicker } from "./TurkishDateTimePicker";
import {
  Plus,
  AlertCircle,
  X,
  Search,
  ChevronDown,
  Cpu,
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
            {"İşlemi Düzenle"}
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-blue-400 " />
            {"Yeni İşlem Kaydı"}
          </>
        )}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-xl p-3 text-[10px] font-sans leading-relaxed overflow-hidden"
            >
              <AlertCircle size={13} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid ${'grid-cols-3'} gap-2 sm:gap-3`}>
          <div className="relative" ref={assetDropdownRef}>
            <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest mb-1 font-sans">
              {"Parite"}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors duration-200">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Ara veya seç..."
                value={asset}
                onChange={(e) => {
                  setAsset(e.target.value.toUpperCase());
                  setIsAssetDropdownOpen(true);
                }}
                onFocus={() => setIsAssetDropdownOpen(true)}
                className="w-full h-10 sm:h-9 pl-9 bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all duration-200 uppercase shadow-inner"
              />
            </div>
            {isAssetDropdownOpen && (
              <div className="absolute z-10 w-full mt-1.5 bg-zinc-950 border border-zinc-700/50 rounded-xl max-h-60 flex flex-col overflow-hidden shadow-2xl">
                <div className="overflow-y-auto flex-1 py-1 divide-y divide-zinc-900">
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
                          className="px-3.5 py-2.5 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-900 hover:text-white uppercase transition-colors"
                        >
                          {a}
                        </div>
                      ))
                  ) : (
                    <div className="px-3 py-3 text-[10px] text-zinc-500 text-center">
                      Sonuç bulunamadı
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {true && (
            <div className="relative" ref={platformDropdownRef}>
              <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest mb-1 font-sans">
                Platform
              </label>
              <div
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                className="w-full h-10 sm:h-9 bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-3.5 text-xs text-white flex items-center justify-between cursor-pointer focus:outline-none transition-all duration-200 shadow-inner font-mono uppercase select-none"
              >
                <div className="flex items-center gap-2">
                  <Cpu size={13} className="text-zinc-500" />
                  <span className={selectedPlatform ? "text-zinc-100" : "text-zinc-500"}>
                    {selectedPlatform || "Platform Seçin"}
                  </span>
                </div>
                <ChevronDown size={12} className="text-zinc-500" />
              </div>
              {isPlatformDropdownOpen && (
                <div className="absolute z-10 w-full mt-1.5 bg-zinc-950 border border-zinc-700/50 rounded-xl max-h-60 flex flex-col overflow-hidden shadow-2xl">
                  <div className="overflow-y-auto flex-1 py-1 divide-y divide-zinc-900">
                    {platforms.map((p, idx) => (
                      <div
                        key={`plat-${p}-${idx}`}
                        onMouseDown={() => {
                          setSelectedPlatform(p);
                          setIsPlatformDropdownOpen(false);
                        }}
                        className="px-3.5 py-2.5 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-900 hover:text-white font-mono uppercase transition-colors"
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
            <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest mb-1 font-sans">
              {"Yön"}
            </label>
            <div className="grid grid-cols-2 gap-1.5 h-10 sm:h-9">
              <button
                type="button"
                onClick={() => setType("LONG")}
                className={`rounded-xl text-[10px] font-mono font-bold tracking-wider transition-all duration-150 flex items-center justify-center border cursor-pointer uppercase ${
                  type === "LONG"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {"LONG"}
              </button>
              <button
                type="button"
                onClick={() => setType("SHORT")}
                className={`rounded-xl text-[10px] font-mono font-bold tracking-wider transition-all duration-150 flex items-center justify-center border cursor-pointer uppercase ${
                  type === "SHORT"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {"SHORT"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 md:items-center shadow-lg">
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest font-sans mb-1">
              {"İşlem Durumu"}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {(["WIN", "LOSS", "BREAKEVEN"] as const).map(
                (statusValue) => {
                  const colors: Record<string, string> = {
                    WIN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs",
                    LOSS: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs",
                    BREAKEVEN: "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs",
                  };
                  const labels: Record<string, string> = {
                    WIN: "WIN",
                    LOSS: "LOSS",
                    BREAKEVEN: "BREAKEVEN",
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
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border cursor-pointer uppercase transition-all duration-150 ${
                        active
                          ? colors[statusValue]
                          : "bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      {labels[statusValue]}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0 pt-3 md:pt-0 md:pl-4 md:border-l border-zinc-800/80">
            <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest font-sans mb-1">
              {"R:R Oranı"}
            </label>
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
              className={`w-36 h-10 sm:h-9 bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-3 text-xs text-white focus:outline-none placeholder-zinc-500 font-mono transition-all duration-200 shadow-inner ${
                tradeStatus === "BREAKEVEN"
                  ? "opacity-55 cursor-not-allowed"
                  : ""
              }`}
            />
          </div>

          <div className="flex-1 flex flex-col gap-1 pt-3 md:pt-0 md:pl-4 md:border-l border-zinc-800/80">
            <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest font-sans mb-1">
              {tradeStatus === "BREAKEVEN"
                ? "Breakeven"
                : `Net ${tradeStatus === "WIN" ? "Kâr" : tradeStatus === "LOSS" ? "Zarar" : "Kâr / Zarar"} (${currency})`}
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
              className={`w-full h-10 sm:h-9 bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-3 text-xs text-white focus:outline-none font-mono transition-all duration-200 shadow-inner placeholder-zinc-500 ${tradeStatus === "BREAKEVEN" ? "opacity-50 cursor-not-allowed !bg-zinc-950" : ""}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest mb-1 font-sans">
            {"Notlar"}
          </label>
          <textarea
            placeholder={"Kurgulanan setup, destek direnç seviyeleri veya psikolojik etkenler..."}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all duration-200 resize-none leading-relaxed font-sans shadow-inner min-h-[68px]"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest min-w-[70px]">
                {"Session"}
              </span>
              <div className="flex flex-wrap gap-1.5 w-full">
                {sessions.map((sess, idx) => (
                  <button
                    key={`sess-${sess}-${idx}`}
                    type="button"
                    onClick={() =>
                      setSelectedSession(sess === selectedSession ? "" : sess)
                    }
                    className={`px-2 py-1 text-[9px] font-bold rounded-lg uppercase transition-colors duration-200 ease-out font-mono ${
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
              {"HTF"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {htfTimeframes.map((tf, idx) => (
                <button
                  key={`htf-${tf}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedHtfTimeframe(tf === selectedHtfTimeframe ? "" : tf)
                  }
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase transition-colors duration-200 ease-out font-mono ${
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
              {"ETF"}
            </span>
            <div className="flex flex-wrap gap-1.5 w-full">
              {timeframes.map((tf, idx) => (
                <button
                  key={`tf-${tf}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedTimeframe(tf === selectedTimeframe ? "" : tf)
                  }
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase transition-colors duration-200 ease-out font-mono ${
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
              {"Konsept"}
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
              {"Onay"}
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
                const displayLabel = false ? (quantLabelMap[c.toUpperCase()] || c) : c;
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest font-sans">
              {"Görsel"}
            </label>
          </div>

          <input
            type="url"
            value={screenshot || ""}
            onChange={(e) => setScreenshot(e.target.value)}
            placeholder={"https://... (Görsel URL yapıştırın)"}
            className="w-full h-10 sm:h-9 bg-zinc-950 border border-zinc-700/60 hover:border-zinc-600 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/15 rounded-xl px-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-mono shadow-inner"
          />
          {screenshot && (
            <div className="mt-2 relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center p-1 min-h-[100px]">
              {previewError ? (
                <div className="flex flex-col items-center justify-center p-4 text-center text-rose-400">
                  <AlertCircle size={14} className="mb-1" />
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
                  className="object-contain max-h-[140px] w-full rounded-lg"
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
            <label className="block text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-widest mb-0.5 pl-1">
              {"İşlem Tarihi"}
            </label>
            <div className="flex items-center gap-2">
              <TurkishDateTimePicker
                value={tradeDate}
                onChange={setTradeDate}
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
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-4 h-10 sm:h-8 text-[10px] font-bold tracking-wider rounded-xl uppercase transition-all duration-150 cursor-pointer font-mono"
            >
              {"İptal / Kapat"}
            </button>
            <button
              type="submit"
              className={`px-6 h-10 sm:h-8 flex-1 sm:flex-none text-[10px] font-bold font-mono tracking-wider rounded-xl uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                editingTrade
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                  : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40"
              }`}
            >
              {editingTrade ? (
                <>{"DEĞİŞİKLİKLERİ KAYDET"}</>
              ) : (
                <>
                  <Plus size={13} /> {"POZİSYON EKLE"}
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
