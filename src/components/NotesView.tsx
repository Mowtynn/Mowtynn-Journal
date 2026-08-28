import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, FileText, ArrowLeft, Calendar, Save, Pin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Note } from '../types';
import { VoiceToNoteButton } from './VoiceToNoteButton';

interface NotesViewProps {
  notes: Note[];
  onSaveNote: (note: Note, options?: { silent?: boolean }) => void;
  onDeleteNote: (id: string) => void;
}

const NotesView = memo(function NotesView({ notes, onSaveNote, onDeleteNote }: NotesViewProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.02,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 30,
      } as any
    },
  };

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredNotes = React.useMemo(() => {
    let result = notes;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(n => n.title.toLowerCase().includes(lowerSearch) || n.content.toLowerCase().includes(lowerSearch));
    }
    // Sort pinned notes first, then by updatedAt
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchTerm]);

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

  // Read / View Mode
  return (
    <>
    <AnimatePresence mode="wait">
      {isEditing ? (
        <motion.div 
          key="note-edit"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full flex flex-col pt-2 max-w-4xl mx-auto space-y-4"
        >
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-zinc-400 hover:text-white transition-all duration-200 ease-out cursor-pointer active:scale-95 shrink-0"
                title="Geri Dön"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <input 
                  type="text" 
                  placeholder="Not Başlığı (Örn: BTC Konsepti)"
                  className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-100 outline-none placeholder:text-zinc-600 font-sans tracking-tight"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus={!activeNote}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeNote && (
                  <button
                    onClick={(e) => executeDelete(activeNote.id, e)}
                    className="p-2.5 text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer active:scale-95"
                    title="Notu Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={executeSave}
                  className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer shadow-xs border border-blue-500/30 active:scale-95 backdrop-blur-sm"
                >
                  <Save size={15} />
                  Kaydet
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 relative rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden focus-within:border-blue-500/60 transition-all duration-200 ease-out flex flex-col min-h-[440px] shadow-sm">
            <textarea
              placeholder="Konseptinizi, düşüncelerinizi veya analiz notlarınızı buraya yazın..."
              className="w-full flex-1 bg-transparent text-zinc-200 p-6 outline-none resize-none placeholder:text-zinc-600 leading-relaxed font-sans text-sm"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="p-3 px-5 text-right text-[10px] text-zinc-500 font-mono font-bold tracking-wider uppercase bg-zinc-900 border-t border-zinc-800 flex items-center justify-end">
              <span>{activeNote ? `Son Güncelleme: ${formatDateStr(activeNote.updatedAt)}` : 'Yeni Kayıt'}</span>
            </div>
          </div>
        </motion.div>
      ) : activeNote ? (
        <motion.div 
          key="note-read"
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full flex flex-col pt-2 max-w-4xl mx-auto space-y-4"
        >
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setActiveNote(null)}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-zinc-400 hover:text-white transition-all duration-200 ease-out cursor-pointer shrink-0 active:scale-95"
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
                  className={`p-2.5 rounded-xl transition-all duration-200 ease-out cursor-pointer border active:scale-95 ${
                    activeNote.isPinned 
                      ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' 
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border-zinc-800 hover:border-zinc-700/80'
                  }`}
                  title={activeNote.isPinned ? "Sabitlemeyi Kaldır" : "Başa Sabitle"}
                >
                  <Pin size={16} className={activeNote.isPinned ? "fill-current" : ""} />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNoteToDelete(activeNote);
                  }}
                  className="p-2.5 text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer active:scale-95"
                  title="Notu Sil"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer shadow-xs border border-blue-500/30 active:scale-95 backdrop-blur-sm"
                >
                  <Edit3 size={15} />
                  Düzenle
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-8 min-h-[440px] overflow-y-auto shadow-sm">
            <div className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans break-words select-text">
              {activeNote.content || <span className="italic text-zinc-500">Bu notta henüz bir içerik bulunmuyor.</span>}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="note-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 max-w-6xl mx-auto"
        >
          {/* Header bar */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100 font-mono">
                      Konsept & Notlar
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {notes.length} NOT
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Kişisel işlem günlüğü, konseptler ve analiz kayıtları.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* SEARCH INPUT */}
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    placeholder="Notlarda ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 bg-zinc-900/80 border border-zinc-800 focus:border-blue-500/60 rounded-xl pl-3 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none transition font-sans"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <VoiceToNoteButton onParsed={handleVoiceParsed} />
                  <button 
                    onClick={handleAddNew}
                    className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-4 py-2 h-9 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ease-out cursor-pointer shadow-xs border border-blue-500/30 active:scale-95 shrink-0 backdrop-blur-sm"
                  >
                    <Plus size={15} />
                    Yeni
                  </button>
                </div>
              </div>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-12 text-center flex flex-col items-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                <FileText size={28} />
              </div>
              <h3 className="text-[11px] font-black text-zinc-300 mb-1.5 uppercase tracking-wider font-mono">KAYIT BULUNAMADI</h3>
              <p className="text-zinc-500 text-xs max-w-sm mb-6 font-sans leading-relaxed">Trade konseptlerinizi veya onaylı işlemlerinizi listelemeye başlayın.</p>
              <button 
                onClick={handleAddNew}
                className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-5 py-2.5 rounded-xl border border-blue-500/30 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95 backdrop-blur-sm"
              >
                <Plus size={14} />
                İlk Notu Yaz
              </button>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
              <p className="text-[11px] font-mono font-bold text-zinc-500">Aranan kriterde not bulunamadı.</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    whileHover={{ y: -2, transition: { duration: 0.18, ease: "easeOut" as any } }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleOpenNote(note)}
                    className={`group relative bg-zinc-950/60 border ${
                      note.isPinned ? 'border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-zinc-950/60 to-zinc-950/60' : 'border-zinc-800/80'
                    } hover:border-blue-500/40 rounded-xl p-5 cursor-pointer overflow-hidden flex flex-col transition-all duration-200 ease-out shadow-sm hover:shadow-md min-h-[170px]`}
                  >
                    {note.isPinned && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />
                    )}

                    <div className="flex justify-between items-start mb-2.5 w-full min-w-0 pr-14">
                      <h3 className="text-sm font-bold text-zinc-100 tracking-tight font-sans break-words w-full line-clamp-2">
                        {note.title}
                      </h3>
                      
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/80">
                        <button 
                          onClick={(e) => handleTogglePin(note, e)}
                          className={`p-1.5 rounded-lg transition-colors duration-200 ease-out cursor-pointer ${
                            note.isPinned 
                              ? 'text-blue-400 bg-blue-500/15' 
                              : 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-800'
                          }`}
                          
                        >
                          <Pin size={13} className={note.isPinned ? "fill-current" : ""} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNoteToDelete(note);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors duration-200 ease-out cursor-pointer"
                          
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap flex-1 font-sans break-words line-clamp-4 overflow-hidden mb-3">
                      {note.content || <span className="italic opacity-30">Boş içerik...</span>}
                    </p>

                    <div className="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 font-mono">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Calendar size={11} className="text-zinc-500" />
                        {formatDateStr(note.updatedAt)}
                      </span>
                      
                      <span className="opacity-0 group-hover:opacity-100 transition-colors duration-200 ease-out text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5">
                        OKU →
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
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
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[1200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNoteToDelete(null)}
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
              Notu Sil
            </h3>
            
            <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-mono">
              <span className="font-semibold text-zinc-200">"{noteToDelete.title}"</span> başlıklı notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
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
    </>
  );
});

export default NotesView;
