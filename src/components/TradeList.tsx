import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, TradeFilter, DefinitionTitles } from '../types';
import { DEFAULT_DEFINITION_TITLES, caseInsensitiveMatch, caseInsensitiveEquals, getTradeAccountCategory } from '../constants/constants';
import { 
  Search, 
  Edit3, 
  Trash2, 
  Clock,
  Filter,
  Download,
  FileText,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PrintReportModal } from './PrintReportModal';
import { TurkishDatePicker } from './TurkishDateTimePicker';

function TableSortBadge({ sortState }: { sortState: 'asc' | 'des' | null }) {
  if (!sortState) {
    return (
      <span className="inline-flex flex-col items-center justify-center w-3 h-3 opacity-0 group-hover/th:opacity-50 transition-opacity text-zinc-500 shrink-0">
        <ChevronUp size={8} strokeWidth={2.5} className="-mb-1" />
        <ChevronDown size={8} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-glow-sm shrink-0 transition-all duration-150">
      {sortState === 'asc' ? (
        <ArrowUp size={9} strokeWidth={2.5} />
      ) : (
        <ArrowDown size={9} strokeWidth={2.5} />
      )}
    </span>
  );
}

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
        className="w-full h-9 sm:h-8 bg-zinc-950 hover:bg-zinc-900/70 border border-zinc-700/50  hover:border-zinc-700/80 rounded-xl px-2.5 text-[10px] text-zinc-300 font-bold flex items-center justify-between transition-colors duration-200 ease-out cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        <span className="truncate uppercase">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="custom-select-dropdown"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-md py-1 custom-scrollbar"
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
                    ? 'toggle-item-brand'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span className="truncate uppercase">{option.label}</span>
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
      <div className="relative w-full h-9 sm:h-8 bg-zinc-950 hover:bg-zinc-900/70 border border-zinc-700/50  hover:border-zinc-700/80 rounded-xl flex items-center transition-colors duration-200 ease-out focus-within:ring-1 focus-within:ring-blue-500/20 focus-within:border-blue-500/40">
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
          className="w-full h-full bg-transparent pl-2.5 pr-8 text-[10px] text-zinc-300 font-bold focus:outline-none placeholder-zinc-600 truncate uppercase"
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
            key="custom-combobox-dropdown"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-md py-1 custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  // Keep custom value typed by user
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-left text-[9px] text-zinc-500 font-bold italic hover:bg-zinc-900 uppercase"
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
                      ? 'toggle-item-brand'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate uppercase">{option.label}</span>
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

const tradeRowDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
const tradeRowTimeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });

