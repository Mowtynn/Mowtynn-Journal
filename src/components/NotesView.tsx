import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  ArrowLeft, 
  Calendar, 
  Save, 
  Pin, 
  X, 
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Note } from '../types';
import { VoiceToNoteButton } from './VoiceToNoteButton';

interface NotesViewProps {
  notes: Note[];
  onSaveNote: (note: Note, options?: { silent?: boolean }) => void;
  onDeleteNote: (id: string) => void;
}

const NotesView = memo(function NotesView({ notes, onSaveNote, onDeleteNote }: NotesViewProps) {
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PINNED'>('ALL');
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  React.useEffect(() => {
    if (activeNote) {
      const updated = notes.find(n => n.id === activeNote.id);
      if (updated) {
        setActiveNote(updated);
      }
    }
  }, [notes]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else if (activeNote) {
          setActiveNote(null);
        }
      }
    };
    if (isEditing || activeNote) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, activeNote]);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (activeFilter === 'PINNED') {
      result = result.filter(n => n.isPinned);
    }
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(lowerSearch)) || 
        (n.content && n.content.toLowerCase().includes(lowerSearch))
      );
    }
    // Sort pinned notes first, then by updatedAt
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchTerm, activeFilter]);

  const pinnedCount = useMemo(() => notes.filter(n => n.isPinned).length, [notes]);

  const handleTogglePin = (note: Note, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPinned = !note.isPinned;
    onSaveNote({ ...note, isPinned: nextPinned, updatedAt: Date.now() }, { silent: true });
    toast.success(nextPinned ? "Not başa sabitlendi." : "Not sabitlemesi kaldırıldı.");
  };

  const handleAddNew = () => {
    setActiveNote(null);
    setEditTitle('');
    setEditContent('');
    setIsEditing(true);
  };

  const handleVoiceParsed = (data: any) => {
    setEditTitle(data.title || '');
    setEditContent(data.content || '');
    setIsEditing(true);
    setActiveNote(null);
  };

  const executeSave = () => {
    if (!editTitle.trim() && !editContent.trim()) {
      setIsEditing(false);
      return;
    }

    const noteId = activeNote ? activeNote.id : '';
    const now = Date.now();
    
    const newNote: Note = {
      id: noteId,
      title: editTitle.trim() || 'İsimsiz Not',
      content: editContent,
      createdAt: activeNote ? activeNote.createdAt : now,
      updatedAt: now,
      isPinned: activeNote ? activeNote.isPinned : false,
    };

    onSaveNote(newNote);
    setIsEditing(false);
    setActiveNote(null);
  };

  const executeDelete = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onDeleteNote(id);
    if (activeNote?.id === id) {
      setActiveNote(null);
      setIsEditing(false);
    }
  };

  const handleOpenNote = (note: Note) => {
    setActiveNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setIsEditing(false);
  };

  const formatDateStr = (ms: number) => {
    return new Date(ms).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <AnimatePresence mode="wait">
        {isEditing ? (
          // EDIT / CREATE MODE
          <motion.div 
            key="note-edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full flex flex-col space-y-4"
          >
            <div className="bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
                  title="Geri Dön"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    placeholder="Not Başlığı (Örn: Fair Value Gap Stratejisi)"
                    className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-100 outline-none placeholder:text-zinc-600 font-sans tracking-tight"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus={!activeNote}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!activeNote && (
                    <VoiceToNoteButton onParsed={handleVoiceParsed} />
                  )}
                  {activeNote && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNoteToDelete(activeNote);
                      }}
                      className="p-2 text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                      title="Notu Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button 
                    onClick={executeSave}
                    disabled={!editTitle.trim() && !editContent.trim()}
                    className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-xs border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    Kaydet
                  </button>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden focus-within:border-zinc-700 transition-all flex flex-col min-h-[460px] shadow-sm">
              <textarea
                placeholder="Konsept detayları, grafik analizleri, kurallar veya strateji notlarını buraya yazabilirsin..."
                className="w-full flex-1 bg-transparent text-zinc-200 p-5 sm:p-6 outline-none resize-none placeholder:text-zinc-600 leading-relaxed font-sans text-sm min-h-[380px]"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="p-3 px-5 text-[10px] text-zinc-500 font-mono font-bold tracking-wider uppercase bg-zinc-900/50 border-t border-zinc-800/80 flex items-center justify-between">
                <span>{editContent.length} karakter • {editContent.trim() ? editContent.trim().split(/\s+/).length : 0} kelime</span>
                <span>{activeNote ? `Son Güncelleme: ${formatDateStr(activeNote.updatedAt)}` : 'Yeni Not'}</span>
              </div>
            </div>
          </motion.div>
        ) : activeNote ? (
          // READ / DETAIL MODE
          <motion.div 
            key="note-read"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full flex flex-col space-y-4"
          >
            <div className="bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveNote(null)}
                    className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
                    title="Listeye Dön"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight truncate font-sans">
                        {activeNote.title}
                      </h2>
                      {activeNote.isPinned && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 shrink-0">
                          <Pin size={10} className="fill-current" />
                          SABİTLENDİ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                      <Calendar size={11} className="text-zinc-500" />
                      Son Güncelleme: {formatDateStr(activeNote.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={(e) => handleTogglePin(activeNote, e)}
                    className={`p-2 rounded-xl transition-all cursor-pointer border ${
                      activeNote.isPinned 
                        ? 'text-blue-400 bg-blue-500/15 border-blue-500/30' 
                        : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                    }`}
                    title={activeNote.isPinned ? "Sabitlemeyi Kaldır" : "Başa Sabitle"}
                  >
                    <Pin size={15} className={activeNote.isPinned ? "fill-current" : ""} />
                  </button>
                  <button 
                    onClick={() => {
                      setNoteToDelete(activeNote);
                    }}
                    className="p-2 text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                    title="Notu Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-xs border border-blue-500/30"
                  >
                    <Edit3 size={14} />
                    Düzenle
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 sm:p-8 min-h-[460px] overflow-y-auto shadow-sm">
              <div className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans break-words select-text">
                {activeNote.content || <span className="italic text-zinc-500">Bu notta henüz bir içerik bulunmuyor.</span>}
              </div>
            </div>
          </motion.div>
        ) : (
          // LIST / GRID MODE
          <motion.div 
            key="note-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full space-y-4"
          >
            {/* Header bar */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100">
                        Konsept & Notlar
                      </h2>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {notes.length} NOT
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">
                      Kişisel analizler, trade konseptleri ve strateji kayıtları.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* FILTER PILLS */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 relative">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('ALL')}
                      className={`relative px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer select-none ${
                        activeFilter === 'ALL'
                          ? 'text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {activeFilter === 'ALL' && (
                        <motion.div
                          layoutId="activeNotesFilterIndicator"
                          className="absolute inset-0 bg-zinc-800 rounded-lg shadow-xs"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">Tümü ({notes.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('PINNED')}
                      className={`relative px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1 select-none ${
                        activeFilter === 'PINNED'
                          ? 'text-blue-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {activeFilter === 'PINNED' && (
                        <motion.div
                          layoutId="activeNotesFilterIndicator"
                          className="absolute inset-0 bg-blue-500/20 border border-blue-500/30 rounded-lg shadow-xs"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        <Pin size={10} className={activeFilter === 'PINNED' ? 'fill-current' : ''} />
                        Sabitlenenler ({pinnedCount})
                      </span>
                    </button>
                  </div>

                  {/* SEARCH INPUT */}
                  <div className="relative w-full sm:w-56">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Notlarda ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-8 bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl pl-7 pr-7 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none transition font-sans"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <VoiceToNoteButton onParsed={handleVoiceParsed} />

                  <button 
                    onClick={handleAddNew}
                    className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-3.5 py-1.5 h-8 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-blue-500/30 shrink-0"
                  >
                    <Plus size={14} />
                    Yeni Not
                  </button>
                </div>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-12 text-center flex flex-col items-center shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
                  <FileText size={24} />
                </div>
                <h3 className="text-xs font-bold text-zinc-200 mb-1 uppercase tracking-wider font-mono">Henüz Not Eklenmedi</h3>
                <p className="text-zinc-500 text-xs max-w-sm mb-5 font-sans leading-relaxed">
                  Öğrendiğiniz işlem stratejilerini, analiz kurallarını ve konseptleri buraya kaydedebilirsiniz.
                </p>
                <button 
                  onClick={handleAddNew}
                  className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  İlk Notu Yaz
                </button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                <p className="text-xs font-mono font-bold text-zinc-500">Aranan kriterde not bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className={`group relative bg-zinc-950/60 border ${
                      note.isPinned 
                        ? 'border-blue-500/30 bg-blue-500/[0.02]' 
                        : 'border-zinc-800/80'
                    } hover:border-zinc-700 hover:bg-zinc-900/60 hover:-translate-y-0.5 rounded-2xl p-4.5 cursor-pointer overflow-hidden flex flex-col transition-all duration-150 ease-out shadow-xs min-h-[160px]`}
                  >
                    <div className="flex justify-between items-start mb-2 w-full min-w-0 pr-14">
                      <h3 className="text-sm font-bold text-zinc-100 tracking-tight font-sans break-words w-full line-clamp-2">
                        {note.title}
                      </h3>
                      
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                        <button 
                          onClick={(e) => handleTogglePin(note, e)}
                          className={`p-1.5 rounded-md transition-all cursor-pointer ${
                            note.isPinned 
                              ? 'text-blue-400 bg-blue-500/15' 
                              : 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-800'
                          }`}
                          title={note.isPinned ? "Sabitlemeyi Kaldır" : "Başa Sabitle"}
                        >
                          <Pin size={12} className={note.isPinned ? "fill-current" : ""} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNoteToDelete(note);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap flex-1 font-sans break-words line-clamp-3 overflow-hidden mb-3">
                      {note.content || <span className="italic text-zinc-600">Boş içerik...</span>}
                    </p>

                    <div className="mt-auto pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar size={10} className="text-zinc-500" />
                        {formatDateStr(note.updatedAt)}
                      </span>
                      
                      <span className="opacity-0 group-hover:opacity-100 transition-all text-blue-400 font-bold flex items-center gap-0.5 font-mono">
                        Oku →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {noteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setNoteToDelete(null)}
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
                Notu Sil
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed">
                <strong className="text-zinc-200">"{noteToDelete.title}"</strong> başlıklı notu silmek istediğinize emin misiniz?
              </p>
              
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (noteToDelete) {
                      executeDelete(noteToDelete.id);
                      setNoteToDelete(null);
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
    </div>
  );
});

export default NotesView;
