import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Virtuoso } from 'react-virtuoso';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit3, Calendar as CalendarIcon, Save, ArrowLeft, Smile, Frown, Meh, Activity, Zap, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { JournalEntry, Trade } from '../types';
import { JournalCalendar } from './JournalCalendar';
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
  terrible: <Activity size={16} className="text-red-400" />,
  bad: <Frown size={16} className="text-orange-400" />,
  neutral: <Meh size={16} className="text-zinc-400" />,
  good: <Smile size={16} className="text-green-500" />,
  excellent: <Zap size={16} className="text-green-700" />,
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

    return (
      <div className="mt-6 mb-6">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 font-mono border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Activity size={12} /> Bugüne Ait İşlemler ({dayTrades.length})
        </h3>
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
               <div key={trade.id} className="flex justify-between items-center bg-zinc-950/40 border border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700/80 rounded-lg px-3 py-2 transition-all duration-200 ease-out cursor-pointer group shadow-sm">
                 <div className="flex items-center gap-2.5">
                   <span className={`w-1.5 h-1.5 rounded-full ${isWin ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : isLoss ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-zinc-500'} group-hover:scale-125 transition-all`}></span>
                   <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white font-mono tracking-wider transition-colors">{trade.asset || 'Bilinmiyor'}</span>
                   <span className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900/80 group-hover:bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 font-mono transition-colors">{trade.type}</span>
                 </div>
                 <div className={`text-[11px] font-bold font-mono ${pnlColor} group-hover:scale-105 transition-transform`}>
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
    return result;
  }, [sortedEntries, showOnlyFavorites, searchDate]);

  // Modern feature: Last 7 days mood trend heatmap -> Current Week Mon-Sun
  const last7DaysMoods = useMemo(() => {
    const moods: { date: string; mood: JournalEntry['mood'] | null; shortDay: string }[] = [];
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
      
      const shortDay = d.toLocaleDateString('tr-TR', { weekday: 'long' }).charAt(0).toLocaleUpperCase();
      
      moods.push({
        date: dateStr,
        mood: entryDay ? entryDay.mood : null,
        shortDay,
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
      case 'excellent': return 'bg-green-700 text-white font-black shadow-xs shadow-green-700/30';
      case 'good': return 'bg-green-500 text-zinc-950 font-black shadow-xs shadow-green-500/30';
      case 'neutral': return 'bg-zinc-700 text-zinc-100 font-bold shadow-xs';
      case 'bad': return 'bg-orange-500 text-white font-bold shadow-xs shadow-orange-500/20';
      case 'terrible': return 'bg-rose-500 text-white font-black shadow-xs shadow-rose-500/30';
      default: return 'bg-zinc-900 border border-zinc-800 text-zinc-600';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-[calc(100vh-180px)] min-h-[620px] bg-zinc-950/60 rounded-xl border border-zinc-800/80 overflow-hidden text-zinc-200 shadow-sm relative"
    >
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none z-10" />
      
      {/* LEFT SIDEBAR: Entry List */}
      <div className={`w-full md:w-1/3 border-r border-zinc-800/80 flex flex-col ${isEditing && 'hidden md:flex'}`}>
        <div className="px-4 h-[48px] shrink-0 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100 font-mono leading-none">
                GÜNLÜK
              </h2>
              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Psikoloji ve Seans Notları</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 ease-out cursor-pointer active:scale-95 shadow-sm border ${showSearch || searchDate ? 'bg-zinc-800 border-zinc-700 text-blue-400' : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'}`}
              
            >
              <CalendarIcon size={14} />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-[calc(100%+8px)] right-0 z-50 flex flex-col gap-2"
                >
                  <JournalCalendar 
                    entries={entries} 
                    selectedDate={searchDate} 
                    onSelectDate={(date) => { setSearchDate(date); setShowSearch(false); }} 
                    getMoodColor={getMoodColor}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowOnlyFavorites(prev => !prev)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 ease-out cursor-pointer active:scale-95 shadow-sm border ${
                showOnlyFavorites 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
              }`}

            >
              <Star size={14} className={showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""} />
            </button>
            <button
              onClick={handleCreateNew}
              className="w-8 h-8 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 flex items-center justify-center transition-all duration-200 ease-out cursor-pointer active:scale-95 shadow-xs backdrop-blur-sm"
              title="Yeni Günlük Ekle"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {showOnlyFavorites && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[10px] font-mono font-bold text-amber-400 shrink-0">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Star size={12} className="fill-amber-400" /> FAVORİ GÜNLÜKLER ({filteredEntries.length})
            </span>
            <button
              onClick={() => setShowOnlyFavorites(false)}
              className="text-amber-400/80 hover:text-amber-300 underline cursor-pointer text-[9px] uppercase tracking-wider"
            >
              Tümünü Göster
            </button>
          </div>
        )}

        

        {/* MODERN HEATMAP WIDGET */}
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="text-[9px] font-mono font-bold text-zinc-400 mb-2.5 uppercase tracking-widest flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              Haftalık Mod Takibi
              <span className="text-zinc-600 normal-case tracking-normal text-[10px]">({weekRangeStr})</span>
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-1 rounded bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 transition-colors"
                
              >
                <ChevronLeft size={12} />
              </button>
              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-1 rounded bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 transition-colors"
                
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1">
            {last7DaysMoods.map((day, i) => {
              const entryForDay = sortedEntries.find(e => e.date === day.date && e.mood);
              return (
                <motion.div 
                  key={i} 
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    if (entryForDay) {
                      setActiveEntry(entryForDay);
                      setIsEditing(false);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 group select-none ${entryForDay ? 'cursor-pointer' : 'cursor-default'}`} 
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] transition-colors duration-200 ${getMoodColor(day.mood)}`}>
                    {day.mood ? moodEmojis[day.mood] : <span className="text-[9px] text-zinc-600 font-mono">•</span>}
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 font-mono group-hover:text-zinc-300 transition-colors">{day.shortDay}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 opacity-70 absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
              {showOnlyFavorites ? (
                <>
                  <Star size={32} className="mx-auto mb-3 text-amber-400/80 fill-amber-400/30" />
                  <p className="text-xs font-mono uppercase tracking-widest mb-1 text-amber-400 font-bold">Favori Günlük Bulunamadı</p>
                  <p className="text-[10px] text-zinc-400 max-w-[200px]">Günlüklerin yanındaki yıldız ikonuna tıklayarak favorilerinize ekleyebilirsiniz.</p>
                </>
              ) : (
                <>
                  <CalendarIcon size={32} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-xs font-mono uppercase tracking-widest mb-1 text-zinc-400">Günlük Boş</p>
                  <p className="text-[10px] text-zinc-500 max-w-[200px]">Psikolojinizi ve trade seanslarınızı kaydetmeye başlayın.</p>
                </>
              )}
            </div>
          ) : (
            <Virtuoso
              data={filteredEntries}
              className="h-full w-full"
              itemContent={(_index, entry) => (
                <div className="px-3 pt-3">
                  <div
                    onClick={() => {
                      setActiveEntry(entry);
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-xl cursor-pointer border transition duration-200 ease-out relative overflow-hidden group ${
                      activeEntry?.id === entry.id && !isEditing
                        ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-md'
                        : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700/80 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider opacity-70">
                        <CalendarIcon size={12} />
                        {new Date(entry.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="flex items-center gap-1.5">
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
                          className={`p-1 rounded-md transition cursor-pointer active:scale-90 ${
                            entry.isFavorite
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
                              : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100'
                          }`}
                          
                        >
                          <Star size={12} className={entry.isFavorite ? "fill-amber-400" : ""} />
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEntryToDelete(entry);
                            }}
                            className="p-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded-md transition cursor-pointer"
                            
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {entry.mood && (
                          <div className="p-1.5 rounded-full bg-zinc-800/30 border border-zinc-800 shadow-sm font-bold flex items-center justify-center relative group-hover:scale-110 transition-transform">
                            {moodIcons[entry.mood]}
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold leading-tight mb-2 line-clamp-1 truncate font-sans text-white group-hover:text-blue-400 transition-colors">
                      {entry.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed line-clamp-2 text-zinc-400 font-sans">{entry.content}</p>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Editor / Viewer */}
      <div className={`flex-1 flex flex-col bg-zinc-950/20 overflow-hidden relative ${!isEditing && !activeEntry ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
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
              <div className="opacity-40">
                <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center text-zinc-500 mx-auto mb-4 shadow-inner">
                  <CalendarIcon size={32} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest font-mono text-zinc-300">Bir günlük girdisi seçin</p>
                <p className="text-[11px] text-zinc-500 mt-1 font-sans">veya yeni bir kayıt eklemek için '+' butonuna tıklayın.</p>
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
              <div className="px-4 h-[48px] shrink-0 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="md:hidden p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex items-center gap-3">
                  <div className="text-[11px] font-black uppercase text-blue-400 tracking-widest font-mono">
                    {activeEntry ? 'Günlüğü Düzenle' : 'Yeni Günlük'}
                  </div>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border transition cursor-pointer active:scale-95 ${
                      editIsFavorite
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                    
                  >
                    <Star size={12} className={editIsFavorite ? "fill-amber-400 text-amber-400" : ""} />
                    <span>{editIsFavorite ? "FAVORİ" : "FAVORİLE"}</span>
                  </button>
                  {activeEntry && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEntryToDelete(activeEntry);
                      }}
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer active:scale-95"
                      
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-zinc-400 hover:text-zinc-200 font-mono transition"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editTitle.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-xl text-[11px] font-bold font-mono tracking-wider uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs border border-blue-500/30 active:scale-95 backdrop-blur-sm"
                  >
                    <Save size={13} /> Kaydet
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4">
                <input
                  type="text"
                  placeholder="Günün Özeti / Başlık"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold font-sans text-white placeholder-zinc-600 border-none outline-none focus:ring-0 px-1 py-1.5"
                  autoFocus
                />
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Tarih</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full h-[42px] bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-blue-500/80 transition font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Psikoloji / Ruh Hali</label>
                    <div className="flex items-center h-[42px] gap-1 bg-zinc-950 border border-zinc-800/80 rounded-lg p-1 overflow-x-auto no-scrollbar">
                      {(Object.keys(moodIcons) as Array<keyof typeof moodIcons>).map(mood => (
                        <motion.button
                          key={mood}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setEditMood(mood)}
                          className={`flex-1 p-2 rounded-lg flex items-center justify-center transition ${
                            editMood === mood
                              ? 'bg-zinc-800 border border-zinc-700/80 shadow-sm'
                              : 'hover:bg-zinc-900 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'
                          }`}
                        >
                          {moodIcons[mood]}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Günün Notları & Değerlendirme</label>
                  <textarea
                    placeholder="Bugün piyasa nasıldı? Psikolojin nasıldı? Hangi hataları yaptın veya neleri doğru yaptın? Tüm detayları buraya yazabilirsin..."
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-48 bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/80 transition leading-relaxed resize-y font-sans"
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
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setActiveEntry(null)}
                        className="md:hidden p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-400"
                        
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 font-mono font-bold tracking-wider uppercase bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                        <CalendarIcon size={12} />
                        {new Date(activeEntry!.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>

                      {activeEntry!.mood && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider uppercase bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 text-zinc-300">
                          {moodIcons[activeEntry!.mood]} {moodLabels[activeEntry!.mood]}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                      <button
                        onClick={() => activeEntry && handleEdit(activeEntry)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-bold transition-all duration-200 font-mono uppercase tracking-wider cursor-pointer active:scale-95 shadow-xs backdrop-blur-sm"
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
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition font-mono uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm border ${
                          activeEntry!.isFavorite
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700/80 hover:text-zinc-200'
                        }`}
                        
                      >
                        <Star size={12} className={activeEntry!.isFavorite ? "fill-amber-400 text-amber-400" : ""} />
                        <span>FAVORİ</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (activeEntry) {
                            setEntryToDelete(activeEntry);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold transition font-mono uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
                        
                      >
                        <Trash2 size={12} /> SİL
                      </button>
                    </div>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">{activeEntry!.title}</h1>
                  
                  <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-p:text-zinc-300 prose-headings:text-white prose-a:text-blue-400">
                    {activeEntry!.content.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="whitespace-pre-wrap mb-4 font-sans text-base">{paragraph}</p>
                    ))}
                  </div>

                  {renderTradesList(activeEntry!.date)}
                  
                  <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-end items-center gap-4 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                    <span>Son Güncelleme: {new Date(activeEntry!.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
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
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[1200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEntryToDelete(null)}
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
                Günlük Kaydını Sil
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-mono">
                <span className="font-semibold text-zinc-200">"{entryToDelete.title}"</span> başlıklı günlüğü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
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
                  className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Trash2 size={15} />
                  <span>Evet, Sil</span>
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
