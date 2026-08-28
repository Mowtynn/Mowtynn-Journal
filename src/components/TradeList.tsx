import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, TradeFilter } from '../types';
import { 
  Search, 
  Edit3, 
  Trash2, 
  Clock,
  CheckCircle2,
  
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download,
  FileText,
  Calendar,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { PrintReportModal } from './PrintReportModal';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
}

const CustomSelect = React.memo(function CustomSelect({ value, onChange, options, placeholder = 'Seçiniz...', className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 sm:h-8 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg px-2.5 text-[10px] text-zinc-300 font-bold flex items-center justify-between transition-colors duration-200 ease-out cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-md py-1 custom-scrollbar"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold transition-colors duration-200 ease-out flex items-center justify-between cursor-pointer ${
                  option.value === value
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface CustomComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
}

const CustomComboBox = React.memo(function CustomComboBox({ value, onChange, options, placeholder = 'Parite Seç/Yaz...', className = '' }: CustomComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase().trim();
    return options.filter(o => {
      if (o.value === '') return true;
      return o.label.toLowerCase().includes(term);
    });
  }, [options, search]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={dropdownRef}>
      <div className="relative w-full h-10 sm:h-8 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg flex items-center transition-colors duration-200 ease-out focus-within:ring-1 focus-within:ring-blue-500/20 focus-within:border-blue-500/40">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            const newVal = e.target.value;
            setSearch(newVal);
            onChange(newVal);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-full bg-transparent pl-2.5 pr-8 text-[10px] text-zinc-300 font-bold focus:outline-none placeholder-zinc-600 truncate"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 px-2.5 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-md py-1 custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  // Keep custom value typed by user
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-left text-[9px] text-zinc-500 font-bold italic hover:bg-zinc-900"
              >
                "{search}" olarak filtrele
              </button>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setSearch(option.label);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold transition-colors duration-200 ease-out flex items-center justify-between cursor-pointer ${
                    option.value === value
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewDetails: (trade: Trade) => void;
  currency: string;
}

const TradeList = React.memo(function TradeList({ trades, onEdit, onDelete, onViewDetails, currency }: TradeListProps) {
  // Filters State
  const [filter, setFilter] = useState<TradeFilter>({
    search: '',
    status: 'ALL',
    type: 'ALL',
    asset: '',
    sortBy: 'dateDes',
    startDate: '',
    endDate: ''
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [customLastCount, setCustomLastCount] = useState<string>('5');
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  const isFilteringActive = useMemo(() => {
    return filter.status !== 'ALL' ||
           filter.type !== 'ALL' ||
           filter.asset !== '' ||
           !!filter.startDate ||
           !!filter.endDate ||
           !!filter.timeframe ||
           !!filter.htfTimeframe ||
           !!filter.session ||
           !!filter.confirmation ||
           !!filter.concept;
  }, [filter]);

  const handleResetFilters = () => {
    setFilter({
      search: filter.search,
      status: 'ALL',
      type: 'ALL',
      asset: '',
      sortBy: filter.sortBy,
      startDate: '',
      endDate: '',
      timeframe: undefined,
      htfTimeframe: undefined,
      session: undefined,
      confirmation: undefined,
      concept: undefined
    });
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

  // PDF & Printable report handlers
  const handleDownloadWeekly = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekMs = startOfWeek.getTime();
    
    const weeklyTrades = trades.filter(t => t.createdAt >= startOfWeekMs);
    
    const sorted = [...weeklyTrades].sort((a, b) => b.createdAt - a.createdAt);
    setPrintModalState({
      isOpen: true,
      trades: sorted,
      title: 'Haftalık İşlem Raporu',
      dateRangeText: 'Bu Hafta'
    });
    setIsExportOpen(false);
  };

  const handleDownloadMonthly = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthMs = startOfMonth.getTime();
    
    const monthlyTrades = trades.filter(t => t.createdAt >= startOfMonthMs);
    
    const sorted = [...monthlyTrades].sort((a, b) => b.createdAt - a.createdAt);
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

  // Virtual Scroll vs Classic Pagination State
  const [useVirtualScroll, setUseVirtualScroll] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueAssets = useMemo(() => Array.from(new Set(trades.map(t => t.asset))).sort(), [trades]);
  const uniqueTimeframes = useMemo(() => Array.from(new Set(trades.map(t => t.timeframe).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueHtfTimeframes = useMemo(() => Array.from(new Set(trades.map(t => t.htfTimeframe).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueSessions = useMemo(() => Array.from(new Set(trades.map(t => t.session).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueConfirmations = useMemo(() => Array.from(new Set(trades.flatMap(t => t.confirmations || []))).sort(), [trades]);
  const uniqueConcepts = useMemo(() => Array.from(new Set(trades.map(t => t.concept).filter(Boolean) as string[])).sort(), [trades]);

  const sortByOptions = useMemo(() => [
    { value: 'dateDes', label: 'En Yeni Aktiviteler' },
    { value: 'dateAsc', label: 'En Eski Aktiviteler' },
    { value: 'pnlDes', label: 'Kârlılık (Yüksekten Düşüğe)' },
    { value: 'pnlAsc', label: 'Kârlılık (Düşükten Yükseğe)' },
    { value: 'rrDes', label: 'R Oranı (Yüksekten Düşüğe)' },
    { value: 'rrAsc', label: 'R Oranı (Düşükten Yükseğe)' }
  ], []);

  const assetOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueAssets.map(asset => ({ value: asset, label: asset }))
  ], [uniqueAssets]);

  const conceptOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueConcepts.map(s => ({ value: s, label: s }))
  ], [uniqueConcepts]);

  const confirmationOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueConfirmations.map(c => ({ value: c, label: c }))
  ], [uniqueConfirmations]);

  const sessionOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueSessions.map(sess => ({ value: sess, label: sess }))
  ], [uniqueSessions]);

  const timeframeOptions = useMemo(() => [
    { value: '', label: 'ETF (Tümü)' },
    ...uniqueTimeframes.map(tf => ({ value: tf, label: tf }))
  ], [uniqueTimeframes]);

  const htfTimeframeOptions = useMemo(() => [
    { value: '', label: 'HTF (Tümü)' },
    ...uniqueHtfTimeframes.map(tf => ({ value: tf, label: tf }))
  ], [uniqueHtfTimeframes]);

  // Apply filters & sorting
  const filteredTrades = useMemo(() => {
    return trades
      .filter(trade => {
        const searchLower = filter.search?.toLowerCase() || '';
        const matchesSearch = !searchLower ||
          (trade.asset || '').toLowerCase().includes(searchLower) ||
          (trade.notes || '').toLowerCase().includes(searchLower);
        
        const matchesStatus = filter.status === 'ALL' || trade.status === filter.status;
        const matchesType = filter.type === 'ALL' || trade.type === filter.type;
        const matchesAsset = !filter.asset || trade.asset === filter.asset;
        const matchesTimeframe = !filter.timeframe || trade.timeframe === filter.timeframe;
        const matchesHtfTimeframe = !filter.htfTimeframe || trade.htfTimeframe === filter.htfTimeframe;
        const matchesSession = !filter.session || trade.session === filter.session;
        const matchesConfirmation = !filter.confirmation || (trade.confirmations && trade.confirmations.includes(filter.confirmation));
        const matchesConcept = !filter.concept || trade.concept === filter.concept;
        
        let matchesDate = true;
        if (filter.startDate || filter.endDate) {
          const tradeDate = new Date(trade.createdAt);
          tradeDate.setHours(0, 0, 0, 0);
          
          if (filter.startDate) {
            const start = new Date(filter.startDate);
            start.setHours(0, 0, 0, 0);
            if (tradeDate < start) matchesDate = false;
          }
          
          if (filter.endDate) {
            const end = new Date(filter.endDate);
            end.setHours(23, 59, 59, 999);
            if (tradeDate > end) matchesDate = false;
          }
        }

        return matchesSearch && matchesStatus && matchesType && matchesAsset && matchesDate && matchesTimeframe && matchesHtfTimeframe && matchesSession && matchesConfirmation && matchesConcept;
      })
      .sort((a, b) => {
        switch (filter.sortBy) {
          case 'dateDes':
            return b.createdAt - a.createdAt;
          case 'dateAsc':
            return a.createdAt - b.createdAt;
          case 'pnlDes':
            return (b.pnl || 0) - (a.pnl || 0);
          case 'pnlAsc':
            return (a.pnl || 0) - (b.pnl || 0);
          case 'assetAsc':
            return a.asset.localeCompare(b.asset);
          case 'assetDes':
            return b.asset.localeCompare(a.asset);
          case 'typeAsc':
            return a.type.localeCompare(b.type);
          case 'typeDes':
            return b.type.localeCompare(a.type);
          case 'rrAsc':
            return (a.rr || 0) - (b.rr || 0);
          case 'rrDes':
            return (b.rr || 0) - (a.rr || 0);
          case 'platformAsc':
            return (a.platform || '').localeCompare(b.platform || '');
          case 'platformDes':
            return (b.platform || '').localeCompare(a.platform || '');
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [trades, filter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredTrades.length]);

  // Track Container height for Virtual Scrolling
  useEffect(() => {
    if (!useVirtualScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    // Set initial size
    setContainerHeight(container.clientHeight || 400);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height || 400);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [useVirtualScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, currentPage]);

  // Get responsive row height
  const rowHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 126 : 44;
  const buffer = 5;

  const virtualData = useMemo(() => {
    if (!useVirtualScroll) {
      return {
        items: paginatedTrades,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endIndex = Math.min(filteredTrades.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);
    const visibleItems = filteredTrades.slice(startIndex, endIndex);

    const paddingTop = startIndex * rowHeight;
    const paddingBottom = Math.max(0, (filteredTrades.length - endIndex) * rowHeight);

    return {
      items: visibleItems,
      paddingTop,
      paddingBottom,
    };
  }, [useVirtualScroll, scrollTop, containerHeight, filteredTrades, paginatedTrades]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

  const handleFilterChange = (newFilter: TradeFilter) => {
    setFilter(newFilter);
  };

  return (
    <div id="trades-history-section" className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col shadow-sm">
      {/* HEADER WITH SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
            <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock size={11} />
            </span>
            <div className="flex items-center gap-1.5 mt-[1px]">
              <span className="leading-none flex items-center">İşlem Geçmişi</span>
            </div>
            <span className="text-[9px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300 flex items-center justify-center leading-none mt-[1px]">
              {filteredTrades.length} / {trades.length} işlem
            </span>
          </h2>
        </div>

        {/* HEADER CONTROLS: SEARCH */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 text-zinc-500" size={12} />
            <input
              type="text"
              placeholder="Enstrüman veya not ara..."
              value={filter.search}
              onChange={(e) => handleFilterChange({ ...filter, search: e.target.value })}
              className="w-full h-10 sm:h-8 bg-zinc-900/80 border border-zinc-800 rounded-lg pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition duration-200 ease-out font-mono"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center w-10 sm:w-8 h-10 sm:h-8 rounded-lg border transition-all duration-200 ${
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
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className={`flex items-center justify-center w-10 sm:w-8 h-10 sm:h-8 rounded-lg border transition-all duration-200 shrink-0 cursor-pointer ${
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2 min-w-[260px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-sm z-50 py-1.5 overflow-hidden"
                >
                  <div className="px-3 py-1 text-[9px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-800 mb-1">
                    PDF RAPOR SECENEKLERI
                  </div>
                  
                  <button
                    onClick={handleDownloadWeekly}
                    className="w-full px-3 py-2 text-left text-[11px] text-zinc-200 hover:bg-zinc-800 hover:text-blue-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar size={11} className="text-blue-400" />
                    <span>Bu Hafta Raporu İndir</span>
                  </button>
                  
                  <button
                    onClick={handleDownloadMonthly}
                    className="w-full px-3 py-2 text-left text-[11px] text-zinc-200 hover:bg-zinc-800 hover:text-indigo-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar size={11} className="text-indigo-400" />
                    <span>Bu Ay Raporu İndir</span>
                  </button>
                  
                  <div className="border-t border-zinc-800 my-1"></div>
                  
                  <button
                    onClick={handleDownloadFiltered}
                    className="w-full px-3 py-2 text-left text-[11px] text-zinc-200 hover:bg-zinc-800 hover:text-emerald-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={11} className="text-emerald-400" />
                    <span>Filtrelenmiş Rapor İndir ({filteredTrades.length})</span>
                  </button>

                  <div className="border-t border-zinc-800 my-1"></div>

                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200">
                      <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">Son</span>
                      <input
                        type="number"
                        min="1"
                        max={trades.length || 100}
                        value={customLastCount}
                        onChange={(e) => setCustomLastCount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 bg-zinc-900 border border-zinc-700 text-center text-blue-400 font-bold rounded py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-zinc-400 text-[10px] font-medium whitespace-nowrap">işlem raporu</span>
                      <button
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
                        className="ml-auto shrink-0 whitespace-nowrap px-3 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                      >
                        İndir
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => {
              setUseVirtualScroll(!useVirtualScroll);
              setCurrentPage(1);
            }}
            className={`flex items-center justify-center w-10 sm:w-8 h-10 sm:h-8 rounded-lg border transition-colors shrink-0 cursor-pointer ${
              useVirtualScroll
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Zap size={12} className={useVirtualScroll ? "animate-pulse text-indigo-400" : ""} />
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS GRID */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-30"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4.5 shadow-sm">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[11px] pt-1">
                {/* Sol Sütun: Hızlı Filtreler & Sıralama */}
                <div className="space-y-3.5 lg:border-r border-zinc-800 lg:pr-6">
                  {/* Durum */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Durum</span>
                    <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 gap-0.5 w-48 shrink-0">
                      {(['ALL', 'WIN', 'LOSS', 'BREAKEVEN'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleFilterChange({ ...filter, status: st })}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-colors duration-200 ease-out cursor-pointer text-center ${
                            filter.status === st
                              ? st === 'WIN'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5'
                                : st === 'LOSS'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/5'
                                : st === 'BREAKEVEN'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5'
                                : 'bg-zinc-800 text-zinc-100 border border-zinc-700/50'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
                          }`}
                        >
                          {st === 'ALL' ? 'TÜMÜ' : st === 'BREAKEVEN' ? 'BE' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Yön */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Yön</span>
                    <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 gap-0.5 w-48 shrink-0">
                      {(['ALL', 'LONG', 'SHORT'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => handleFilterChange({ ...filter, type: dir })}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-colors duration-200 ease-out cursor-pointer text-center ${
                            filter.type === dir
                              ? dir === 'LONG'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : dir === 'SHORT'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                : 'bg-zinc-800 text-zinc-100 border border-zinc-700/50'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
                          }`}
                        >
                          {dir === 'ALL' ? 'TÜMÜ' : dir}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sıralama */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Sıralama</span>
                    <CustomSelect
                      value={filter.sortBy}
                      onChange={(val) => handleFilterChange({ ...filter, sortBy: val as any })}
                      options={sortByOptions}
                      className="w-48 shrink-0 animate-fadeIn"
                    />
                  </div>
                </div>

                {/* Orta Sütun: Enstrüman & Kurulum */}
                <div className="space-y-3.5 lg:border-r border-zinc-800 lg:px-6">
                  {/* Parite */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Parite</span>
                    <CustomComboBox
                      value={filter.asset}
                      onChange={(val) => handleFilterChange({ ...filter, asset: val })}
                      options={assetOptions}
                      placeholder="Parite Seç / Yaz"
                      className="w-48 shrink-0"
                    />
                  </div>

                  {/* Konsept */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Konsept</span>
                    <CustomSelect
                      value={filter.concept || ''}
                      onChange={(val) => handleFilterChange({ ...filter, concept: val || undefined })}
                      options={conceptOptions}
                      placeholder="Konsept Seçin"
                      className="w-48 shrink-0"
                    />
                  </div>

                  {/* Onay */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Onay</span>
                    <CustomSelect
                      value={filter.confirmation || ''}
                      onChange={(val) => handleFilterChange({ ...filter, confirmation: val || undefined })}
                      options={confirmationOptions}
                      placeholder="Onay Seçin"
                      className="w-48 shrink-0"
                    />
                  </div>
                </div>

                {/* Sağ Sütun: Seans & Zaman Dilimi */}
                <div className="space-y-3.5 lg:pl-6">
                  {/* Seans */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Seans</span>
                    <CustomSelect
                      value={filter.session || ''}
                      onChange={(val) => handleFilterChange({ ...filter, session: val || undefined })}
                      options={sessionOptions}
                      placeholder="Seans Seçin"
                      className="w-48 shrink-0"
                    />
                  </div>

                  {/* Timeframes */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">ETF / HTF</span>
                    <div className="grid grid-cols-2 gap-1.5 w-48 shrink-0">
                      <CustomSelect
                        value={filter.timeframe || ''}
                        onChange={(val) => handleFilterChange({ ...filter, timeframe: val || undefined })}
                        options={timeframeOptions}
                        placeholder="ETF"
                        className="w-full"
                      />
                      <CustomSelect
                        value={filter.htfTimeframe || ''}
                        onChange={(val) => handleFilterChange({ ...filter, htfTimeframe: val || undefined })}
                        options={htfTimeframeOptions}
                        placeholder="HTF"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Tarih Aralığı */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">Tarih Aralığı</span>
                    <div className="grid grid-cols-2 gap-1.5 w-48 shrink-0">
                      <input
                        type="date"
                        value={filter.startDate || ''}
                        onChange={(e) => handleFilterChange({ ...filter, startDate: e.target.value })}
                        className="w-full h-10 sm:h-8 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg px-1.5 text-[10px] text-zinc-300 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors duration-200 ease-out cursor-pointer font-mono"
                        
                      />
                      <input
                        type="date"
                        value={filter.endDate || ''}
                        onChange={(e) => handleFilterChange({ ...filter, endDate: e.target.value })}
                        className="w-full h-10 sm:h-8 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg px-1.5 text-[10px] text-zinc-300 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors duration-200 ease-out cursor-pointer font-mono"
                        
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLE/GRID CONTAINER */}
      {filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-zinc-800/80 border-dashed rounded-xl bg-zinc-900/60 relative overflow-hidden my-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2.5 shadow-inner">
            <Clock size={20} className="text-zinc-400" />
          </div>
          <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest font-mono">Kayıt Bulunamadı</h4>
          <p className="text-[11px] text-zinc-400 max-w-sm mt-1.5 leading-relaxed font-sans">
            {trades.length === 0 
              ? "Herhangi bir işlem kaydı bulunmuyor. Üst kısımdaki 'İşlem Ekle' kutusunu kullanarak ilk kaydınızı girin."
              : "Belirtilen süzgeç ölçütleriyle eşleşen işlem yok."}
          </p>
        </div>
      ) : (
        <>
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`relative z-0 overflow-x-auto w-full rounded-lg ${
              useVirtualScroll ? 'overflow-y-auto max-h-[500px] scrollbar-thin' : 'min-h-[380px] flex flex-col justify-between'
            }`}
          >
            <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap sm:table-fixed sm:min-w-[750px] block sm:table">
              <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                <tr className="text-[9px] text-zinc-400 uppercase tracking-widest relative after:absolute after:inset-0 after:rounded-lg after:border after:border-zinc-800 after:pointer-events-none">
                  <th 
                    className="py-1.5 px-3 font-mono select-none w-[18%] min-w-[130px] bg-zinc-950/40 rounded-l-lg cursor-pointer hover:text-zinc-200"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'dateDes' ? 'dateAsc' : 'dateDes'})}
                  >
                    Tarih {filter.sortBy === 'dateAsc' ? '↑' : filter.sortBy === 'dateDes' ? '↓' : ''}
                  </th>
                  <th 
                    className="py-1.5 px-3 font-mono select-none w-[14%] min-w-[90px] bg-zinc-950/40 cursor-pointer hover:text-zinc-200 text-left"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'assetAsc' ? 'assetDes' : 'assetAsc'})}
                  >
                    Parite {filter.sortBy === 'assetAsc' ? '↑' : filter.sortBy === 'assetDes' ? '↓' : ''}
                  </th>
                  <th 
                    className="py-1.5 px-2 text-center font-mono select-none w-[10%] min-w-[65px] bg-zinc-950/40 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'typeAsc' ? 'typeDes' : 'typeAsc'})}
                  >
                    Yön {filter.sortBy === 'typeAsc' ? '↑' : filter.sortBy === 'typeDes' ? '↓' : ''}
                  </th>
                  <th 
                    className="py-1.5 px-2 text-center font-mono select-none w-[10%] min-w-[65px] bg-zinc-950/40 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'rrDes' ? 'rrAsc' : 'rrDes'})}
                  >
                    RR {filter.sortBy === 'rrAsc' ? '↑' : filter.sortBy === 'rrDes' ? '↓' : ''}
                  </th>
                  <th className="py-1.5 px-2 text-center font-mono select-none w-[12%] min-w-[75px] bg-zinc-950/40">Sonuç</th>
                  <th 
                    className="py-1.5 px-3 text-right font-mono select-none w-[16%] min-w-[95px] bg-zinc-950/40 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'pnlDes' ? 'pnlAsc' : 'pnlDes'})}
                  >
                    <div className="flex items-center justify-end w-full relative"><span>Kâr/Zarar</span><span className="absolute -right-3 text-[10px] w-3 flex justify-center">{filter.sortBy === 'pnlAsc' ? '↑' : filter.sortBy === 'pnlDes' ? '↓' : ''}</span></div>
                  </th>
                  <th 
                    className="py-1.5 px-2 text-center font-mono select-none w-[12%] min-w-[75px] bg-zinc-950/40 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'platformDes' ? 'platformAsc' : 'platformDes'})}
                  >
                    Platform {filter.sortBy === 'platformAsc' ? '↑' : filter.sortBy === 'platformDes' ? '↓' : ''}
                  </th>
                  <th className="py-1.5 px-3 text-right font-mono select-none w-[8%] min-w-[60px] bg-zinc-950/40 rounded-r-lg">İşlem</th>
                </tr>
              </thead>
              <AnimatePresence mode="wait" initial={false}>
                <motion.tbody
                  key={useVirtualScroll ? 'virtual' : currentPage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="block sm:table-row-group"
                >
                {virtualData.paddingTop > 0 && (
                  <tr style={{ height: virtualData.paddingTop }} className="hidden sm:table-row">
                    <td colSpan={8} className="p-0 border-none m-0" />
                  </tr>
                )}
                {virtualData.items.map((trade, idx) => {
                  const isWin = trade.status === 'WIN';
                  const isLoss = trade.status === 'LOSS';
                  const isBe = trade.status === 'BREAKEVEN';
                  let pnlText = '—';
                  let pnlColor = 'text-zinc-400';
                  
                  if (isBe) {
                    pnlText = `0.00 ${currency}`;
                    pnlColor = 'text-zinc-500 font-bold';
                  } else {
                    const pnlValue = trade.pnl || 0;
                    const prefix = pnlValue > 0 ? '+' : '';
                    pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                    pnlColor = pnlValue > 0 ? 'text-emerald-400 font-black' : (pnlValue < 0 ? 'text-rose-400 font-black' : 'text-zinc-500 font-bold');
                  }
                  
                  const formattedDate = new Date(trade.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <motion.tr 
                      key={trade.id ? `${trade.id}-${idx}` : `trade-${idx}`}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => onViewDetails(trade)}
                      className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-950/40 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0 align-middle"
                    >
                      <td className="w-1/2 sm:w-[18%] sm:min-w-[130px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-mono sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-l-lg sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                          <span className="sm:hidden text-white font-bold text-xs">{trade.asset}</span>
                          <span className="text-[10px] sm:text-[10px] text-zinc-500 sm:text-zinc-400 transition-colors">{formattedDate}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell sm:w-[14%] sm:min-w-[90px] py-1 px-0 sm:px-3 sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 text-left align-middle">
                        <span className="text-white font-bold text-[10px]">{trade.asset}</span>
                      </td>
                      <td className="w-1/2 sm:w-[10%] sm:min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                        <div className="flex items-center justify-center w-full">
                          {trade.type === 'LONG' ? (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LONG</span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">SHORT</span>
                          )}
                        </div>
                      </td>
                      <td className="w-1/2 sm:w-[10%] sm:min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                          <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
                          <div className="flex items-center justify-center w-full h-[18px]">
                            {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
                              trade.rr > 0 ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                  +{trade.rr}R
                                </span>
                              ) : trade.rr < 0 ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                  {trade.rr}R
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                  {trade.rr}R
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded">—</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="w-1/2 sm:w-[12%] sm:min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                        <div className="flex items-center justify-center w-full h-[18px]">
                          {isWin ? (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">WIN</span>
                          ) : isLoss ? (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LOSS</span>
                          ) : isBe ? (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">BE</span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">AÇIK</span>
                          )}
                        </div>
                      </td>
                      <td className={`w-full sm:w-[16%] sm:min-w-[95px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 pt-3 sm:pt-0 border-t border-zinc-800/50 align-middle`}>
                        <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end">
                          <span className="text-sm sm:text-[11px] font-mono font-black">{pnlText}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell sm:w-[12%] sm:min-w-[75px] py-1.5 px-2 text-center bg-zinc-950/30 group-hover:bg-blue-950/10 border-y border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                        <div className="flex items-center justify-center w-full">
                          {trade.platform ? (
                            <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={trade.platform}>
                              {trade.platform}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="w-full sm:w-[8%] sm:min-w-[60px] flex justify-between sm:justify-end items-center sm:table-cell order-6 py-1 px-0 sm:px-3 text-right sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-r-lg sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
                        <div className="sm:hidden">
                          {trade.platform ? (
                            <span className="inline-flex items-center justify-center min-w-[46px] max-w-[120px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 rounded-full uppercase tracking-wider font-mono whitespace-nowrap truncate">
                              {trade.platform}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-end gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(trade);
                            }}
                            className="p-1 hover:bg-zinc-800 hover:text-blue-400 text-zinc-400 rounded transition duration-200 ease-out cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTradeToDelete(trade);
                            }}
                            className="p-1 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded transition duration-200 ease-out cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {virtualData.paddingBottom > 0 && (
                  <tr style={{ height: virtualData.paddingBottom }} className="hidden sm:table-row">
                    <td colSpan={8} className="p-0 border-none m-0" />
                  </tr>
                )}
                {virtualData.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[11px] font-bold font-mono text-zinc-500 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="opacity-20" />
                        <p className="uppercase tracking-wider">Sonuç bulunamadı</p>
                        <p className="text-[10px] opacity-60">Kriterlerinize uygun işlem yok.</p>
                      </div>
                    </td>
                  </tr>
                )}
                </motion.tbody>
              </AnimatePresence>
            </table>

            {/* PAGINATION CONTROLS */}
            {!useVirtualScroll && filteredTrades.length > 0 && (
              <div className="flex items-center justify-between p-3 border-t border-zinc-800/80 bg-transparent rounded-b-xl mt-auto">
                <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                  Toplam {filteredTrades.length} İşlem ({Math.min((currentPage - 1) * itemsPerPage + 1, filteredTrades.length)} - {Math.min(currentPage * itemsPerPage, filteredTrades.length)})
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">
                    Sayfa {currentPage} / {Math.max(1, totalPages)}
                  </span>
                  <div className="flex items-center bg-zinc-950/50 border border-zinc-800 rounded-md p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {tradeToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[1200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTradeToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative shadow-rose-500/5"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent"></div>
              
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              
              <h3 className="text-base font-bold tracking-wide text-zinc-100 uppercase text-center mb-2">
                İşlemi Sil
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-mono">
                <span className="font-semibold text-zinc-200">{tradeToDelete.asset}</span> ({tradeToDelete.type === 'LONG' ? 'Long' : 'Short'} - {tradeToDelete.platform || 'Platform'}) pozisyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTradeToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tradeToDelete) {
                      onDelete(tradeToDelete.id);
                      setTradeToDelete(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>Evet, Sil</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-fidelity PDF/Print Report Preview Modal */}
      <PrintReportModal title="Analiz Raporu" isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        trades={printModalState.trades}
        
        dateRangeText={printModalState.dateRangeText}
        currency={currency}
      />
    </div>
  );
});

export default TradeList;
