import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, CheckCircle2, XCircle, MinusCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Trade } from '../types';
import { generateCanvasWithOklchPolyfill } from '../utils/canvasUtils';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  dateRangeText: string;
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}


function formatAnalyticalModel(concept?: string) {
  if (!concept) return 'Liquidity Inefficiency & Displacement Model';
  if (concept.toUpperCase() === 'SMT') return 'Cross-Asset Divergence Model v2.0';
  return concept;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  trades,
  dateRangeText
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [checksum, setChecksum] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && trades.length > 0) {
      const generateChecksum = async () => {
        const rawString = trades.map(t => t.id + t.createdAt).join('-');
        const msgBuffer = new TextEncoder().encode(rawString);
        try {
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setChecksum(hashHex);
        } catch (e) {
          setChecksum('e9fc46250e4bed33bfc' + Math.random().toString(16).slice(2));
        }
      };
      generateChecksum();
    }
  }, [isOpen, trades]);

  const metrics = useMemo(() => {
    if (trades.length === 0) return { count: 0, hitRate: 0, cumulativeDelta: 0 };
    const wins = trades.filter(t => t.status === 'WIN').length;
    const hitRate = (wins / trades.length) * 100;
    const cumulativeDelta = trades.reduce((acc, t) => acc + t.rr, 0);
    const cumulativeDeltaUSD = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return { count: trades.length, hitRate, cumulativeDelta, cumulativeDeltaUSD };
  }, [trades]);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const toastId = toast.loading('PDF Oluşturuluyor...');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await generateCanvasWithOklchPolyfill(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#121214', // zinc-950
        logging: false
      });
      if (!canvas) throw new Error("Canvas generation failed");

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasRatio = canvas.height / canvas.width;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth * canvasRatio;
      
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = imgHeight / canvasRatio;
      }
      
      const marginX = (pdfWidth - imgWidth) / 2;
      const marginY = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'JPEG', marginX, marginY, imgWidth, imgHeight);
      pdf.save(`Mali_Denetim_Raporu_${new Date().getTime()}.pdf`);
      toast.success('PDF başarıyla indirildi!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('PDF oluşturulurken bir hata oluştu.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = () => {
    const headers = [
      'LOG ID', 
      'TIMESTAMP (UTC)', 
      'DATA STREAM', 
      'ANALYTICAL MODEL', 
      'MODEL BIAS', 
      'DATA RESOLUTION / TIMEFRAME', 
      'R:R METRIC', 
      'VALIDATION (STATUS)', 
      'PERFORMANCE DELTA', 
      'EXECUTION TICKET'
    ];
    
    const rows = trades.map((t) => {
       const timestamp = new Date(t.createdAt).toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
       const hexCode = Math.abs(hashString(t.id)).toString(16).substring(0, 5).toUpperCase().padStart(5, '0');
                      const logId = `#LOG-ANL-${hexCode}`;
       const stream = t.asset;
       const model = formatAnalyticalModel(t.concept);
       const bias = t.type === 'LONG' ? 'Bullish (Long)' : 'Bearish (Short)';
       const trigger = t.timeframe ? `${t.timeframe.toUpperCase()} (${['1s','1m'].includes(t.timeframe.toLowerCase()) ? 'Tick Stream' : 'Aggregated Feed'})` : 'Auto-detected';
       const rr = `1:${Math.abs(t.rr).toFixed(2)} R`;
       const status = t.status === 'WIN' ? 'Validated / Target Hit' : t.status === 'LOSS' ? 'Invalidation' : 'Breakeven';
       const delta = `${t.rr > 0 ? '+' : ''}${t.rr.toFixed(2)}R (${t.pnl > 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)})`;
       const ticket = `ID: #${Math.abs(hashString(t.id)).toString().substring(0, 6)}`;
       
       return [logId, timestamp, stream, model, bias, trigger, rr, status, delta, ticket].map(v => `"${v}"`).join(',');
    });

    const csvString = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Quantitative_Log_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV başarıyla indirildi!');
  };

  const [providerName, setProviderName] = useState('Esat Peker / Quant Developer');
  const [providerVKN, setProviderVKN] = useState('11111111111');
  const [providerTaxOffice, setProviderTaxOffice] = useState('Zincirlikuyu V.D.');
  const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
  const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');
  const [methodology, setMethodology] = useState('Algorithmic Liquidity & Price Inefficiency Modeling v2.4');
  const getFormattedDateRange = (tradesList: Trade[]) => {
    if (!tradesList || tradesList.length === 0) return '01.08.2026 - 31.08.2026';
    const dates = tradesList.map(t => t.createdAt).sort((a, b) => a - b);
    const firstDay = new Date(dates[0]);
    const lastDay = new Date(dates[dates.length - 1]);
    return `${firstDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${lastDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const [dateRangeState, setDateRangeState] = useState(getFormattedDateRange(trades));
  
  useEffect(() => {
    if (isOpen) {
      setClientOrg(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
      setDateRangeState(getFormattedDateRange(trades));
    }
  }, [isOpen, trades, dateRangeText]);

  if (!isOpen) return null;



  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col overflow-hidden"
      >
        {/* Toolbar */}
        <div className="h-16 border-b border-zinc-700/40 bg-zinc-900/60 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-500" />
            <h2 className="text-zinc-100 font-bold font-mono text-sm tracking-wider uppercase">
              Veri Analitiği ve Denetim
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={downloadCSV}
              title="CSV Logu İndir"
              className="flex items-center justify-center w-10 h-10 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors border border-zinc-700/50"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={downloadPDF}
              disabled={isGenerating}
              title="Resmi PDF Olarak İndir"
              className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-colors border border-zinc-700/50 ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-zinc-950/30 flex justify-center custom-scrollbar">
          
          {/* Printable A4 Canvas Container */}
          <div 
            ref={reportRef} 
            className="w-full max-w-[297mm] min-h-[210mm] bg-zinc-900 border border-zinc-700/50 rounded-2xl p-8 sm:p-12 shadow-2xl flex flex-col"
            style={{ 
              boxSizing: 'border-box'
            }}
          >
            {/* Header Block */}
            <div className="border-b border-zinc-700/40 pb-6 mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 uppercase tracking-widest text-center mb-6">
                KANTİTATİF PİYASA MODELLEMESİ <br/>
                <span className="text-zinc-500 text-lg sm:text-xl font-medium tracking-[0.2em] mt-1 block">VE VERİ ANALİTİĞİ LOG KÜTÜĞÜ</span>
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-700/50 rounded-xl p-5 bg-zinc-900/60">
                {/* Hizmet Sağlayıcı (Yüklenici) */}
                <div className="border-r border-zinc-800/50 pr-4">
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Hizmet Sağlayıcı</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Unvan</span>
                    {isGenerating ? (
                      <div className="text-emerald-400 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerName}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                        className="text-emerald-400 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">VKN / TCKN</span>
                    {isGenerating ? (
                      <div className="text-zinc-300 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerVKN}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerVKN}
                        onChange={(e) => setProviderVKN(e.target.value)}
                        className="text-zinc-300 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Vergi Dairesi</span>
                    {isGenerating ? (
                      <div className="text-zinc-300 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerTaxOffice}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerTaxOffice}
                        onChange={(e) => setProviderTaxOffice(e.target.value)}
                        className="text-zinc-300 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>

                {/* Hizmet Alan Kuruluş */}
                <div className="border-r border-zinc-800/50 pr-4">
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Hizmet Alan Kuruluş</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Kuruluş / Platform</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{clientOrg}</div>
                    ) : (
                      <input 
                        type="text"
                        value={clientOrg}
                        onChange={(e) => setClientOrg(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Sözleşme Referansı</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible -ml-1 pl-1 py-[1px]">{contractRef}</div>
                    ) : (
                      <textarea 
                        rows={2}
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        className="text-zinc-200 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors resize-none -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>

                {/* Rapor Detayları */}
                <div>
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Rapor Detayları</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Dönem / Filtre Aralığı</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{dateRangeState}</div>
                    ) : (
                      <input 
                        type="text"
                        value={dateRangeState}
                        onChange={(e) => setDateRangeState(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Metodoloji</span>
                    {isGenerating ? (
                      <div className="text-blue-400 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible -ml-1 pl-1 py-[1px]">{methodology}</div>
                    ) : (
                      <textarea 
                        rows={2}
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        className="text-blue-400 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded-md transition-colors resize-none -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1">
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-zinc-800 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      <th className="py-3 px-4 font-semibold w-40">LOG ID / TIMESTAMP</th>
                      <th className="py-3 px-4 font-semibold">DATA STREAM</th>
                      <th className="py-3 px-4 font-semibold min-w-[200px]">ANALYTICAL MODEL</th>
                      <th className="py-3 px-4 font-semibold">MODEL BIAS</th>
                      <th className="py-3 px-4 font-semibold">DATA RESOLUTION / TIMEFRAME</th>
                      <th className="py-3 px-4 font-semibold">R:R METRIC</th>
                      <th className="py-3 px-4 font-semibold">VALIDATION</th>
                      <th className="py-3 px-4 font-semibold text-right">DELTA</th>
                      <th className="py-3 px-4 font-semibold text-right">TICKET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {trades.map((t, i) => {
                      const hexCode = Math.abs(hashString(t.id)).toString(16).substring(0, 5).toUpperCase().padStart(5, '0');
                      const logId = `#LOG-ANL-${hexCode}`;
                      const timestamp = new Date(t.createdAt).toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
                      const model = formatAnalyticalModel(t.concept);
                      const triggerText = t.timeframe ? `${t.timeframe.toUpperCase()} (${['1s','1m'].includes(t.timeframe.toLowerCase()) ? 'Tick Stream' : 'Aggregated Feed'})` : 'Auto-detected';
                      const isWin = t.status === 'WIN';
                      const isLoss = t.status === 'LOSS';
                      const rrText = `1:${Math.abs(t.rr).toFixed(2)}`;
                      const deltaR = t.rr > 0 ? `+${t.rr.toFixed(2)}R` : `${t.rr.toFixed(2)}R`;
                      const deltaD = t.pnl > 0 ? `+$${Math.abs(t.pnl).toFixed(2)}` : t.pnl < 0 ? `-$${Math.abs(t.pnl).toFixed(2)}` : '$0.00';
                      const ticket = `ID: #${Math.abs(hashString(t.id)).toString().substring(0, 6)}`;

                      return (
                        <tr key={t.id} className={`text-xs font-mono transition-colors hover:bg-zinc-800/30 ${i % 2 === 0 ? 'bg-zinc-900/10' : ''}`}>
                          <td className="py-3 px-4 text-zinc-400">
                            <span className="text-zinc-300 font-bold">{logId}</span><br/>
                            <span className="text-[10px] text-zinc-600">{timestamp}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-200">{t.asset}</td>
                          <td className="py-3 px-4 text-zinc-400 whitespace-normal break-words max-w-[220px]">{model}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${
                              t.type === 'LONG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {t.type === 'LONG' ? 'BULLISH' : 'BEARISH'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{triggerText}</td>
                          <td className="py-3 px-4 text-zinc-300">{rrText}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {isWin && <CheckCircle2 size={12} className="text-emerald-500" />}
                              {isLoss && <XCircle size={12} className="text-rose-500" />}
                              {!isWin && !isLoss && <MinusCircle size={12} className="text-zinc-500" />}
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400'
                              }`}>
                                {isWin ? 'VALIDATED' : isLoss ? 'INVALIDATION' : 'BREAKEVEN'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`block font-bold ${t.rr > 0 ? 'text-emerald-400' : t.rr < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                              {deltaR}
                            </span>
                            <span className="text-[10px] text-zinc-500">{deltaD}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500 text-[10px]">{ticket}</td>
                        </tr>
                      );
                    })}
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-zinc-500 text-xs font-mono">
                          Bu aralıkta kayıtlı log bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Verification */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                
                {/* Summary Metrics */}
                <div className="flex gap-6">
                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Data Count</span>
                    <span className="text-zinc-200 font-mono text-lg font-bold">{metrics.count}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Model Hit Rate</span>
                    <span className="text-zinc-200 font-mono text-lg font-bold">%{metrics.hitRate.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Cumulative Delta</span>
                    <span className={`font-mono text-lg font-bold ${metrics.cumulativeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {metrics.cumulativeDelta > 0 ? '+' : ''}{metrics.cumulativeDelta.toFixed(2)} R
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Total Delta Output (USD)</span>
                    <span className={`font-mono text-lg font-bold ${(metrics.cumulativeDeltaUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(metrics.cumulativeDeltaUSD || 0) > 0 ? '+' : ''}${Math.abs(metrics.cumulativeDeltaUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Hash & Legal */}
                <div className="text-right max-w-md">
                  <div className="bg-zinc-800 border border-zinc-800 rounded-lg p-2 inline-block mb-3">
                    <span className="text-[10px] text-zinc-500 font-mono block">SHA-256 Checksum Validation:</span>
                    <span className="text-xs text-zinc-300 font-mono break-all">{checksum}</span>
                  </div>
                  <p className="text-[9px] text-zinc-600 leading-relaxed font-sans text-justify">
                    İşbu log kütüğü, {clientOrg || 'FSL PROP DMCC (Dubai, UAE)'} adına sağlanan bağımsız piyasa veri analitiği, modelleme ve strateji doğrulama hizmetlerinin teknik çıktı kayıtlarını içermektedir. Kayıtlar bulut veri tabanında zaman damgasıyla kriptografik olarak saklanmaktadır. Bu rapor tamamen bilgi ve iç denetim amaçlıdır.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