const MemoizedTradeRow = React.memo(function MemoizedTradeRow({ 
  trade, 
  currency, 
  onViewDetails, 
  onEdit, 
  setTradeToDelete 
}: { 
  trade: Trade; 
  currency: string; 
  onViewDetails: (trade: Trade) => void; 
  onEdit: (trade: Trade) => void; 
  setTradeToDelete: (trade: Trade) => void; 
}) {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isBe = trade.status === 'BREAKEVEN';

  const { pnlText, pnlColor } = useMemo(() => {
    if (isBe) {
      return { pnlText: `0.00 ${currency}`, pnlColor: 'text-zinc-500 font-bold' };
    }
    const pnlValue = trade.pnl || 0;
    const prefix = pnlValue > 0 ? '+' : '';
    const text = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
    const color = pnlValue > 0 ? 'text-emerald-400 font-bold' : (pnlValue < 0 ? 'text-rose-400 font-bold' : 'text-zinc-500 font-bold');
    return { pnlText: text, pnlColor: color };
  }, [isBe, trade.pnl, currency]);

  const { formattedDateOnly, formattedTimeOnly } = useMemo(() => {
    if (!trade.createdAt) return { formattedDateOnly: '—', formattedTimeOnly: '' };
    const dateObj = new Date(trade.createdAt);
    return {
      formattedDateOnly: tradeRowDateFormatter.format(dateObj),
      formattedTimeOnly: tradeRowTimeFormatter.format(dateObj)
    };
  }, [trade.createdAt]);

  return (
    <tr 
      onClick={() => onViewDetails(trade)}
      className="group select-none relative flex flex-wrap sm:table-row bg-zinc-900 mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 sm:border-none p-2 sm:p-0 align-middle cursor-pointer hover:bg-zinc-800/50 transition-colors duration-100 cv-auto"
    >
      <td className="w-1/2 min-w-[130px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 font-sans sm:bg-transparent sm:rounded-l-xl sm:border-y sm:border-l sm:border-zinc-800/80 align-middle sm:w-[18%] group-hover:text-zinc-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="sm:hidden text-white font-bold text-xs uppercase">{trade.asset}</span>
          </div>
          <span className="text-[10px] sm:text-[10px] flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">{formattedDateOnly}</span>
            <span className="text-zinc-600 font-bold">•</span>
            <span className="text-zinc-500 font-sans">{formattedTimeOnly}</span>
          </span>
        </div>
      </td>
      <td className="hidden sm:table-cell min-w-[90px] py-1 px-0 sm:px-3 sm:bg-transparent sm:border-y sm:border-zinc-800/80 text-left align-middle sm:w-[14%]">
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-bold text-[10px] uppercase">{trade.asset}</span>
        </div>
      </td>
      <td className="w-1/2 min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 align-middle sm:w-[10%]">
        <div className="flex items-center justify-center w-full">
          {trade.type === 'LONG' ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">LONG</span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">SHORT</span>
          )}
        </div>
      </td>
      <td className="w-1/2 min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 align-middle sm:w-[10%]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
          <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
          <div className="flex items-center justify-center w-full h-[18px]">
            {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
              trade.rr > 0 ? (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans">
                  +{trade.rr}R
                </span>
              ) : trade.rr < 0 ? (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans">
                  {trade.rr}R
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans">
                  {trade.rr}R
                </span>
              )
            ) : (
              <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded-md">—</span>
            )}
          </div>
        </div>
      </td>
      <td className="w-1/2 min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 align-middle sm:w-[12%]">
        <div className="flex items-center justify-center w-full h-[18px]">
          {isWin ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">WIN</span>
          ) : isLoss ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">LOSS</span>
          ) : isBe ? (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">BE</span>
          ) : (
            <span className="inline-flex items-center justify-center h-[20px] px-2 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-sans w-[46px] sm:w-[54px]">AÇIK</span>
          )}
        </div>
      </td>
      <td className={`w-full min-w-[95px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-transparent sm:border-y sm:border-zinc-800/80 mt-1.5 sm:mt-0 max-sm:pt-3 max-sm:border-t max-sm:border-zinc-800/50 sm:py-1 align-middle sm:w-[16%]`}>
        <span className="sm:hidden heading-3 text-left font-sans">Kâr/Zarar</span>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end sm:h-[20px]">
          <span className="text-sm sm:text-xs font-bold font-sans inline-flex items-center justify-end h-[20px] leading-none tracking-tight">{pnlText}</span>
        </div>
      </td>
      {true && (
        <td className="hidden sm:table-cell sm:w-[12%] sm:min-w-[75px] py-1.5 px-2 text-center bg-transparent border-y border-zinc-800/80 align-middle">
          <div className="flex items-center justify-center w-full">
            {trade.platform ? (
              <span className={`inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold rounded-full uppercase tracking-wider font-sans whitespace-nowrap truncate border transition-colors ${
                getTradeAccountCategory(trade) === 'DEMO'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 group-hover:border-amber-500/60'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 group-hover:border-emerald-500/60'
              }`}>
                {trade.platform}
              </span>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>
        </td>
      )}
      <td className="w-full sm:w-[8%] sm:min-w-[60px] flex justify-between sm:justify-end items-center sm:table-cell order-6 py-1 px-0 sm:px-3 text-right sm:bg-transparent sm:rounded-r-xl sm:border-y sm:border-r sm:border-zinc-800/80 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
        {true && (
          <div className="sm:hidden">
            {trade.platform ? (
              <span className={`inline-flex items-center justify-center min-w-[46px] max-w-[120px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold rounded-full uppercase tracking-wider font-sans whitespace-nowrap truncate border ${
                getTradeAccountCategory(trade) === 'DEMO'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {trade.platform}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex items-center justify-end gap-1 w-full" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(trade);
            }}
            className="p-1 hover:bg-zinc-800 hover:text-blue-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTradeToDelete(trade);
            }}
            className="p-1 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded-lg transition duration-150 ease-out cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
});

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewDetails: (trade: Trade) => void;
  currency: string;
  definitionTitles?: DefinitionTitles;
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
}

const TradeList = React.memo(function TradeList({ 
  trades, 
  onEdit, 
  onDelete, 
  onViewDetails, 
  currency,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  planFidelities = [],
  entryModels = [],
  trendTypes = []
}: TradeListProps) {

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
           !!filter.concept ||
           !!filter.planFidelity ||
           !!filter.entry ||
           !!filter.trend;
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
      concept: undefined,
      planFidelity: undefined,
      entry: undefined,
      trend: undefined
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Limit items per page to 30

  const uniqueAssets = useMemo(() => Array.from(new Set(trades.map(t => t.asset))).sort(), [trades]);
  const uniqueTimeframes = useMemo(() => Array.from(new Set(trades.map(t => t.timeframe).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueHtfTimeframes = useMemo(() => Array.from(new Set(trades.map(t => t.htfTimeframe).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueSessions = useMemo(() => Array.from(new Set(trades.map(t => t.session).filter(Boolean) as string[])).sort(), [trades]);
  const uniqueConfirmations = useMemo(() => Array.from(new Set(trades.flatMap(t => t.confirmations || []))).sort(), [trades]);
  const uniqueConcepts = useMemo(() => Array.from(new Set(trades.map(t => t.concept).filter(Boolean) as string[])).sort(), [trades]);
  const uniquePlanFidelities = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t.planFidelity) set.add(t.planFidelity);
    });
    planFidelities.forEach(pf => {
      if (pf) set.add(pf);
    });
    return Array.from(set).sort();
  }, [trades, planFidelities]);

  const uniqueTrendTypes = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t.trend) set.add(t.trend);
    });
    trendTypes.forEach(tt => {
      if (tt) set.add(tt);
    });
    return Array.from(set).sort();
  }, [trades, trendTypes]);

  const uniqueEntryModels = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t.entryModels && Array.isArray(t.entryModels)) {
        t.entryModels.forEach(em => em && set.add(em));
      } else if (t.entry) {
        t.entry.split(',').map(s => s.trim()).forEach(em => em && set.add(em));
      }
    });
    entryModels.forEach(em => {
      if (em) set.add(em);
    });
    return Array.from(set).sort();
  }, [trades, entryModels]);

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

  const planFidelityOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniquePlanFidelities.map(pf => ({ value: pf, label: pf }))
  ], [uniquePlanFidelities]);

  const trendTypeOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueTrendTypes.map(tt => ({ value: tt, label: tt }))
  ], [uniqueTrendTypes]);

  const entryModelOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueEntryModels.map(em => ({ value: em, label: em }))
  ], [uniqueEntryModels]);

  const sessionOptions = useMemo(() => [
    { value: '', label: 'Tümü' },
    ...uniqueSessions.map(sess => ({ value: sess, label: sess }))
  ], [uniqueSessions]);

  const timeframeOptions = useMemo(() => [
    { value: '', label: 'ETF (Tümü)' },
    ...uniqueTimeframes.map(tf => ({ value: tf, label: tf }))
  ], [uniqueTimeframes]);

  const htfTimeframeOptions = useMemo(() => [
    { value: '', label: `${definitionTitles?.htfTimeframes || 'Timeframe'} (Tümü)` },
    ...uniqueHtfTimeframes.map(tf => ({ value: tf, label: tf }))
  ], [uniqueHtfTimeframes, definitionTitles]);

  const deferredFilter = useDeferredValue(filter);

  // Apply filters & sorting
  const filteredTrades = useMemo(() => {
    const startTime = deferredFilter.startDate ? new Date(deferredFilter.startDate).setHours(0, 0, 0, 0) : null;
    const endTime = deferredFilter.endDate ? new Date(deferredFilter.endDate).setHours(23, 59, 59, 999) : null;
    const collator = new Intl.Collator('tr', { sensitivity: 'base' });

    return trades
      .filter(trade => {
        if (startTime !== null && trade.createdAt < startTime) return false;
        if (endTime !== null && trade.createdAt > endTime) return false;

        const matchesSearch = !deferredFilter.search || 
          caseInsensitiveMatch(trade.asset, deferredFilter.search) || 
          caseInsensitiveMatch(trade.notes, deferredFilter.search) ||
          caseInsensitiveMatch(trade.concept, deferredFilter.search) ||
          caseInsensitiveMatch(trade.session, deferredFilter.search) ||
          caseInsensitiveMatch(trade.platform, deferredFilter.search) ||
          caseInsensitiveMatch(trade.planFidelity, deferredFilter.search) ||
          caseInsensitiveMatch(trade.trend, deferredFilter.search) ||
          (trade.entryModels && trade.entryModels.some(em => caseInsensitiveMatch(em, deferredFilter.search))) ||
          (trade.confirmations && trade.confirmations.some(c => caseInsensitiveMatch(c, deferredFilter.search)));
        
        if (!matchesSearch) return false;

        const matchesStatus = deferredFilter.status === 'ALL' || caseInsensitiveEquals(trade.status, deferredFilter.status);
        if (!matchesStatus) return false;

        const matchesType = deferredFilter.type === 'ALL' || caseInsensitiveEquals(trade.type, deferredFilter.type);
        if (!matchesType) return false;

        const matchesAsset = !deferredFilter.asset || caseInsensitiveEquals(trade.asset, deferredFilter.asset);
        if (!matchesAsset) return false;

        const matchesTimeframe = !deferredFilter.timeframe || caseInsensitiveEquals(trade.timeframe, deferredFilter.timeframe);
        if (!matchesTimeframe) return false;

        const matchesHtfTimeframe = !deferredFilter.htfTimeframe || caseInsensitiveEquals(trade.htfTimeframe, deferredFilter.htfTimeframe);
        if (!matchesHtfTimeframe) return false;

        const matchesSession = !deferredFilter.session || caseInsensitiveEquals(trade.session, deferredFilter.session);
        if (!matchesSession) return false;

        const matchesConfirmation = !deferredFilter.confirmation || (trade.confirmations && trade.confirmations.some(c => caseInsensitiveEquals(c, deferredFilter.confirmation)));
        if (!matchesConfirmation) return false;

        const matchesConcept = !deferredFilter.concept || caseInsensitiveEquals(trade.concept, deferredFilter.concept);
        if (!matchesConcept) return false;

        const matchesPlanFidelity = !deferredFilter.planFidelity || caseInsensitiveEquals(trade.planFidelity, deferredFilter.planFidelity);
        if (!matchesPlanFidelity) return false;

        const matchesEntry = !deferredFilter.entry || 
          (trade.entryModels && trade.entryModels.some(em => caseInsensitiveEquals(em, deferredFilter.entry))) ||
          (trade.entry && trade.entry.split(',').map(s => s.trim()).some(em => caseInsensitiveEquals(em, deferredFilter.entry)));
        if (!matchesEntry) return false;

        const matchesTrend = !deferredFilter.trend || caseInsensitiveEquals(trade.trend, deferredFilter.trend);
        if (!matchesTrend) return false;

        return true;
      })
      .sort((a, b) => {
        switch (deferredFilter.sortBy) {
          case 'dateDes':
            return b.createdAt - a.createdAt;
          case 'dateAsc':
            return a.createdAt - b.createdAt;
          case 'pnlDes':
            return (b.pnl || 0) - (a.pnl || 0);
          case 'pnlAsc':
            return (a.pnl || 0) - (b.pnl || 0);
          case 'assetAsc':
            return collator.compare(a.asset, b.asset);
          case 'assetDes':
            return collator.compare(b.asset, a.asset);
          case 'typeAsc':
            return collator.compare(a.type, b.type);
          case 'typeDes':
            return collator.compare(b.type, a.type);
          case 'rrAsc':
            return (a.rr || 0) - (b.rr || 0);
          case 'rrDes':
            return (b.rr || 0) - (a.rr || 0);
          case 'platformAsc':
            return collator.compare(a.platform || '', b.platform || '');
          case 'platformDes':
            return collator.compare(b.platform || '', a.platform || '');
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [trades, deferredFilter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredTrades.length]);

  const maxPage = Math.max(1, Math.ceil(filteredTrades.length / itemsPerPage));
  const effectivePage = Math.min(Math.max(1, currentPage), maxPage);

  const paginatedTrades = useMemo(() => {
    const start = (effectivePage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, effectivePage]);

  const handleFilterChange = useCallback((newFilter: TradeFilter) => {
    setFilter(newFilter);
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
            className={`flex items-center justify-center w-9 sm:w-8 h-9 sm:h-8 rounded-xl border transition-all duration-200 ${
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
              className={`flex items-center justify-center w-9 sm:w-8 h-9 sm:h-8 rounded-xl border transition-all duration-200 shrink-0 cursor-pointer ${
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2 min-w-[260px] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-xl z-50 py-2 overflow-hidden"
                >
                  <div className="px-3 py-1 text-[9px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-800 mb-1">
                    PDF RAPOR SECENEKLERI
                  </div>
                  
                  <button
                    onClick={handleDownloadWeekly}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 hover:text-blue-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar size={11} className="text-blue-400" />
                    <span>Bu Hafta Raporu İndir</span>
                  </button>
                  
                  <button
                    onClick={handleDownloadMonthly}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 hover:text-indigo-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar size={11} className="text-indigo-400" />
                    <span>Bu Ay Raporu İndir</span>
                  </button>
                  
                  <div className="border-t border-zinc-800 my-1"></div>
                  
                  <button
                    onClick={handleDownloadFiltered}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 hover:text-emerald-400 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={11} className="text-emerald-400" />
                    <span>Filtrelenmiş Rapor İndir ({filteredTrades.length})</span>
                  </button>

                  <div className="border-t border-zinc-800 my-1"></div>

                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700/80 rounded-xl px-2 py-1 text-xs text-zinc-200">
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
                        className="ml-auto shrink-0 whitespace-nowrap px-3 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                      >
                        İndir
                      </button>
                    </div>
                  </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs pt-1">
              {/* Sol Sütun: Hızlı Filtreler & Sıralama */}
              <div className="space-y-3.5 lg:border-r border-zinc-800 lg:pr-6">
                {/* Durum */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Durum</span>
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-0.5 w-full relative">
                    {(['ALL', 'WIN', 'LOSS', 'BREAKEVEN'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleFilterChange({ ...filter, status: st })}
                        className={`relative flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-colors duration-200 ease-out cursor-pointer text-center select-none ${
                          filter.status === st
                            ? st === 'WIN'
                              ? 'text-emerald-400'
                              : st === 'LOSS'
                              ? 'text-rose-400'
                              : st === 'BREAKEVEN'
                              ? 'text-amber-400'
                              : 'text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {filter.status === st && (
                          <motion.div
                            layoutId="tradeStatusFilterIndicator"
                            className={`absolute inset-0 rounded-lg border shadow-xs ${
                              st === 'WIN'
                                ? 'bg-emerald-500/15 border-emerald-500/20 shadow-emerald-500/5'
                                : st === 'LOSS'
                                ? 'bg-rose-500/15 border-rose-500/20 shadow-rose-500/5'
                                : st === 'BREAKEVEN'
                                ? 'bg-amber-500/15 border-amber-500/20 shadow-amber-500/5'
                                : 'bg-zinc-800 border-zinc-700/50'
                            }`}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className="relative z-10">{st === 'ALL' ? 'TÜMÜ' : st === 'BREAKEVEN' ? 'BE' : st}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yön */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Yön</span>
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-0.5 w-full relative">
                    {(['ALL', 'LONG', 'SHORT'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => handleFilterChange({ ...filter, type: dir })}
                        className={`relative flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-colors duration-200 ease-out cursor-pointer text-center select-none ${
                          filter.type === dir
                            ? dir === 'LONG'
                              ? 'text-emerald-400'
                              : dir === 'SHORT'
                              ? 'text-rose-400'
                              : 'text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {filter.type === dir && (
                          <motion.div
                            layoutId="tradeTypeFilterIndicator"
                            className={`absolute inset-0 rounded-lg border shadow-xs ${
                              dir === 'LONG'
                                ? 'bg-emerald-500/15 border-emerald-500/20'
                                : dir === 'SHORT'
                                ? 'bg-rose-500/15 border-rose-500/20'
                                : 'bg-zinc-800 border-zinc-700/50'
                            }`}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className="relative z-10">{dir === 'ALL' ? 'TÜMÜ' : dir}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sıralama */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Sıralama</span>
                  <CustomSelect
                    value={filter.sortBy}
                    onChange={(val) => handleFilterChange({ ...filter, sortBy: val as any })}
                    options={sortByOptions}
                    className="w-full animate-fadeIn"
                  />
                </div>
              </div>

              {/* Orta Sütun: Enstrüman & Kurulum */}
              <div className="space-y-3.5 lg:border-r border-zinc-800 lg:px-6">
                {/* Parite */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.assets || "Parite"}</span>
                  <CustomComboBox
                    value={filter.asset}
                    onChange={(val) => handleFilterChange({ ...filter, asset: val })}
                    options={assetOptions}
                    placeholder={`${definitionTitles.assets || "Parite"} Seç / Yaz`}
                    className="w-full"
                  />
                </div>

                {/* Konsept */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.concepts || "Konsept"}</span>
                  <CustomSelect
                    value={filter.concept || ''}
                    onChange={(val) => handleFilterChange({ ...filter, concept: val || undefined })}
                    options={conceptOptions}
                    placeholder={`${definitionTitles.concepts || "Konsept"} Seçin`}
                    className="w-full"
                  />
                </div>

                {/* PD ARRAY */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.confirmations || "PD ARRAY"}</span>
                  <CustomSelect
                    value={filter.confirmation || ''}
                    onChange={(val) => handleFilterChange({ ...filter, confirmation: val || undefined })}
                    options={confirmationOptions}
                    placeholder={`${definitionTitles.confirmations || "PD ARRAY"} Seçin`}
                    className="w-full"
                  />
                </div>

                {/* Setup Kalitesi / Plan Sadakati */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.planFidelities || "Kalite / Plan"}</span>
                  <CustomSelect
                    value={filter.planFidelity || ''}
                    onChange={(val) => handleFilterChange({ ...filter, planFidelity: val || undefined })}
                    options={planFidelityOptions}
                    placeholder={`${definitionTitles.planFidelities || "Setup Kalitesi"} Seçin`}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Sağ Sütun: Session & Zaman Dilimi */}
              <div className="space-y-3.5 lg:pl-6">
                {/* Session */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.sessions || "Session"}</span>
                  <CustomSelect
                    value={filter.session || ''}
                    onChange={(val) => handleFilterChange({ ...filter, session: val || undefined })}
                    options={sessionOptions}
                    placeholder={`${definitionTitles.sessions || "Session"} Seçin`}
                    className="w-full"
                  />
                </div>

                {/* Timeframes */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.timeframes || "Entry Timeframe"} / {definitionTitles.htfTimeframes || "Timeframe"}</span>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <CustomSelect
                      value={filter.timeframe || ''}
                      onChange={(val) => handleFilterChange({ ...filter, timeframe: val || undefined })}
                      options={timeframeOptions}
                      placeholder={definitionTitles.timeframes || "Entry Timeframe"}
                      className="w-full min-w-0"
                    />
                    <CustomSelect
                      value={filter.htfTimeframe || ''}
                      onChange={(val) => handleFilterChange({ ...filter, htfTimeframe: val || undefined })}
                      options={htfTimeframeOptions}
                      placeholder={definitionTitles.htfTimeframes || "Timeframe"}
                      className="w-full min-w-0"
                    />
                  </div>
                </div>

                {/* Trend Yapısı & Entry Model */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.trendTypes || "Trend"}</span>
                    <CustomSelect
                      value={filter.trend || ''}
                      onChange={(val) => handleFilterChange({ ...filter, trend: val || undefined })}
                      options={trendTypeOptions}
                      placeholder={definitionTitles.trendTypes || "Trend"}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{definitionTitles.entryModels || "Entry Model"}</span>
                    <CustomSelect
                      value={filter.entry || ''}
                      onChange={(val) => handleFilterChange({ ...filter, entry: val || undefined })}
                      options={entryModelOptions}
                      placeholder={definitionTitles.entryModels || "Entry Model"}
                      className="w-full min-w-0"
                    />
                  </div>
                </div>

                {/* Tarih Aralığı */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Tarih Aralığı</span>
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
            </div>
          </div>
        </div>
      </div>

      {/* TABLE/GRID CONTAINER */}
      {filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-zinc-800/80 border-dashed rounded-2xl bg-zinc-800/80 relative overflow-hidden my-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2.5 shadow-inner">
            <Clock size={20} className="text-zinc-400" />
          </div>
          <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest font-sans">Kayıt Bulunamadı</h4>
          <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed font-sans">
            {trades.length === 0 
              ? "Herhangi bir işlem kaydı bulunmuyor. Üst kısımdaki 'İşlem Ekle' kutusunu kullanarak ilk kaydınızı girin."
              : "Belirtilen süzgeç ölçütleriyle eşleşen işlem yok."}
          </p>
        </div>
      ) : (
        <>
          <div 
            className="relative z-0 overflow-x-auto w-full rounded-xl transform-gpu"
          >
            <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-xs font-sans whitespace-nowrap sm:table-fixed sm:min-w-[750px] block sm:table">
              <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80">
                  <th 
                    className={`py-2 px-3 font-sans select-none min-w-[130px] cursor-pointer group/th transition-colors hover:text-zinc-200 text-left ${
                      filter.sortBy === 'dateAsc' || filter.sortBy === 'dateDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[18%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'dateDes' ? 'dateAsc' : 'dateDes'})}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tarih</span>
                      <TableSortBadge sortState={filter.sortBy === 'dateAsc' ? 'asc' : filter.sortBy === 'dateDes' ? 'des' : null} />
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-3 font-sans select-none min-w-[90px] cursor-pointer group/th transition-colors hover:text-zinc-200 text-left ${
                      filter.sortBy === 'assetAsc' || filter.sortBy === 'assetDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[14%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'assetAsc' ? 'assetDes' : 'assetAsc'})}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{definitionTitles.assets || "Parite"}</span>
                      <TableSortBadge sortState={filter.sortBy === 'assetAsc' ? 'asc' : filter.sortBy === 'assetDes' ? 'des' : null} />
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-2 text-center font-sans select-none min-w-[65px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                      filter.sortBy === 'typeAsc' || filter.sortBy === 'typeDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[10%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'typeAsc' ? 'typeDes' : 'typeAsc'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Yön</span>
                      <TableSortBadge sortState={filter.sortBy === 'typeAsc' ? 'asc' : filter.sortBy === 'typeDes' ? 'des' : null} />
                    </div>
                  </th>
                  <th 
                    className={`py-2 px-2 text-center font-sans select-none min-w-[65px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                      filter.sortBy === 'rrAsc' || filter.sortBy === 'rrDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[10%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'rrDes' ? 'rrAsc' : 'rrDes'})}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>RR</span>
                      <TableSortBadge sortState={filter.sortBy === 'rrAsc' ? 'asc' : filter.sortBy === 'rrDes' ? 'des' : null} />
                    </div>
                  </th>
                  <th className={`py-2 px-2 text-center font-sans select-none min-w-[75px] ${'w-[12%]'}`}>Sonuç</th>
                  <th 
                    className={`py-2 px-3 text-right font-sans select-none min-w-[95px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                      filter.sortBy === 'pnlAsc' || filter.sortBy === 'pnlDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                    } ${'w-[16%]'}`}
                    onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'pnlDes' ? 'pnlAsc' : 'pnlDes'})}
                  >
                    <div className="flex items-center justify-end gap-1.5 w-full">
                      <span>Kâr/Zarar</span>
                      <TableSortBadge sortState={filter.sortBy === 'pnlAsc' ? 'asc' : filter.sortBy === 'pnlDes' ? 'des' : null} />
                    </div>
                  </th>
                  {true && (
                    <th 
                      className={`py-2 px-2 text-center font-sans select-none w-[12%] min-w-[75px] cursor-pointer group/th transition-colors hover:text-zinc-200 ${
                        filter.sortBy === 'platformAsc' || filter.sortBy === 'platformDes' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                      }`}
                      onClick={() => handleFilterChange({...filter, sortBy: filter.sortBy === 'platformDes' ? 'platformAsc' : 'platformDes'})}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{definitionTitles.platforms || "Platform"}</span>
                        <TableSortBadge sortState={filter.sortBy === 'platformAsc' ? 'asc' : filter.sortBy === 'platformDes' ? 'des' : null} />
                      </div>
                    </th>
                  )}
                  <th className="py-2 px-3 text-right font-sans select-none w-[8%] min-w-[60px]">İşlem</th>
                </tr>
              </thead>
              <AnimatePresence initial={false}>
                <motion.tbody
                  key={currentPage}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.8 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  style={{ willChange: "opacity" }}
                  className="block sm:table-row-group"
                >
                {paginatedTrades.map((trade, idx) => (
                  <MemoizedTradeRow 
                    key={trade.id ? `${trade.id}` : `trade-fallback-${idx}`}
                    trade={trade}
                    currency={currency}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    setTradeToDelete={setTradeToDelete}
                  />
                ))}
                {paginatedTrades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs font-bold font-sans text-zinc-500 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
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
          </div>
          {filteredTrades.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-2">
              <span className="text-[10px] text-zinc-500 font-sans">
                {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTrades.length)} / {filteredTrades.length} gösteriliyor
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Önceki
                </button>
                <button
                  disabled={currentPage * itemsPerPage >= filteredTrades.length}
                  onClick={() => setCurrentPage(p => p + 1)}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="will-change-[opacity] fixed inset-0 z-[4500] bg-zinc-950/80 flex items-center justify-center p-4"
              onClick={() => setTradeToDelete(null)}
            >
              <motion.div
                key="trade-delete-modal-content"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: "transform, opacity" }}
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
                  <span className="font-semibold text-zinc-200">{tradeToDelete.asset}</span> ({false ? (tradeToDelete.type === 'LONG' ? 'Bullish' : 'Bearish') : (tradeToDelete.type === 'LONG' ? 'Long' : 'Short')} - {false ? (tradeToDelete.platform?.toUpperCase().includes('25K') ? 'Rise Works' : 'FSL PROP DMCC') : (tradeToDelete.platform || 'PLATFORM')}) {"pozisyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."}
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
