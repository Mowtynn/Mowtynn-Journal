import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Virtuoso } from 'react-virtuoso';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Calendar as CalendarIcon, 
  Save, 
  ArrowLeft, 
  Smile, 
  Frown, 
  Meh, 
  Activity, 
  Zap, 
  Star,
  Search,
  X,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { JournalEntry, Trade } from '../types';
import { JournalCalendar } from './JournalCalendar';
import { TurkishDatePicker } from './TurkishDateTimePicker';
import { VoiceToJournalButton } from './VoiceToJournalButton';
import { useMetricMode } from '../context/MetricContext';

interface JournalViewProps {
  entries: JournalEntry[];
  trades?: Trade[];
  currency?: string;
  onSaveEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> | JournalEntry, options?: { silent?: boolean }) => void;
  onDeleteEntry: (id: string) => void;
}

const moodIcons = {
  terrible: <Activity size={15} className="text-rose-400" />,
  bad: <Frown size={15} className="text-amber-400" />,
  neutral: <Meh size={15} className="text-zinc-400" />,
  good: <Smile size={15} className="text-emerald-400" />,
  excellent: <Zap size={15} className="text-emerald-300" />,
};

const moodEmojis: Record<NonNullable<JournalEntry['mood']>, string> = {
  excellent: '⚡',
  good: '😊',
  neutral: '😐',
  bad: '🙁',
  terrible: '💥',
};

const moodLabels = {
  excellent: 'Harika / Odaklı',
  good: 'İyi / Disiplinli',
  neutral: 'Nötr / Normal',
  bad: 'Kötü / Dağınık',
  terrible: 'Berbat / FOMO',
};

