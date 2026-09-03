import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Award, DollarSign, Calendar, Upload, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Certificate } from '../types';
import { TurkishDatePicker } from './TurkishDateTimePicker';

interface CertificatesViewProps {
  certificates: Certificate[];
  onSaveCertificate: (certificate: Certificate | Omit<Certificate, 'id' | 'createdAt'>) => void;
  onDeleteCertificate: (id: string) => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export function CertificatesView({ certificates, onSaveCertificate, onDeleteCertificate }: CertificatesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<'PHASE' | 'PAYOUT'>('PHASE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phases = useMemo(() => certificates.filter(c => c.type === 'PHASE').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [certificates]);
  const payouts = useMemo(() => certificates.filter(c => c.type === 'PAYOUT').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [certificates]);

  const [phasesPage, setPhasesPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  const totalPhasesPages = Math.max(1, Math.ceil(phases.length / ITEMS_PER_PAGE));
  const totalPayoutsPages = Math.max(1, Math.ceil(payouts.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (phasesPage > totalPhasesPages) setPhasesPage(totalPhasesPages);
  }, [phasesPage, totalPhasesPages]);

  useEffect(() => {
    if (payoutsPage > totalPayoutsPages) setPayoutsPage(totalPayoutsPages);
  }, [payoutsPage, totalPayoutsPages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (certToDelete) {
          setCertToDelete(null);
        } else if (selectedImage) {
          setSelectedImage(null);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    if (isModalOpen || selectedImage || certToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, selectedImage, certToDelete]);

  const paginatedPhases = useMemo(() => phases.slice((phasesPage - 1) * ITEMS_PER_PAGE, phasesPage * ITEMS_PER_PAGE), [phases, phasesPage]);
  const paginatedPayouts = useMemo(() => payouts.slice((payoutsPage - 1) * ITEMS_PER_PAGE, payoutsPage * ITEMS_PER_PAGE), [payouts, payoutsPage]);

  const totalPayouts = useMemo(() => payouts.reduce((sum, p) => sum + (p.amount || 0), 0), [payouts]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          while (dataUrl.length > 100000 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          setImage(dataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    
    let parsedAmount: number | undefined = undefined;
    if (activeType === 'PAYOUT' && amount) {
      const cleanStr = amount.toString().replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleanStr);
      if (!isNaN(num)) {
        parsedAmount = num;
      }
    }

    onSaveCertificate({
      title: title.trim(),
      type: activeType,
      date: date || new Date().toISOString().split('T')[0],
      amount: parsedAmount,
      image,
    });
    
    setIsModalOpen(false);
    setTitle('');
    setAmount('');
    setImage(null);
  };

  return (
    <div className="relative w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">Geçilen Fonlar</p>
              <h3 className="text-2xl font-black text-white">{phases.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">Toplam Payout</p>
              <h3 className="text-2xl font-black text-white">${totalPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full h-full min-h-[100px] bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 border-dashed rounded-2xl flex flex-col items-center justify-center text-blue-400 transition-all duration-200 ease-out group cursor-pointer"
          >
            <Plus size={24} className="mb-2 transition-colors" />
            <span className="font-bold tracking-wide">Yeni Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4 h-full">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2 shrink-0 tracking-wide uppercase">
            <Award className="text-blue-400" size={16} />
            Geçilen Fonlar
          </h2>
          {phases.length === 0 ? (
            <div className="text-center py-12 text-[11px] font-mono font-bold text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800/60 flex-1 flex flex-col items-center justify-center">
              Henüz fon eklenmemiş.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-[450px] content-start">
              {paginatedPhases.map(cert => (
                <CertificateCard key={cert.id} cert={cert} onDelete={() => setCertToDelete(cert)} onImageClick={setSelectedImage} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5 mt-auto shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
              <span>Toplam</span>
              <span className="text-zinc-200 font-semibold">{phases.length}</span>
              <span>Fon</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-400 tabular-nums flex items-center leading-none">
                Sayfa: {phasesPage}/{totalPhasesPages}
              </span>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPhasesPage(prev => Math.max(1, prev - 1))}
                  disabled={phasesPage <= 1}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft size={13} />
                </button>
                <div className="w-px h-3.5 bg-zinc-800" />
                <button
                  type="button"
                  onClick={() => setPhasesPage(prev => Math.min(totalPhasesPages, prev + 1))}
                  disabled={phasesPage >= totalPhasesPages}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                  title="Sonraki Sayfa"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 h-full">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-2 shrink-0">
            <DollarSign className="text-emerald-400" size={16} />
            Payoutlar
          </h2>
          {payouts.length === 0 ? (
            <div className="text-center py-12 text-xs font-medium text-zinc-500 bg-zinc-900/60 rounded-2xl border border-zinc-800/60 flex-1 flex flex-col items-center justify-center">
              Henüz payout eklenmemiş.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-[450px] content-start">
              {paginatedPayouts.map(cert => (
                <CertificateCard key={cert.id} cert={cert} onDelete={() => setCertToDelete(cert)} onImageClick={setSelectedImage} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5 mt-auto shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
              <span>Toplam</span>
              <span className="text-zinc-200 font-semibold">{payouts.length}</span>
              <span>Payout</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-400 tabular-nums flex items-center leading-none">
                Sayfa: {payoutsPage}/{totalPayoutsPages}
              </span>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPayoutsPage(prev => Math.max(1, prev - 1))}
                  disabled={payoutsPage <= 1}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft size={13} />
                </button>
                <div className="w-px h-3.5 bg-zinc-800" />
                <button
                  type="button"
                  onClick={() => setPayoutsPage(prev => Math.min(totalPayoutsPages, prev + 1))}
                  disabled={payoutsPage >= totalPayoutsPages}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                  title="Sonraki Sayfa"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[1200] overflow-y-auto bg-zinc-950/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl my-auto flex flex-col max-h-[88vh]"
            >
              <div className="flex justify-between items-center pb-3.5 mb-4 border-b border-zinc-700/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                    activeType === 'PHASE' 
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' 
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  }`}>
                    {activeType === 'PHASE' ? <Award size={15} /> : <DollarSign size={15} />}
                  </div>
                  <h3 className="text-sm font-bold font-mono tracking-wide text-zinc-100 uppercase">
                    {activeType === 'PHASE' ? 'Yeni Fon Ekle' : 'Yeni Payout Ekle'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40 hover:border-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Kapat"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="flex bg-zinc-950/60 border border-zinc-700/50 rounded-xl p-1 mb-4 shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveType('PHASE')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold tracking-wider uppercase rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeType === 'PHASE'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <Award size={13} />
                  <span>Fon</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType('PAYOUT')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold tracking-wider uppercase rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeType === 'PAYOUT'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <DollarSign size={13} />
                  <span>Payout</span>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3.5 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={activeType === 'PHASE' ? 'Örn: FTMO Fonu 100K' : 'Örn: FTMO 1. Payout'}
                    className="w-full bg-zinc-950/60 border border-zinc-700/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>

                <div className={`grid ${activeType === 'PAYOUT' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                      Tarih
                    </label>
                    <TurkishDatePicker
                      value={date}
                      onChange={(newDate) => setDate(newDate)}
                      className="w-full"
                    />
                  </div>
                  {activeType === 'PAYOUT' && (
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                        Miktar ($)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-zinc-950/60 border border-zinc-700/50 rounded-xl pl-7 pr-3.5 py-2.5 text-xs font-mono text-emerald-400 placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 transition-colors"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">$</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                    Ekran Görüntüsü
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200 ${
                      image 
                        ? 'border-blue-500/40 bg-blue-500/5' 
                        : 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/60'
                    }`}
                  >
                    {image ? (
                      <div className="relative w-full group">
                        <img src={image} alt="Preview" className="w-full h-36 object-cover rounded-lg border border-zinc-700/40" />
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImage(null); }}
                          className="absolute top-2 right-2 bg-zinc-900/90 hover:bg-rose-500 text-zinc-300 hover:text-white p-1.5 rounded-lg border border-zinc-700 transition-colors cursor-pointer shadow-md"
                          title="Görseli Kaldır"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-zinc-500 flex flex-col items-center py-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-2">
                          <Upload size={18} />
                        </div>
                        <p className="font-mono text-xs font-semibold text-zinc-300">Sertifika veya Payout görseli yükle</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">Tıklayın veya sürükleyin (PNG, JPG)</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-3.5 mt-3 border-t border-zinc-700/40 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title || (activeType === 'PAYOUT' && !amount)}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 font-mono text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-zinc-900/80 border border-zinc-800 p-2 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              src={selectedImage}
              alt="Sertifika"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {certToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1300]"
            onClick={() => setCertToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              
              <h3 className="text-base font-bold tracking-wide text-zinc-100 uppercase text-center mb-2">
                {certToDelete.type === 'PAYOUT' ? 'Payout Kaydını Sil' : 'Fon Sertifikasını Sil'}
              </h3>
              
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-mono">
                <span className="font-semibold text-zinc-200">"{certToDelete.title}"</span> kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCertToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl border border-zinc-700/50 transition-colors duration-200 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (certToDelete) {
                      onDeleteCertificate(certToDelete.id);
                      setCertToDelete(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  <span>Evet, Sil</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CertificateCard({ cert, onDelete, onImageClick }: { cert: Certificate, onDelete: () => void, onImageClick: (url: string) => void }) {
  const isPayout = cert.type === 'PAYOUT';

  return (
    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden group hover:border-zinc-700/80 transition-all duration-200 ease-out relative flex flex-col h-[205px] shadow-sm hover:shadow-md">
      {/* Tip Etiketi (Sol Üst Rozet) */}
      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider backdrop-blur-md border ${
          isPayout 
            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-950/50' 
            : 'bg-blue-950/80 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-950/50'
        }`}>
          {isPayout ? <DollarSign size={10} className="stroke-[2.5]" /> : <Award size={10} className="stroke-[2.5]" />}
          {isPayout ? 'Payout' : 'Fon'}
        </span>
      </div>

      {/* Sil Butonu (Sağ Üst) */}
      <button 
        type="button"
        onClick={onDelete}
        className="absolute top-2.5 right-2.5 bg-zinc-950/80 hover:bg-red-500/20 backdrop-blur-md text-zinc-400 hover:text-red-400 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer border border-white/10 hover:border-red-500/30 shadow-md"
        title="Sil"
      >
        <Trash2 size={13} />
      </button>

      {/* Görsel Alanı */}
      <div 
        className="w-full h-32 shrink-0 overflow-hidden relative cursor-pointer bg-zinc-950/80 flex items-center justify-center border-b border-zinc-800/80"
        onClick={() => cert.image && onImageClick(cert.image)}
      >
        {cert.image ? (
          <>
            <img src={cert.image} alt={cert.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-200 ease-out" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none"></div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/60">
            {isPayout ? (
              <DollarSign size={28} className="opacity-25 text-emerald-400" />
            ) : (
              <Award size={28} className="opacity-25 text-blue-400" />
            )}
            <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-600 mt-1">Görsel Yok</span>
          </div>
        )}
      </div>
      
      {/* Alt Bilgi Paneli */}
      <div className="p-3 px-3.5 flex-1 flex flex-col justify-center gap-1 bg-transparent">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="text-sm font-bold text-white truncate max-w-[65%]" title={cert.title}>
            {cert.title}
          </h3>
          {isPayout && cert.amount !== undefined && cert.amount !== null && (
            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="font-bold text-emerald-400 font-mono tracking-tight text-xs sm:text-xs">
                ${cert.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-zinc-400">
          <span className="text-[10px] flex items-center gap-1.5 font-mono text-zinc-400">
            <Calendar size={11} className="text-zinc-500" />
            {formatDate(cert.date)}
          </span>
        </div>
      </div>
    </div>
  );
}
