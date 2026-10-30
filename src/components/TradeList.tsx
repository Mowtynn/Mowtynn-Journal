import { MODAL_BACKDROP, MODAL_PANEL, POPOVER } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, TradeFilter, DefinitionTitles } from '../types';
import { DEFAULT_DEFINITION_TITLES, caseInsensitiveMatch } from '../constants/constants';
import {
  Search,
  Trash2,
  Clock,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportTradesToExcel, exportTradesToCSV } from '../utils/exportTrades';
import { PrintReportModal } from './PrintReportModal';
import { TurkishDatePicker } from './TurkishDateTimePicker';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { localDateKey } from '../utils/math';
import { TR_COLLATOR, MemoizedTradeRow } from './tradeList/TradeRow';
import { HeaderLabel, CustomSelect } from './tradeList/controls';
import { FILTER_LABEL } from './filters/FilterControls';
import { nyWallDate, nyInputToTs, nyDateKey } from '../lib/tradingTime';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewDetails: (trade: Trade, list?: Trade[]) => void;
  definitionTitles?: DefinitionTitles;
}

const TradeList = React.memo(function TradeList({ 
  trades, 
  onEdit, 
  onDelete, 
  onViewDetails, 
  definitionTitles = DEFAULT_DEFINITION_TITLES,
}: TradeListProps) {

  // Filters State
  
  // Liste yalnızca kendine özgü süzgeçleri tutar (arama, sıralama, tarih aralığı).
  // Sonuç, yön, parite, seans, timeframe vb. tek yerde: üstteki Filtreleme Menüsü.
  const [filter, setFilter] = useState<TradeFilter>({
    search: '',
    sortBy: 'dateDes',
    startDate: '',
    endDate: ''
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [customLastCount, setCustomLastCount] = useState<string>('5');
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  useBodyScrollLock(!!tradeToDelete);

  const isFilteringActive = !!filter.startDate || !!filter.endDate || filter.sortBy !== 'dateDes';

  const handleResetFilters = () => {
    setFilter({ search: filter.search, sortBy: 'dateDes', startDate: '', endDate: '' });
  };
  
  // State to manage high-fidelity report print modal
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    trades: Trade[];
    title: string;
    dateRangeText: string;
  }>({
    isOpen: false,
    trades: [],
    title: '',
    dateRangeText: ''
  });
  
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Export format tab (Excel, CSV, PDF)
  const [exportFormatTab, setExportFormatTab] = useState<'excel' | 'csv' | 'pdf'>('excel');

  // Bu hafta / bu ay: New York takvimine göre (hafta pazartesi 00:00 NY'de başlar)
  const nyStartTs = (wall: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return nyInputToTs(`${wall.getFullYear()}-${pad(wall.getMonth() + 1)}-${pad(wall.getDate())}T00:00`) ?? 0;
  };

  const getWeeklyTrades = useCallback(() => {
    const nowNy = nyWallDate(Date.now());
    const day = nowNy.getDay();
    const monday = new Date(nowNy.getFullYear(), nowNy.getMonth(), nowNy.getDate() - (day === 0 ? 6 : day - 1));
    const start = nyStartTs(monday);
    return trades.filter(t => t.createdAt >= start).sort((a, b) => b.createdAt - a.createdAt);
  }, [trades]);

  const getMonthlyTrades = useCallback(() => {
    const nowNy = nyWallDate(Date.now());
    const start = nyStartTs(new Date(nowNy.getFullYear(), nowNy.getMonth(), 1));
    return trades.filter(t => t.createdAt >= start).sort((a, b) => b.createdAt - a.createdAt);
  }, [trades]);

  const handleExport = (format: 'excel' | 'csv', scope: 'filtered' | 'all' | 'weekly' | 'monthly' | 'custom') => {
    try {
      const dateStr = localDateKey();
      let targetList: Trade[] = [];
      let scopeName = '';

      if (scope === 'filtered') {
        targetList = filteredTrades;
        scopeName = 'Filtrelenmis';
      } else if (scope === 'all') {
        targetList = trades;
        scopeName = 'Tum_Islemler';
      } else if (scope === 'weekly') {
        targetList = getWeeklyTrades();
        scopeName = 'Bu_Hafta';
      } else if (scope === 'monthly') {
        targetList = getMonthlyTrades();
        scopeName = 'Bu_Ay';
      } else if (scope === 'custom') {
        const count = parseInt(customLastCount) || 7;
        const sorted = [...trades].sort((a, b) => b.createdAt - a.createdAt);
        targetList = sorted.slice(0, count);
        scopeName = `Son_${count}_Islem`;
      }

      if (targetList.length === 0) {
        toast.error('Dışa aktarılacak işlem bulunamadı.');
        return;
      }

      const filename = `Islem_Gecmisi_${scopeName}_${dateStr}_[${targetList.length}_islem]`;

      if (format === 'excel') {
        void toast.promise(exportTradesToExcel(targetList, filename, {
          title: `İşlem Geçmişi (${scopeName.replace(/_/g, ' ')})`,
          definitionTitles: definitionTitles as any
        }), {
          loading: 'Excel hazırlanıyor…',
          success: `Excel tablosu (.xlsx) başarıyla indirildi (${targetList.length} işlem).`,
          error: (e) => e?.message || 'Excel dosyası oluşturulamadı.',
        });
      } else {
        exportTradesToCSV(targetList, filename, {
          title: `İşlem Geçmişi (${scopeName.replace(/_/g, ' ')})`,
          definitionTitles: definitionTitles as any
        });
        toast.success(`CSV dosyası (.csv) başarıyla indirildi (${targetList.length} işlem).`);
      }
      setIsExportOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Dışa aktarma sırasında bir hata oluştu.');
    }
  };

  // PDF & Printable report handlers
  const handleDownloadWeekly = () => {
    const sorted = getWeeklyTrades();
    setPrintModalState({
      isOpen: true,
      trades: sorted,
      title: 'Haftalık İşlem Raporu',
      dateRangeText: 'Bu Hafta'
    });
    setIsExportOpen(false);
  };

  const handleDownloadMonthly = () => {
    const sorted = getMonthlyTrades();
    setPrintModalState({
      isOpen: true,
      trades: sorted,
      title: 'Aylık İşlem Raporu',
      dateRangeText: 'Bu Ay'
    });
    setIsExportOpen(false);
  };

  const handleDownloadFiltered = () => {
    setPrintModalState({
      isOpen: true,
      trades: filteredTrades,
      title: 'Filtrelenmiş Rapor',
      dateRangeText: filter.startDate || filter.endDate 
        ? `${filter.startDate || 'Başlangıç'} - ${filter.endDate || 'Bitiş'}`
        : 'Filtrelenmiş Tüm İşlemler'
    });
    setIsExportOpen(false);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Limit items per page to 30

  const sortByOptions = useMemo(() => [
    { value: 'dateDes', label: 'En Yeni Aktiviteler' },
    { value: 'dateAsc', label: 'En Eski Aktiviteler' },
    { value: 'rrDes', label: 'R Oranı (Yüksekten Düşüğe)' },
    { value: 'rrAsc', label: 'R Oranı (Düşükten Yükseğe)' }
  ], []);

  const deferredFilter = filter;

  // Apply filters & sorting
  const filteredTrades = useMemo(() => {
    // Tarih aralığı NY takvim gününe göre (YYYY-MM-DD karşılaştırması; yaz/kış saatinden etkilenmez)
    const startKey = deferredFilter.startDate ? String(deferredFilter.startDate).slice(0, 10) : null;
    const endKey = deferredFilter.endDate ? String(deferredFilter.endDate).slice(0, 10) : null;

    return trades
      .filter(trade => {
        if (startKey || endKey) {
          const k = nyDateKey(trade.createdAt);
          if (startKey && k < startKey) return false;
          if (endKey && k > endKey) return false;
        }

        const matchesSearch = !deferredFilter.search || 
          caseInsensitiveMatch(trade.asset, deferredFilter.search) || 
          caseInsensitiveMatch(trade.notes, deferredFilter.search) ||
          caseInsensitiveMatch(trade.asiaRange, deferredFilter.search) ||
          caseInsensitiveMatch(trade.session, deferredFilter.search) ||
          caseInsensitiveMatch(trade.platform, deferredFilter.search) ||
          caseInsensitiveMatch(trade.planFidelity, deferredFilter.search) ||
          caseInsensitiveMatch(trade.trend, deferredFilter.search) ||
          (trade.entryModels && trade.entryModels.some(em => caseInsensitiveMatch(em, deferredFilter.search))) ||
          (trade.confirmations && trade.confirmations.some(c => caseInsensitiveMatch(c, deferredFilter.search)));
        
        if (!matchesSearch) return false;

        return true;
      })
      .sort((a, b) => {
        switch (deferredFilter.sortBy) {
          case 'dateDes':
            return b.createdAt - a.createdAt;
          case 'dateAsc':
            return a.createdAt - b.createdAt;
          case 'assetAsc':
            return TR_COLLATOR.compare(a.asset, b.asset);
          case 'assetDes':
            return TR_COLLATOR.compare(b.asset, a.asset);
          case 'typeAsc':
            return TR_COLLATOR.compare(a.type, b.type);
          case 'typeDes':
            return TR_COLLATOR.compare(b.type, a.type);
          case 'rrAsc':
            return (a.rr || 0) - (b.rr || 0);
          case 'rrDes':
            return (b.rr || 0) - (a.rr || 0);
          case 'platformAsc':
            return TR_COLLATOR.compare(a.platform || '', b.platform || '');
          case 'platformDes':
            return TR_COLLATOR.compare(b.platform || '', a.platform || '');
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [trades, deferredFilter]);

  const maxPage = Math.max(1, Math.ceil(filteredTrades.length / itemsPerPage));
  const effectivePage = Math.min(Math.max(1, currentPage), maxPage);

  // Clamp current page when total items change
  useEffect(() => {
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, maxPage]);

  // Detayda ← / → gezinme için görünen (filtrelenmiş + sıralı) liste de iletilir
  const handleViewDetails = useCallback((t: Trade) => onViewDetails(t, filteredTrades), [onViewDetails, filteredTrades]);

  const paginatedTrades = useMemo(() => {
    const start = (effectivePage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, effectivePage]);

  const handleFilterChange = useCallback((newFilter: TradeFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  }, []);

  return (
    <div id="trades-history-section" className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col shadow-sm">
      {/* HEADER WITH SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-sans">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock size={11} />
            </span>
            <div className="flex items-center gap-1.5 mt-[1px]">
              <span className="leading-none flex items-center">{"İşlem Geçmişi"}</span>
            </div>
            <span className="text-[9px] font-sans bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-zinc-300 flex items-center justify-center leading-none mt-[1px]">
              {filteredTrades.length} / {trades.length} {"işlem"}
            </span>
          </h2>
        </div>

        {/* HEADER CONTROLS: SEARCH */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 text-zinc-500" size={12} />
            <input
              type="text"
              placeholder={"Enstrüman veya not ara..."}
              value={filter.search}
              onChange={(e) => handleFilterChange({ ...filter, search: e.target.value })}
              className="w-full h-9 sm:h-8 bg-zinc-900/80 border border-zinc-800 rounded-xl pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition duration-200 ease-out font-sans"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center w-9 sm:w-8 h-9 sm:h-8 rounded-xl border transition-ui duration-200 ${
              isFilterOpen 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
            } shrink-0 cursor-pointer relative`}
          >
            <Filter size={12} />
            {isFilteringActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-zinc-800" />
            )}
          </button>
          
          {/* EXPORT DROP-DOWN */}
          <div className="relative" ref={exportRef}>
            <button aria-label="İndir"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className={`flex items-center justify-center w-9 sm:w-8 h-9 sm:h-8 rounded-xl border transition-ui duration-200 shrink-0 cursor-pointer ${
                isExportOpen
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              <Download size={12} />
            </button>
            
            <AnimatePresence>
              {isExportOpen && (
                <motion.div
                  key="export-options-dropdown"
                  {...POPOVER}
                  className="origin-top-right absolute right-0 mt-2 w-[310px] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                >
                  {/* Format Selector Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 mb-2">
                    <button
                      type="button"
                      onClick={() => setExportFormatTab('excel')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                        exportFormatTab === 'excel'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                      }`}
                    >
                      <FileSpreadsheet size={12} className={exportFormatTab === 'excel' ? 'text-emerald-400' : 'text-zinc-500'} />
                      <span>EXCEL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormatTab('csv')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                        exportFormatTab === 'csv'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                      }`}
                    >
                      <FileText size={12} className={exportFormatTab === 'csv' ? 'text-blue-400' : 'text-zinc-500'} />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormatTab('pdf')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                        exportFormatTab === 'pdf'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                      }`}
                    >
                      <Download size={12} className={exportFormatTab === 'pdf' ? 'text-purple-400' : 'text-zinc-500'} />
                      <span>PDF</span>
                    </button>
                  </div>

                  <div className="px-2 py-1 text-[9px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-800/60 mb-1 flex items-center justify-between">
                    <span>
                      {exportFormatTab === 'excel' ? 'EXCEL (.XLSX) DIŞA AKTAR' : exportFormatTab === 'csv' ? 'CSV (EXCEL UYUMLU) İNDİR' : 'PDF ANALİZ RAPORU'}
                    </span>
                    <span className="text-zinc-500 font-sans text-[9px] font-normal">
                      {exportFormatTab === 'excel' ? 'Tüm Sütunlar + Özet' : exportFormatTab === 'csv' ? 'UTF-8 BOM Semicolon' : 'Görsel Rapor'}
                    </span>
                  </div>

                  {exportFormatTab === 'excel' && (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleExport('excel', 'filtered')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-emerald-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={13} className="text-emerald-400" />
                          <span>Filtrelenmiş İşlemler</span>
                        </div>
                        <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {filteredTrades.length} İşlem
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('excel', 'all')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-emerald-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Layers size={13} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                          <span>Tüm İşlem Geçmişi</span>
                        </div>
                        <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {trades.length} İşlem
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('excel', 'weekly')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-emerald-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Haftanın İşlemleri</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('excel', 'monthly')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-emerald-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Ayın İşlemleri</span>
                      </button>

                      <div className="border-t border-zinc-800/80 my-1"></div>

                      <div className="p-1">
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-200">
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">Son</span>
                          <input
                            type="number"
                            min="1"
                            max={trades.length || 100}
                            value={customLastCount}
                            onChange={(e) => setCustomLastCount(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 bg-zinc-900 border border-zinc-700 text-center text-emerald-400 font-bold rounded-lg py-0.5 text-xs focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">işlem (.xlsx)</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport('excel', 'custom');
                            }}
                            className="ml-auto shrink-0 whitespace-nowrap px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                          >
                            İndir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {exportFormatTab === 'csv' && (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleExport('csv', 'filtered')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-blue-400" />
                          <span>Filtrelenmiş İşlemler</span>
                        </div>
                        <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {filteredTrades.length} İşlem
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('csv', 'all')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Layers size={13} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                          <span>Tüm İşlem Geçmişi</span>
                        </div>
                        <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {trades.length} İşlem
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('csv', 'weekly')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Haftanın İşlemleri</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport('csv', 'monthly')}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Ayın İşlemleri</span>
                      </button>

                      <div className="border-t border-zinc-800/80 my-1"></div>

                      <div className="p-1">
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-200">
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">Son</span>
                          <input
                            type="number"
                            min="1"
                            max={trades.length || 100}
                            value={customLastCount}
                            onChange={(e) => setCustomLastCount(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 bg-zinc-900 border border-zinc-700 text-center text-blue-400 font-bold rounded-lg py-0.5 text-xs focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">işlem (.csv)</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport('csv', 'custom');
                            }}
                            className="ml-auto shrink-0 whitespace-nowrap px-3 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                          >
                            İndir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {exportFormatTab === 'pdf' && (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={handleDownloadFiltered}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-purple-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-purple-400" />
                          <span>Filtrelenmiş Rapor</span>
                        </div>
                        <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {filteredTrades.length} İşlem
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadWeekly}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-purple-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Hafta Raporu İndir</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMonthly}
                        className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-purple-300 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={13} className="text-blue-400" />
                        <span>Bu Ay Raporu İndir</span>
                      </button>

                      <div className="border-t border-zinc-800/80 my-1"></div>

                      <div className="p-1">
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-200">
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">Son</span>
                          <input
                            type="number"
                            min="1"
                            max={trades.length || 100}
                            value={customLastCount}
                            onChange={(e) => setCustomLastCount(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 bg-zinc-900 border border-zinc-700 text-center text-purple-400 font-bold rounded-lg py-0.5 text-xs focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">işlem raporu</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const count = parseInt(customLastCount) || 7;
                              const sorted = [...trades].sort((a, b) => b.createdAt - a.createdAt);
                              const selectedTrades = sorted.slice(0, count);
                              setPrintModalState({
                                isOpen: true,
                                trades: selectedTrades,
                                title: `Son ${count} İşlem Raporu`,
                                dateRangeText: `Son ${count} İşlem`
                              });
                              setIsExportOpen(false);
                            }}
                            className="ml-auto shrink-0 whitespace-nowrap px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                          >
                            İndir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS GRID */}
      <div 
        className={`relative z-30 grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out will-change-[grid-template-rows,opacity] ${
          isFilterOpen 
            ? 'grid-rows-[1fr] opacity-100 mb-4' 
            : 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Filter size={11} className="text-blue-400" /> Filtreler & Sıralama
              </span>
              {isFilteringActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[10px] font-bold text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={10} /> Filtreleri Temizle
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 text-xs pt-1">
              {/* Sıralama */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className={FILTER_LABEL}>Sıralama</span>
                <CustomSelect
                  value={filter.sortBy}
                  onChange={(val) => handleFilterChange({ ...filter, sortBy: val as any })}
                  options={sortByOptions}
                  className="w-full"
                />
              </div>

              {/* Tarih Aralığı */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className={FILTER_LABEL}>Tarih Aralığı</span>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <TurkishDatePicker
                    value={filter.startDate || ''}
                    onChange={(val) => handleFilterChange({ ...filter, startDate: val || undefined })}
                    placeholder="Başlangıç"
                    className="w-full min-w-0"
                  />
                  <TurkishDatePicker
                    value={filter.endDate || ''}
                    onChange={(val) => handleFilterChange({ ...filter, endDate: val || undefined })}
                    placeholder="Bitiş"
                    className="w-full min-w-0"
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              Sonuç, yön, parite, seans ve diğer kurulum filtreleri üstteki <span className="font-semibold text-zinc-400">Filtreleme Menüsü</span>'nde; tüm sayfalara birlikte uygulanır.
            </p>
          </div>
        </div>
      </div>

      {/* TABLE/GRID CONTAINER */}
      {filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-zinc-800/80 border-dashed rounded-2xl bg-zinc-800/80 relative overflow-hidden my-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2.5 shadow-inner">
            <Clock size={20} className="text-zinc-400" />
          </div>
          <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest font-sans">{smartUpper("Kayıt Bulunamadı")}</h4>
          <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed font-sans">
            {trades.length === 0 
              ? "Herhangi bir işlem kaydı bulunmuyor. Üst kısımdaki 'İşlem Ekle' kutusunu kullanarak ilk kaydınızı girin."
              : "Belirtilen süzgeç ölçütleriyle eşleşen işlem yok."}
          </p>
        </div>
      ) : (
        <>
          <div 
            className="relative z-0 overflow-x-auto w-full rounded-xl"
          >
            <table className="trade-table w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-xs font-sans whitespace-nowrap sm:table-fixed sm:min-w-[750px] block sm:table">
              <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80">
                  <th 
                    className={`py-2 px-3 font-sans select-none min-w-[130px] cursor-pointer group/th transition-colors hover:text-zinc-200 text-center ${
                      filter.sortBy === 'dateAsc' || filter.sortBy === 'dateDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[18%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'dateDes' ? 'dateAsc' : 'dateDes'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderLabel sortState={filter.sortBy === 'dateAsc' ? 'asc' : filter.sortBy === 'dateDes' ? 'des' : null}>Tarih</HeaderLabel>
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-3 font-sans select-none min-w-[90px] cursor-pointer group/th transition-colors hover:text-zinc-200 text-center ${
                      filter.sortBy === 'assetAsc' || filter.sortBy === 'assetDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[14%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'assetAsc' ? 'assetDes' : 'assetAsc'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderLabel sortState={filter.sortBy === 'assetAsc' ? 'asc' : filter.sortBy === 'assetDes' ? 'des' : null}>{definitionTitles.assets || "Parite"}</HeaderLabel>
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-2 text-center font-sans select-none min-w-[65px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                      filter.sortBy === 'typeAsc' || filter.sortBy === 'typeDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[10%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'typeAsc' ? 'typeDes' : 'typeAsc'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderLabel sortState={filter.sortBy === 'typeAsc' ? 'asc' : filter.sortBy === 'typeDes' ? 'des' : null}>Yön</HeaderLabel>
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-2 text-center font-sans select-none min-w-[65px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                      filter.sortBy === 'rrAsc' || filter.sortBy === 'rrDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[10%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'rrDes' ? 'rrAsc' : 'rrDes'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderLabel sortState={filter.sortBy === 'rrAsc' ? 'asc' : filter.sortBy === 'rrDes' ? 'des' : null}>R</HeaderLabel>
                    </div>
                  </th>
                  <th className={`py-2 px-2 text-center font-sans select-none min-w-[75px] ${'w-[12%]'}`}>Sonuç</th>
                  <th className="py-2 px-3 text-center font-sans select-none min-w-[95px] text-zinc-400 w-[14%]">Risk</th>
                  {true && (
                    <th 
                      className={`py-2 px-2 text-center font-sans select-none w-[12%] min-w-[75px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                        filter.sortBy === 'platformAsc' || filter.sortBy === 'platformDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                      }`}
                      onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'platformDes' ? 'platformAsc' : 'platformDes'})}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <HeaderLabel sortState={filter.sortBy === 'platformAsc' ? 'asc' : filter.sortBy === 'platformDes' ? 'des' : null}>{definitionTitles.platforms || "Hesap"}</HeaderLabel>
                    </div>
                    </th>
                  )}
                  <th className="py-2 px-1.5 text-center font-sans select-none w-[10%] min-w-[80px]">İşlem</th>
                </tr>
              </thead>
              <tbody key={effectivePage} className="trade-tbody-fade block sm:table-row-group">
                {paginatedTrades.map((trade, idx) => (
                  <MemoizedTradeRow 
                    key={trade.id ? `${trade.id}` : `trade-fallback-${idx}`}
                    trade={trade}
                    onViewDetails={handleViewDetails}
                    onEdit={onEdit}
                    setTradeToDelete={setTradeToDelete}
                  />
                ))}
                {paginatedTrades.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs font-bold font-sans text-zinc-500 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="opacity-20" />
                        <p className="uppercase tracking-wider">Sonuç bulunamadı</p>
                        <p className="text-[10px] opacity-60">Kriterlerinize uygun işlem yok.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTrades.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-2">
              <span className="text-[10px] text-zinc-500 font-sans">
                {((effectivePage - 1) * itemsPerPage) + 1}-{Math.min(effectivePage * itemsPerPage, filteredTrades.length)} / {filteredTrades.length} gösteriliyor
              </span>
              <div className="flex gap-2">
                <button
                  disabled={effectivePage === 1}
                  onClick={() => setCurrentPage(Math.max(1, effectivePage - 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Önceki
                </button>
                <button
                  disabled={effectivePage * itemsPerPage >= filteredTrades.length}
                  onClick={() => setCurrentPage(effectivePage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {createPortal(
        <AnimatePresence>
          {tradeToDelete && (
            <motion.div
              key="trade-delete-modal-backdrop"
              {...MODAL_BACKDROP}
              className="fixed inset-0 modal-layer modal-dim z-[4500]  flex items-center justify-center p-4"
              onClick={() => setTradeToDelete(null)}
            >
              <motion.div
                key="trade-delete-modal-content"
                {...MODAL_PANEL}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-5 max-w-md w-full shadow-2xl overflow-hidden relative"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                
                <h3 className="text-base font-bold tracking-wide text-zinc-100 uppercase text-center mb-2">
                  {"İşlemi Sil"}
                </h3>
                
                <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-sans">
                  <span className="font-semibold text-zinc-200">{tradeToDelete.asset}</span> ({tradeToDelete.type === 'LONG' ? 'Long' : 'Short'} - {tradeToDelete.platform || 'Hesapsız'}) {"pozisyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."}
                </p>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTradeToDelete(null)}
                    className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-sans text-xs font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
                  >
                    {"Vazgeç"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tradeToDelete) {
                        onDelete(tradeToDelete.id);
                        setTradeToDelete(null);
                      }
                    }}
                    className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-sans text-xs font-bold uppercase tracking-widest rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 size={13} />
                    <span>{"Evet, Sil"}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* High-fidelity PDF/Print Report Preview Modal */}
      <PrintReportModal title={printModalState.title || "İşlem Raporu"} isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        trades={printModalState.trades}
        dateRangeText={printModalState.dateRangeText}
      />
    </div>
  );
});

export default TradeList;