const JournalView = memo(function JournalView({ entries, trades = [], currency = 'USD', onSaveEntry, onDeleteEntry }: JournalViewProps) {
  const { isRrMode } = useMetricMode();
  const getLocalDateString = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };

  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState(getLocalDateString());
  const [editMood, setEditMood] = useState<JournalEntry['mood']>('neutral');
  const [editIsFavorite, setEditIsFavorite] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  React.useEffect(() => {
    if (activeEntry) {
      const updated = entries.find(e => e.id === activeEntry.id);
      if (updated) {
        setActiveEntry(updated);
      }
    }
  }, [entries]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else if (activeEntry) {
          setActiveEntry(null);
        }
      }
    };
    if (isEditing || activeEntry) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, activeEntry]);

  const getTradesForDate = (dateStr: string) => {
    return trades.filter(t => {
      const d = new Date(t.createdAt);
      const tDateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      return tDateStr === dateStr;
    });
  };

  const renderTradesList = (dateStr: string) => {
    const dayTrades = getTradesForDate(dateStr);
    if (dayTrades.length === 0) return null;

    const totalPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalRR = dayTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const winCount = dayTrades.filter(t => t.status === 'WIN').length;

    return (
      <div className="mt-6 pt-5 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-blue-400" />
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Günün İşlemleri ({dayTrades.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
              {winCount}W / {dayTrades.length - winCount}L
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
              totalPnL > 0 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : totalPnL < 0 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {isRrMode 
                ? `${totalRR >= 0 ? '+' : ''}${totalRR.toFixed(2)}R` 
                : `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ${currency}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dayTrades.map(trade => {
            const isWin = trade.status === 'WIN';
            const isLoss = trade.status === 'LOSS';
            const pnlColor = isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
            const pnlPrefix = isWin ? '+' : isLoss ? '-' : '';
            const displayValue = isRrMode
              ? (trade.rr !== undefined && trade.rr !== null ? `${pnlPrefix}${Math.abs(trade.rr)}R` : '—')
              : (trade.pnl !== undefined ? `${pnlPrefix}${Math.abs(trade.pnl)} ${currency}` : '');
            
            return (
              <div 
                key={trade.id} 
                className="flex justify-between items-center bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 rounded-xl px-3 py-2.5 transition-colors duration-150"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isWin ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-zinc-500'}`} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-zinc-200 font-mono tracking-wider block truncate">{trade.asset || 'Bilinmiyor'}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-mono font-bold shrink-0 ${
                    trade.type === 'LONG' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {trade.type}
                  </span>
                </div>
                <div className={`text-xs font-bold font-mono ${pnlColor} shrink-0`}>
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Sort entries by date descending
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = sortedEntries;
    if (showOnlyFavorites) {
      result = result.filter(e => e.isFavorite);
    }
    if (searchDate) {
      result = result.filter(e => e.date === searchDate);
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.title && e.title.toLowerCase().includes(query)) || 
        (e.content && e.content.toLowerCase().includes(query))
      );
    }
    return result;
  }, [sortedEntries, showOnlyFavorites, searchDate, searchTerm]);

  // Modern feature: Last 7 days mood trend heatmap -> Current Week Mon-Sun
  const last7DaysMoods = useMemo(() => {
    const moods: { date: string; mood: JournalEntry['mood'] | null; shortDay: string; dayNumber: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Apply week offset
    today.setDate(today.getDate() + (weekOffset * 7));
    
    // Find Monday of the current week
    const dayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      // Find the most recently updated entry for this day that actually has a mood
      const entryDay = sortedEntries.find(e => e.date === dateStr && e.mood); 
      
      const shortDay = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      
      moods.push({
        date: dateStr,
        mood: entryDay ? entryDay.mood : null,
        shortDay,
        dayNumber: d.getDate(),
      });
    }
    return moods;
  }, [sortedEntries, weekOffset]);

  const weekRangeStr = useMemo(() => {
    if (!last7DaysMoods.length) return '';
    const d1 = new Date(last7DaysMoods[0].date);
    const d2 = new Date(last7DaysMoods[6].date);
    const m1 = d1.toLocaleDateString('tr-TR', { month: 'short' });
    const m2 = d2.toLocaleDateString('tr-TR', { month: 'short' });
    if (m1 === m2) {
      return `${d1.getDate()}-${d2.getDate()} ${m1}`;
    }
    return `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2}`;
  }, [last7DaysMoods]);

  const getMoodColor = (mood: JournalEntry['mood'] | null) => {
    switch(mood) {
      case 'excellent': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold shadow-xs';
      case 'good': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold shadow-xs';
      case 'neutral': return 'bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-bold shadow-xs';
      case 'bad': return 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold shadow-xs';
      case 'terrible': return 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold shadow-xs';
      default: return 'bg-zinc-900/70 border border-zinc-800 text-zinc-500 font-mono';
    }
  };

  const handleCreateNew = () => {
    setActiveEntry(null);
    setEditTitle('');
    setEditContent('');
    setEditDate(getLocalDateString());
    setEditMood('neutral');
    setEditIsFavorite(false);
    setIsEditing(true);
  };

  const handleEdit = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setEditTitle(entry.title || '');
    setEditContent(entry.content || '');
    setEditDate(entry.date || getLocalDateString());
    setEditMood(entry.mood || 'neutral');
    setEditIsFavorite(entry.isFavorite || false);
    setIsEditing(true);
  };

  const handleVoiceParsed = (data: any) => {
    if (data.title) setEditTitle(data.title);
    if (data.content) setEditContent(data.content);
    if (data.mood) {
      const moodEntries = Object.entries(moodLabels).map(([id, label]) => ({ id, label }));
      const moodItem = moodEntries.find(m => m.label === data.mood);
      if (moodItem) setEditMood(moodItem.id as JournalEntry["mood"]);
    }
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;

    if (activeEntry) {
      onSaveEntry({
        ...activeEntry,
        title: editTitle,
        content: editContent,
        date: editDate,
        mood: editMood,
        isFavorite: editIsFavorite,
        updatedAt: Date.now(),
      });
    } else {
      onSaveEntry({
        title: editTitle,
        content: editContent,
        date: editDate,
        mood: editMood,
        isFavorite: editIsFavorite,
      });
    }
    
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex flex-col md:flex-row h-[calc(100vh-170px)] min-h-[640px] bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-2xl overflow-hidden text-zinc-200 shadow-sm relative"
    >
      {/* LEFT SIDEBAR: Entry List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-800/80 flex flex-col shrink-0 ${isEditing && 'hidden md:flex'}`}>
        {/* Top bar */}
        <div className="px-4 py-3 shrink-0 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <CalendarIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100 leading-none">
                  GÜNLÜK
                </h2>
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {entries.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Psikoloji & İşlem Notları</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                showSearch || searchDate 
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Tarihe Göre Filtrele"
            >
              <CalendarIcon size={13} />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-[calc(100%+8px)] right-0 z-50 flex flex-col gap-2 shadow-2xl"
                >
                  <JournalCalendar 
                    entries={entries} 
                    selectedDate={searchDate} 
                    onSelectDate={(date) => { setSearchDate(date); setShowSearch(false); }} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setShowOnlyFavorites(prev => !prev)}
              className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                showOnlyFavorites 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Favorileri Göster"
            >
              <Star size={13} className={showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""} />
            </button>

            <button
              onClick={handleCreateNew}
              className="w-7.5 h-7.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Yeni Günlük Ekle"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Günlüklerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-7.5 bg-zinc-900/90 border border-zinc-800/90 focus:border-zinc-700 rounded-lg pl-7 pr-7 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(showOnlyFavorites || searchDate) && (
          <div className="px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800/60 flex items-center justify-between text-[10px] font-mono shrink-0">
            <div className="flex items-center gap-1.5 text-zinc-400">
              {showOnlyFavorites && (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star size={10} className="fill-amber-400" /> Favoriler
                </span>
              )}
              {searchDate && (
                <span className="flex items-center gap-1 text-blue-400 font-bold">
                  <CalendarIcon size={10} /> {searchDate}
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowOnlyFavorites(false); setSearchDate(''); }}
              className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer text-[10px] font-bold"
            >
              Temizle
            </button>
          </div>
        )}

        {/* WEEKLY MOOD TREND CAPSULE WIDGET */}
        <div className="px-3 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="text-[9px] font-mono font-bold text-zinc-400 mb-2 uppercase tracking-wider flex justify-between items-center">
            <span className="flex items-center gap-1">
              Haftalık Mod
              <span className="text-zinc-600 font-normal">({weekRangeStr})</span>
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800"
                title="Önceki Hafta"
              >
                <ChevronLeft size={11} />
              </button>
              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800"
                title="Sonraki Hafta"
              >
                <ChevronRight size={11} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {last7DaysMoods.map((day, i) => {
              const entryForDay = sortedEntries.find(e => e.date === day.date && e.mood);
              const isCurrentDay = day.date === getLocalDateString();
              
              return (
                <div 
                  key={i} 
                  onClick={() => {
                    if (entryForDay) {
                      setActiveEntry(entryForDay);
                      setIsEditing(false);
                    }
                  }}
                  className={`flex flex-col items-center py-1 rounded-lg transition-all ${
                    entryForDay 
                      ? 'cursor-pointer hover:bg-zinc-800/60' 
                      : 'cursor-default opacity-60'
                  } ${isCurrentDay ? 'bg-zinc-900/90 border border-zinc-800' : ''}`}
                >
                  <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase">{day.shortDay}</span>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] my-0.5 transition-colors ${getMoodColor(day.mood)}`}>
                    {day.mood ? moodEmojis[day.mood] : <span className="text-[8px] text-zinc-600 font-mono">{day.dayNumber}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIST AREA */}
        <div className="flex-1 relative overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 opacity-70 absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
              {showOnlyFavorites ? (
                <>
                  <Star size={28} className="mx-auto mb-2 text-amber-400/80 fill-amber-400/20" />
                  <p className="text-xs font-mono uppercase tracking-wider mb-1 text-amber-400 font-bold">Favori Bulunamadı</p>
                  <p className="text-[10px] text-zinc-500 max-w-[180px]">Yıldız ikonuna tıklayarak favorilerinize ekleyebilirsiniz.</p>
                </>
              ) : (
                <>
                  <CalendarIcon size={28} className="mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs font-mono uppercase tracking-wider mb-1 text-zinc-400">Günlük Boş</p>
                  <p className="text-[10px] text-zinc-500 max-w-[180px]">İlk trade günlüğünüzü oluşturmak için '+' butonuna tıklayın.</p>
                </>
              )}
            </div>
          ) : (
            <Virtuoso
              data={filteredEntries}
              className="h-full w-full"
              itemContent={(_index, entry) => (
                <div className="px-2.5 py-1.5">
                  <div
                    onClick={() => {
                      setActiveEntry(entry);
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-xl cursor-pointer border transition duration-150 relative overflow-hidden group ${
                      activeEntry?.id === entry.id && !isEditing
                        ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-xs'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider text-zinc-400">
                        <CalendarIcon size={11} className="text-zinc-500" />
                        {new Date(entry.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const nextFav = !entry.isFavorite;
                            onSaveEntry({
                              ...entry,
                              isFavorite: nextFav,
                              updatedAt: Date.now(),
                            }, { silent: true });
                            toast.success(nextFav ? "Günlük favorilere eklendi." : "Günlük favorilerden çıkarıldı.");
                          }}
                          className={`p-1 rounded-md transition-all cursor-pointer ${
                            entry.isFavorite
                              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                              : 'text-zinc-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Star size={11} className={entry.isFavorite ? "fill-amber-400" : ""} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEntryToDelete(entry);
                          }}
                          className="p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>

                        {entry.mood && (
                          <div className="text-xs shrink-0 ml-0.5">
                            {moodEmojis[entry.mood]}
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xs font-bold leading-snug mb-1 line-clamp-1 truncate font-sans text-zinc-200 group-hover:text-zinc-100">
                      {entry.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed line-clamp-2 text-zinc-500 font-sans">{entry.content}</p>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* RIGHT PANE: Editor / Viewer */}
      <div className={`flex-1 flex flex-col bg-transparent overflow-hidden relative ${!isEditing && !activeEntry ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        <AnimatePresence mode="wait">
          {!isEditing && !activeEntry ? (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex items-center justify-center p-6 text-center select-none"
            >
              <div className="opacity-60 max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3 shadow-inner">
                  <CalendarIcon size={26} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-300">Bir günlük seçin</p>
                <p className="text-[11px] text-zinc-500 mt-1 font-sans">veya yeni bir kayıt eklemek için sol üstteki '+' butonuna tıklayın.</p>
              </div>
            </motion.div>
          ) : isEditing ? (
            // EDITOR MODE
            <motion.div 
              key="editor-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full w-full"
            >
              <div className="px-5 py-3 shrink-0 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="md:hidden p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase text-blue-400 tracking-wider font-mono">
                      {activeEntry ? 'Günlüğü Düzenle' : 'Yeni Günlük Kaydı'}
                    </span>
                    {!activeEntry && (
                      <VoiceToJournalButton 
                        options={{ moods: Object.values(moodLabels) }} 
                        onParsed={handleVoiceParsed} 
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsFavorite(prev => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                      editIsFavorite
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Star size={11} className={editIsFavorite ? "fill-amber-400 text-amber-400" : ""} />
                    <span>{editIsFavorite ? "FAVORİ" : "FAVORİLE"}</span>
                  </button>

                  {activeEntry && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEntryToDelete(activeEntry);
                      }}
                      className="p-1.5 text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 font-mono transition-colors cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editTitle.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs border border-blue-500/30"
                  >
                    <Save size={13} /> Kaydet
                  </button>
                </div>
              </div>

              <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-4">
                <input
                  type="text"
                  placeholder="Günün Başlığı (Örn: FOMO Kontrolü ve London Seansı)"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold font-sans text-zinc-100 placeholder:text-zinc-600 border-none outline-none focus:ring-0 px-0 py-1"
                  autoFocus
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">Tarih</label>
                    <TurkishDatePicker
                      value={editDate}
                      onChange={(newDate) => setEditDate(newDate)}
                      className="w-full"
                      buttonClassName="h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">Ruh Hali</label>
                    <div className="grid grid-cols-5 gap-1.5 h-9">
                      {(Object.keys(moodIcons) as Array<keyof typeof moodIcons>).map(mood => {
                        const isSelected = editMood === mood;
                        return (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setEditMood(mood)}
                            className={`h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-800 border-zinc-500 text-zinc-100 shadow-xs'
                                : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/80'
                            }`}
                            title={moodLabels[mood]}
                          >
                            <span className="text-base leading-none select-none">{moodEmojis[mood]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Günün Değerlendirmesi & Psikoloji Notları
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {editContent.length} karakter
                    </span>
                  </div>
                  <textarea
                    placeholder="Bugünkü piyasa yapısı, duygu durumun, aldığın kararlar ve disiplin durumu hakkında notlarını buraya yazabilirsin..."
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-52 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition leading-relaxed resize-y font-sans"
                  />
                </div>
                
                {renderTradesList(editDate)}
              </div>
            </motion.div>
          ) : (
            // VIEW MODE
            <motion.div 
              key={`view-mode-${activeEntry?.id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full w-full"
            >
              <div className="px-5 py-3.5 shrink-0 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveEntry(null)}
                    className="md:hidden p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-mono font-bold tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    <CalendarIcon size={12} />
                    {new Date(activeEntry!.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>

                  {activeEntry!.mood && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-300">
                      <span>{moodEmojis[activeEntry!.mood]}</span>
                      <span>{moodLabels[activeEntry!.mood]}</span>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => activeEntry && handleEdit(activeEntry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all font-mono uppercase tracking-wider cursor-pointer shadow-xs"
                  >
                    <Edit3 size={12} /> DÜZENLE
                  </button>

                  <button
                    onClick={() => {
                      if (activeEntry) {
                        const nextFav = !activeEntry.isFavorite;
                        onSaveEntry({
                          ...activeEntry,
                          isFavorite: nextFav,
                          updatedAt: Date.now(),
                        }, { silent: true });
                        toast.success(nextFav ? "Günlük favorilere eklendi." : "Günlük favorilerden çıkarıldı.");
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all font-mono uppercase tracking-wider cursor-pointer border ${
                      activeEntry!.isFavorite
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <Star size={12} className={activeEntry!.isFavorite ? "fill-amber-400 text-amber-400" : ""} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (activeEntry) {
                        setEntryToDelete(activeEntry);
                      }
                    }}
                    className="flex items-center gap-1 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight font-sans">
                      {activeEntry!.title}
                    </h1>
                  </div>
                  
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 md:p-6 text-zinc-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {activeEntry!.content || <span className="italic text-zinc-500">Bu günlüğe ait bir detay yazılmamış.</span>}
                  </div>

                  {renderTradesList(activeEntry!.date)}
                  
                  <div className="pt-4 border-t border-zinc-800/80 flex justify-end items-center gap-2 text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                    <Clock size={11} />
                    <span>Son Güncelleme: {new Date(activeEntry!.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {entryToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEntryToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl overflow-hidden relative select-none"
            >
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} />
              </div>
              
              <h3 className="text-sm font-bold tracking-wide text-zinc-100 uppercase text-center mb-1 font-mono">
                Günlüğü Sil
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed">
                <strong className="text-zinc-200">"{entryToDelete.title}"</strong> başlıklı günlüğü silmek istediğinize emin misiniz?
              </p>
              
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (entryToDelete) {
                      onDeleteEntry(entryToDelete.id);
                      if (activeEntry?.id === entryToDelete.id) {
                        setActiveEntry(null);
                        setIsEditing(false);
                      }
                      setEntryToDelete(null);
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Sil</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default JournalView;
