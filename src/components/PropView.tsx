import { MODAL_BACKDROP, MODAL_PANEL } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import { nyNow, nyWallDate, nyInputToTs } from '../lib/tradingTime';
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import {
  Wallet, Plus, Flame, Trophy, Archive, RotateCcw, Copy, Trash2, AlertTriangle, ChevronDown, X, Scale,
  Image as ImageIcon, FileText, Award, ArrowRight, Upload,
} from 'lucide-react';
import { PropAccount, PropCertificate, PropStageRule, Trade } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  accountDisplayName, computeAccountMetrics, computeBalanceSheet, groupChains, isFunded, newId, stageLabel, stageRule,
  ACCOUNT_STATUS_LABEL, type PropChain,
} from '../lib/propAccounts';
import { compressImage } from '../lib/imageCompress';
import { PropRSummary } from './prop/PropRSummary';

interface PropViewProps {
  accounts: PropAccount[];
  trades: Trade[];
  onChange: (accounts: PropAccount[]) => void;
  /** Sıkıştırılmış data URL'yi kalıcı adrese çevirir (girişliyken Storage URL'si, değilse aynı data URL) */
  uploadImage: (dataUrl: string) => Promise<string>;
}

/* ---------- biçim yardımcıları ---------- */
const money = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
const signedMoney = (v: number) => `${v > 0 ? '+' : ''}${money(v)}`;
/** "Phase 2'yi", "Phase 3'ü" gibi doğru Türkçe ek */
const phaseAcc = (n: number) => `Phase ${n}${({ 1: "'i", 2: "'yi", 3: "'ü", 4: "'ü", 5: "'i" } as Record<number, string>)[n] || "'i"}`;
const fmtR = (v: number) => `${v.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}R`;
const todayInput = () => {
  const d = nyNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const inputCls =
  'w-full h-9 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const labelCls = 'text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1 block font-sans';
const btn = 'h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-ui cursor-pointer';
const btnGhost = `${btn} border-zinc-700 text-zinc-300 bg-zinc-900 hover:bg-zinc-800`;
const btnBlue = `${btn} border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20`;
const btnGreen = `${btn} border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20`;
const btnRed = `${btn} border-rose-500/30 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20`;
const btnAmber = `${btn} border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20`;

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 h-9 bg-zinc-950/80 border border-zinc-700/70 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-lg text-[11px] font-bold uppercase tracking-wide transition-ui cursor-pointer border ${
            value === o.v ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** İki adımlı onay düğmesi: ilk basışta "Emin misin?" olur, 4 sn içinde ikinci basış işlemi yapar */
function ConfirmButton({ label, icon, className, onConfirm }: { label: string; icon: ReactNode; className: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={armed ? `${btn} bg-rose-500/20 border-rose-500/50 text-rose-200` : className}
    >
      {icon}
      {armed ? 'Emin misin? Tekrar bas' : label}
    </button>
  );
}

function Bar({ pct, tone }: { pct: number; tone: 'blue' | 'risk' }) {
  const p = Math.max(0, Math.min(100, pct));
  const color = tone === 'blue' ? 'bg-blue-500' : p >= 80 ? 'bg-rose-500' : p >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${p}%` }} />
    </div>
  );
}

/* ---------- görsel seçici ve büyük görünüm ---------- */
function useImagePicker(uploadImage: PropViewProps['uploadImage']) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined | null): Promise<string | null> => {
    if (!file) return null;
    setBusy(true);
    const id = toast.loading('Fotoğraf hazırlanıyor…');
    try {
      const data = await compressImage(file);
      const stored = await uploadImage(data);
      toast.success('Fotoğraf eklendi.', { id });
      return stored;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Fotoğraf yüklenemedi.', { id });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, pick };
}

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);
  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div key="prop-lightbox" {...MODAL_BACKDROP} onClick={onClose} className="fixed inset-0 modal-layer modal-dim z-[1600] flex items-center justify-center p-3 cursor-zoom-out">
          <motion.img {...MODAL_PANEL} src={src} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Thumb({ src, onOpen, onRemove }: { src: string; onOpen: () => void; onRemove?: () => void }) {
  return (
    <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-zinc-700/70 bg-zinc-950 shrink-0">
      <button type="button" onClick={onOpen} className="w-full h-full cursor-zoom-in">
        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="Fotoğrafı kaldır"
          onClick={onRemove}
          className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-zinc-950/80 text-zinc-300 hover:text-rose-300 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ---------- yeni zincir formu ---------- */
type Draft = {
  chainName: string;
  firm: string;
  size: string;
  drawdownMode: 'STATIC' | 'TRAILING';
  phaseCount: number;
  phases: { targetPct: string; maxDdPct: string }[];
  fundedMaxDdPct: string;
  riskPct: string;
  fee: string;
  startDate: string;
};

const DEFAULT_PHASES = [
  { targetPct: '10', maxDdPct: '10' },
  { targetPct: '5', maxDdPct: '10' },
  { targetPct: '5', maxDdPct: '10' },
];

const emptyDraft = (): Draft => ({
  chainName: '',
  firm: '',
  size: '',
  drawdownMode: 'STATIC',
  phaseCount: 2,
  phases: DEFAULT_PHASES.map((p) => ({ ...p })),
  fundedMaxDdPct: '10',
  riskPct: '1',
  fee: '',
  startDate: todayInput(),
});

const draftFromAccount = (a: PropAccount): Draft => ({
  chainName: a.chainName,
  firm: a.firm || '',
  size: String(a.size),
  drawdownMode: a.drawdownMode,
  phaseCount: a.phaseRules.length,
  phases: [0, 1, 2].map((i) =>
    a.phaseRules[i] ? { targetPct: String(a.phaseRules[i].targetPct), maxDdPct: String(a.phaseRules[i].maxDdPct) } : { ...DEFAULT_PHASES[i] },
  ),
  fundedMaxDdPct: String(a.fundedMaxDdPct),
  riskPct: String(a.riskPct),
  fee: '',
  startDate: todayInput(),
});

function NewChainForm({ draft, setDraft, onCreate, onCancel }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; onCreate: () => void; onCancel: () => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setPhase = (i: number, k: 'targetPct' | 'maxDdPct', v: string) =>
    setDraft((d) => ({ ...d, phases: d.phases.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const size = Number(draft.size);
  const risk = Number(draft.riskPct);
  return (
    <section id="prop-new-chain" className="rounded-2xl border border-blue-500/25 bg-zinc-900/60 p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <Plus size={14} className="text-blue-400" /> Yeni hesap
        </h3>
        <button type="button" aria-label="Kapat" onClick={onCancel} className="btn-icon w-7 h-7">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="col-span-2">
          <label className={labelCls}>Hesap Adı</label>
          <input className={inputCls} placeholder="örn: FTMO 100K #3" value={draft.chainName} onChange={(e) => set('chainName', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Firma</label>
          <input className={inputCls} placeholder="FTMO" value={draft.firm} onChange={(e) => set('firm', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Hesap Boyutu ($)</label>
          <input className={inputCls} type="number" min="0" step="any" placeholder="100000" value={draft.size} onChange={(e) => set('size', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Challenge Ücreti ($)</label>
          <input className={inputCls} type="number" min="0" step="any" placeholder="540" value={draft.fee} onChange={(e) => set('fee', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Max DD Tipi</label>
          <Segmented
            value={draft.drawdownMode}
            options={[
              { v: 'STATIC', label: 'Statik' },
              { v: 'TRAILING', label: 'Trailing' },
            ]}
            onChange={(v) => set('drawdownMode', v)}
          />
        </div>
        <div>
          <label className={labelCls}>1R = Risk %</label>
          <input className={inputCls} type="number" min="0" step="any" value={draft.riskPct} onChange={(e) => set('riskPct', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Başlangıç Tarihi</label>
          <input className={inputCls} type="date" value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-2.5 flex flex-col gap-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-2">
          <span className={`${labelCls} mb-0`}>Aşama sayısı</span>
          <Segmented
            value={draft.phaseCount}
            options={[
              { v: 0, label: 'Yok (direkt funded)' },
              { v: 1, label: '1' },
              { v: 2, label: '2' },
              { v: 3, label: '3' },
            ]}
            onChange={(v) => set('phaseCount', v)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {draft.phases.slice(0, draft.phaseCount).map((p, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Phase {i + 1}</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold uppercase text-zinc-500 block mb-0.5">Hedef %</label>
                  <input className={inputCls} type="number" min="0" step="any" value={p.targetPct} onChange={(e) => setPhase(i, 'targetPct', e.target.value)} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-zinc-500 block mb-0.5">Max DD %</label>
                  <input className={inputCls} type="number" min="0" step="any" value={p.maxDdPct} onChange={(e) => setPhase(i, 'maxDdPct', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Funded</span>
            <div>
              <label className="text-[9px] font-bold uppercase text-zinc-500 block mb-0.5">Max DD %</label>
              <input className={inputCls} type="number" min="0" step="any" value={draft.fundedMaxDdPct} onChange={(e) => set('fundedMaxDdPct', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Hesap, işlem formunda aşamasıyla birlikte seçenek olarak görünür (ör. "{draft.chainName.trim() || 'FTMO 100K'} · Phase 1"); her işlemin riski formda ayrıca seçilir. Bu karttaki R gösterimi için 1R ={' '}
        {size > 0 && risk > 0 ? <b className="text-zinc-300">{money((size * risk) / 100)}</b> : 'boyut × risk %'}. Ücret yalnızca bu ilk hesapta girilir; sonraki aşamalara ücret sorulmaz.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>
          Vazgeç
        </button>
        <button type="button" onClick={onCreate} className={btnBlue}>
          <Plus size={14} /> Hesabı ekle
        </button>
      </div>
    </section>
  );
}

/* ---------- sertifika / payout penceresi ---------- */
function CertificateDialog({
  open, kind, onClose, onSave, uploadImage,
}: {
  open: boolean;
  kind: PropCertificate['kind'];
  onClose: () => void;
  onSave: (c: PropCertificate) => void;
  uploadImage: PropViewProps['uploadImage'];
}) {
  useBodyScrollLock(open);
  const [date, setDate] = useState(todayInput());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, pick } = useImagePicker(uploadImage);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Alanlar yalnızca pencere açılırken sıfırlanır (üst bileşen yeniden çizilince girilenler kaybolmaz)
  useEffect(() => {
    if (!open) return;
    setDate(todayInput());
    setAmount('');
    setNote('');
    setImage(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const save = () => {
    const amt = Number(amount);
    if (!image) return toast.error('Sertifika fotoğrafını ekle.');
    if (kind === 'PAYOUT' && !(amt > 0)) return toast.error('Elime geçen net tutarı gir.');
    if (!date) return toast.error('Tarih seç.');
    onSave({ id: newId('cert'), kind, date, amount: kind === 'PAYOUT' ? amt : undefined, image, note: note.trim() || undefined, createdAt: Date.now() });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="prop-cert-dialog" {...MODAL_BACKDROP} onClick={onClose} className="fixed inset-0 modal-layer modal-dim z-[1550] flex items-center justify-center p-3">
          <motion.div {...MODAL_PANEL} onClick={(e) => e.stopPropagation()} className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                {kind === 'PAYOUT' ? <Wallet size={16} className="text-emerald-400" /> : <Award size={16} className="text-amber-400" />}
                {kind === 'PAYOUT' ? 'Payout Ekle' : 'Funded Sertifikası Ekle'}
              </h3>
              <button type="button" aria-label="Kapat" onClick={onClose} className="btn-icon w-7 h-7">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className={kind === 'PAYOUT' ? '' : 'col-span-2'}>
                <label className={labelCls}>Tarih</label>
                <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {kind === 'PAYOUT' && (
                <div>
                  <label className={labelCls}>Net Tutar ($)</label>
                  <input className={inputCls} type="number" min="0" step="any" placeholder="elime geçen" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Fotoğraf</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const url = await pick(e.target.files?.[0]);
                  if (url) setImage(url);
                  e.target.value = '';
                }}
              />
              {image ? (
                <div className="flex items-center gap-2">
                  <img src={image} alt="" className="w-24 h-24 rounded-xl object-cover border border-zinc-700" />
                  <button type="button" onClick={() => fileRef.current?.click()} className={btnGhost} disabled={busy}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-24 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500/50 text-zinc-400 hover:text-blue-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-ui">
                  <Upload size={16} />
                  {busy ? 'Yükleniyor…' : 'Fotoğraf seç'}
                </button>
              )}
            </div>
            <div>
              <label className={labelCls}>Not (İsteğe Bağlı)</label>
              <textarea className={`${inputCls} h-16 py-2 resize-none font-medium`} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className={btnGhost}>
                Vazgeç
              </button>
              <button type="button" onClick={save} disabled={busy} className={btnBlue}>
                Kaydet
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------- zincir kartı ---------- */
function ChainCard({
  chain, trades, onUpdateAccount, onAdvance, onClose, onReopen, onDeleteChain, onClone, uploadImage, openImage, archived,
}: {
  chain: PropChain;
  trades: Trade[];
  onUpdateAccount: (a: PropAccount) => void;
  onAdvance: (chain: PropChain) => void;
  onClose: (a: PropAccount, status: PropAccount['status']) => void;
  onReopen: (a: PropAccount) => void;
  onDeleteChain: (chain: PropChain) => void;
  onClone: (a: PropAccount) => void;
  uploadImage: PropViewProps['uploadImage'];
  openImage: (src: string) => void;
  archived?: boolean;
}) {
  const a = chain.current;
  const m = useMemo(() => computeAccountMetrics(a, trades), [a, trades]);
  const rule = stageRule(a);
  const active = a.status === 'ACTIVE';
  const [showBalance, setShowBalance] = useState(false);
  const [realBalance, setRealBalance] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(a.note || '');
  const [certKind, setCertKind] = useState<PropCertificate['kind'] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, pick } = useImagePicker(uploadImage);

  useEffect(() => setNoteDraft(a.note || ''), [a.id, a.note]);

  const lastStage = a.stage === a.phaseRules.length;
  const funded = isFunded(a);
  const certificates = chain.accounts.flatMap((acc) => (acc.certificates || []).map((c) => ({ c, acc })));
  const fundedCerts = certificates.filter((x) => x.c.kind === 'FUNDED');
  const payouts = certificates.filter((x) => x.c.kind === 'PAYOUT').sort((x, y) => (x.c.date < y.c.date ? 1 : -1));
  const ddUsedPct = m.maxDdAmount > 0 ? ((m.maxDdAmount - m.maxLossRemaining) / m.maxDdAmount) * 100 : 0;
  const targetPct = m.target ? Math.max(0, Math.min(100, (m.netPnl / m.target) * 100)) : 0;
  const R = (v: number) => (m.rUnit > 0 ? fmtR(v / m.rUnit) : '—');

  const submitBalance = () => {
    const real = Number(realBalance);
    if (!(real > 0)) return toast.error('Platformdaki bakiyeyi gir.');
    const diff = Math.round((real - m.balance) * 100) / 100;
    if (diff === 0) {
      setShowBalance(false);
      return toast('Bakiye zaten eşit, düzeltme gerekmedi.');
    }
    onUpdateAccount({ ...a, adjustments: [...(a.adjustments || []), { id: newId('adj'), at: Date.now(), amount: diff, realBalance: real }] });
    setShowBalance(false);
    setRealBalance('');
    toast.success(`Düzeltme kaydedildi: ${signedMoney(diff)}`);
  };

  const statusBadge = (acc: PropAccount) =>
    acc.status === 'ACTIVE'
      ? 'text-blue-300 border-blue-500/30 bg-blue-500/10'
      : acc.status === 'PASSED'
        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
        : acc.status === 'BLOWN'
          ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
          : 'text-zinc-400 border-zinc-700 bg-zinc-800/60';

  return (
    <div className={`rounded-2xl border p-3 sm:p-4 flex flex-col gap-3 ${active && m.maxBreached ? 'border-rose-500/40 bg-rose-950/10' : 'border-zinc-800/80 bg-zinc-900/50'}`}>
      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-zinc-100 truncate">{chain.chainName}</span>
            {a.firm && <span className="text-[10px] text-zinc-500 font-bold uppercase">{smartUpper(a.firm)}</span>}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {money(a.size)} · Max DD {a.drawdownMode === 'TRAILING' ? 'trailing' : 'statik'} · 1R = {money(m.rUnit)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-extrabold text-zinc-100 tabular-nums">{money(m.balance)}</div>
          <div className={`text-[11px] font-bold tabular-nums ${m.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {signedMoney(m.netPnl)} · {R(m.netPnl)} · {m.tradeCount} işlem
          </div>
        </div>
      </div>

      {/* Yolculuk */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase">
        {chain.fee > 0 && (
          <>
            <span className="px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300">Ücret {money(chain.fee)}</span>
            <ArrowRight size={12} className="text-zinc-600" />
          </>
        )}
        {chain.accounts.map((acc, i) => (
          <React.Fragment key={acc.id}>
            {i > 0 && <ArrowRight size={12} className="text-zinc-600" />}
            <span className={`px-2 py-1 rounded-lg border ${statusBadge(acc)}`}>
              {stageLabel(acc)} · {ACCOUNT_STATUS_LABEL[acc.status]}
            </span>
          </React.Fragment>
        ))}
        {chain.payoutCount > 0 && (
          <>
            <ArrowRight size={12} className="text-zinc-600" />
            <span className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              {chain.payoutCount} payout · {money(chain.payoutTotal)}
            </span>
          </>
        )}
      </div>

      {/* Kural takibi */}
      {!archived && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              <span>Max drawdown'a kalan (%{rule.maxDdPct})</span>
              <span className="text-zinc-100 tabular-nums">
                {money(Math.max(0, m.maxLossRemaining))} · {R(Math.max(0, m.maxLossRemaining))}
              </span>
            </div>
            <Bar pct={ddUsedPct} tone="risk" />
            <span className="text-[10px] text-zinc-500">Taban {money(m.maxLossFloor)}</span>
          </div>
          {m.target !== undefined ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                <span>Hedefe kalan (%{rule.targetPct})</span>
                <span className="text-zinc-100 tabular-nums">
                  {money(m.targetRemaining || 0)} · {R(m.targetRemaining || 0)}
                </span>
              </div>
              <Bar pct={targetPct} tone="blue" />
              <span className="text-[10px] text-zinc-500">Hedef {money(m.target)}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                <span>Bu hesaptan payout</span>
                <span className="text-emerald-300 tabular-nums">{money(m.payoutTotal)}</span>
              </div>
              <span className="text-[10px] text-zinc-500">{m.payoutCount} payout</span>
            </div>
          )}
        </div>
      )}

      {/* Canlı R özeti */}
      {active && !archived && <PropRSummary account={a} trades={trades} />}

      {active && (m.maxBreached || m.targetReached) && (
        <div className={`flex items-start gap-2 text-[11px] rounded-xl border p-2.5 ${m.maxBreached ? 'text-rose-200 border-rose-500/30 bg-rose-500/10' : 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'}`}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {m.maxBreached
              ? 'Kayıtlara göre max drawdown sınırı aşılmış görünüyor. Hesap patladıysa "Patladı" ile arşive al.'
              : lastStage
                ? 'Hedefe ulaşıldı. Geçtiysen "Funded\'a geç" ile devam et.'
                : `Hedefe ulaşıldı. Geçtiysen "${phaseAcc(a.stage + 1)} Başlat" ile devam et.`}
          </span>
        </div>
      )}

      {/* Eylemler */}
      <div className="flex flex-wrap gap-1.5">
        {active && !funded && (
          <ConfirmButton
            label={lastStage ? "Funded'a Geç" : `${phaseAcc(a.stage + 1)} Başlat`}
            icon={<Trophy size={13} />}
            className={btnGreen}
            onConfirm={() => onAdvance(chain)}
          />
        )}
        {active && funded && (
          <>
            <button type="button" onClick={() => setCertKind('PAYOUT')} className={btnGreen}>
              <Wallet size={13} /> Payout Ekle
            </button>
            <button type="button" onClick={() => setCertKind('FUNDED')} className={btnAmber}>
              <Award size={13} /> Funded Sertifikası
            </button>
          </>
        )}
        {active && (
          <button type="button" onClick={() => setShowBalance((v) => !v)} className={btnBlue}>
            <Scale size={13} /> Gerçek Bakiyeyi Gir
          </button>
        )}
        <button type="button" onClick={() => setShowNotes((v) => !v)} className={btnGhost}>
          <FileText size={13} /> Not & Fotoğraf{(a.images?.length || 0) > 0 ? ` (${a.images!.length})` : ''}
        </button>
        {active && <ConfirmButton label="Patladı" icon={<Flame size={13} />} className={btnRed} onConfirm={() => onClose(a, 'BLOWN')} />}
        {active && <ConfirmButton label="Arşivle" icon={<Archive size={13} />} className={btnGhost} onConfirm={() => onClose(a, 'ARCHIVED')} />}
        {archived && (
          <>
            <button type="button" onClick={() => onReopen(a)} className={btnGhost}>
              <RotateCcw size={13} /> Arşivden geri al
            </button>
            <button type="button" onClick={() => onClone(a)} className={btnBlue}>
              <Copy size={13} /> Aynı kurallarla yeni
            </button>
            <ConfirmButton label="Sil" icon={<Trash2 size={13} />} className={btnGhost} onConfirm={() => onDeleteChain(chain)} />
          </>
        )}
      </div>

      {/* Bakiye düzeltmesi */}
      {showBalance && active && (
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-2.5 flex flex-col gap-2">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Platformdaki güncel bakiyeyi yaz. Hesaplanan bakiye {money(m.balance)}; fark tek bir düzeltme kaydı olarak eklenir. Düzeltme R istatistiğine girmez, yalnızca bakiye ve
            drawdown takibini düzeltir.
          </p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              type="number"
              min="0"
              step="any"
              placeholder="Gerçek bakiye ($)"
              value={realBalance}
              onChange={(e) => setRealBalance(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitBalance()}
              autoFocus
            />
            <button type="button" onClick={submitBalance} className={`${btnBlue} shrink-0 h-9`}>
              Kaydet
            </button>
          </div>
        </div>
      )}
      {(a.adjustments?.length || 0) > 0 && !archived && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Bakiye düzeltmeleri · toplam {signedMoney(m.adjustmentsTotal)}</span>
          <div className="flex flex-wrap gap-1.5">
            {a.adjustments!.map((x) => (
              <span key={x.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950/60 text-[10px] text-zinc-300 tabular-nums">
                {nyWallDate(x.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · {signedMoney(x.amount)}
                {active && (
                  <button
                    type="button"
                    aria-label="Düzeltmeyi sil"
                    onClick={() => onUpdateAccount({ ...a, adjustments: (a.adjustments || []).filter((y) => y.id !== x.id) })}
                    className="text-zinc-500 hover:text-rose-300 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Not ve fotoğraflar */}
      {showNotes && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2.5 flex flex-col gap-2">
          <textarea
            className={`${inputCls} h-20 py-2 resize-y font-medium`}
            placeholder="Hesapla ilgili notlar (şifre / giriş bilgisi yazma)"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => {
              if ((noteDraft.trim() || undefined) !== a.note) onUpdateAccount({ ...a, note: noteDraft.trim() || undefined });
            }}
          />
          <div className="flex flex-wrap gap-2">
            {(a.images || []).map((src) => (
              <Thumb key={src} src={src} onOpen={() => openImage(src)} onRemove={() => onUpdateAccount({ ...a, images: (a.images || []).filter((x) => x !== src) })} />
            ))}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const url = await pick(e.target.files?.[0]);
                if (url) onUpdateAccount({ ...a, images: [...(a.images || []), url] });
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-20 h-20 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500/50 text-zinc-500 hover:text-blue-300 flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-ui"
            >
              <ImageIcon size={16} />
              {busy ? '…' : 'Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* Sertifikalar ve payout'lar */}
      {(fundedCerts.length > 0 || payouts.length > 0) && (
        <div className="flex flex-col gap-2">
          {fundedCerts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Funded Sertifikası</span>
              {fundedCerts.map(({ c, acc }) => (
                <CertRow key={c.id} c={c} onOpen={openImage} canDelete={!archived} onDelete={() => onUpdateAccount({ ...acc, certificates: (acc.certificates || []).filter((x) => x.id !== c.id) })} />
              ))}
            </div>
          )}
          {payouts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                Payout'lar · {payouts.length} · {money(chain.payoutTotal)}
              </span>
              {payouts.map(({ c, acc }) => (
                <CertRow key={c.id} c={c} onOpen={openImage} canDelete={!archived} onDelete={() => onUpdateAccount({ ...acc, certificates: (acc.certificates || []).filter((x) => x.id !== c.id) })} />
              ))}
            </div>
          )}
        </div>
      )}

      <CertificateDialog
        open={certKind !== null}
        kind={certKind || 'PAYOUT'}
        onClose={() => setCertKind(null)}
        uploadImage={uploadImage}
        onSave={(c) => onUpdateAccount({ ...a, certificates: [...(a.certificates || []), c] })}
      />
    </div>
  );
}

function CertRow({ c, onOpen, onDelete, canDelete }: { c: PropCertificate; onOpen: (src: string) => void; onDelete: () => void; canDelete: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
      {c.image ? (
        <button type="button" onClick={() => onOpen(c.image!)} className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0 cursor-zoom-in">
          <img src={c.image} alt="" loading="lazy" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="w-12 h-12 rounded-lg border border-zinc-800 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <span>{fmtDate(c.date)}</span>
          {c.kind === 'PAYOUT' && <span className="text-emerald-300 tabular-nums">{money(c.amount || 0)}</span>}
        </div>
        {c.note && <p className="text-[11px] text-zinc-400 truncate">{c.note}</p>}
      </div>
      {canDelete && <ConfirmButton label="Sil" icon={<Trash2 size={12} />} className={btnGhost} onConfirm={onDelete} />}
    </div>
  );
}

/* ---------- ana görünüm ---------- */
export function PropView({ accounts, trades, onChange, uploadImage }: PropViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showArchive, setShowArchive] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const chains = useMemo(() => groupChains(accounts), [accounts]);
  const activeChains = chains.filter((c) => c.isActive);
  const archivedChains = chains.filter((c) => !c.isActive);
  const sheet = useMemo(() => computeBalanceSheet(chains), [chains]);

  const updateAccount = (next: PropAccount) => onChange(accounts.map((a) => (a.id === next.id ? next : a)));

  const nameTaken = (name: string, exceptId?: string) =>
    accounts.some((a) => a.status === 'ACTIVE' && a.id !== exceptId && a.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleCreate = () => {
    const chainName = draft.chainName.trim();
    const size = Number(draft.size);
    const risk = Number(draft.riskPct);
    const fundedDd = Number(draft.fundedMaxDdPct);
    const fee = draft.fee.trim() === '' ? 0 : Number(draft.fee);
    if (!chainName) return toast.error('Hesap adını gir.');
    if (!(size > 0)) return toast.error('Hesap boyutunu gir.');
    if (!(risk > 0 && risk <= 10)) return toast.error('1R risk yüzdesi 0–10 arasında olmalı.');
    if (!(fee >= 0)) return toast.error('Ücret geçersiz.');
    if (!(fundedDd > 0 && fundedDd < 100)) return toast.error('Funded max DD yüzdesini gir.');
    const phaseRules: PropStageRule[] = [];
    for (let i = 0; i < draft.phaseCount; i++) {
      const t = Number(draft.phases[i].targetPct);
      const d = Number(draft.phases[i].maxDdPct);
      if (!(t > 0 && t < 100) || !(d > 0 && d < 100)) return toast.error(`Phase ${i + 1} hedef ve max DD yüzdelerini gir.`);
      phaseRules.push({ targetPct: t, maxDdPct: d });
    }
    const stage = phaseRules.length > 0 ? 1 : 0;
    const name = accountDisplayName(chainName, stage);
    if (nameTaken(name)) return toast.error('Bu adla aktif bir hesap zaten var.');
    // Başlangıç günü NY gece yarısı (işlem saatleriyle aynı saat dilimi)
    const start = draft.startDate ? nyInputToTs(`${draft.startDate}T00:00`) ?? Date.now() : Date.now();
    const id = newId('acc');
    const account: PropAccount = {
      id,
      chainId: id,
      chainName,
      name,
      firm: draft.firm.trim() || undefined,
      size,
      drawdownMode: draft.drawdownMode,
      stage,
      phaseRules,
      fundedMaxDdPct: fundedDd,
      riskPct: risk,
      fee: fee > 0 ? fee : undefined,
      status: 'ACTIVE',
      createdAt: Date.now(),
      startDate: Number.isFinite(start) ? start : Date.now(),
    };
    onChange([account, ...accounts]);
    setDraft(emptyDraft());
    setShowForm(false);
    toast.success(`${name} eklendi.`);
  };

  const handleAdvance = (chain: PropChain) => {
    const cur = chain.current;
    if (cur.status !== 'ACTIVE' || cur.stage === 0) return;
    const nextStage = cur.stage < cur.phaseRules.length ? cur.stage + 1 : 0;
    const now = Date.now();
    const next: PropAccount = {
      id: newId('acc'),
      chainId: cur.chainId,
      chainName: cur.chainName,
      name: accountDisplayName(cur.chainName, nextStage),
      firm: cur.firm,
      size: cur.size,
      drawdownMode: cur.drawdownMode,
      stage: nextStage,
      phaseRules: cur.phaseRules,
      fundedMaxDdPct: cur.fundedMaxDdPct,
      riskPct: cur.riskPct,
      status: 'ACTIVE',
      createdAt: now,
      startDate: now,
    };
    onChange([next, ...accounts.map((a) => (a.id === cur.id ? { ...a, status: 'PASSED' as const, closedAt: now } : a))]);
    toast.success(nextStage === 0 ? `${cur.chainName} funded oldu.` : `${cur.chainName} · Phase ${nextStage} başladı.`);
  };

  const handleClose = (acc: PropAccount, status: PropAccount['status']) => {
    updateAccount({ ...acc, status, closedAt: Date.now() });
    toast.success(status === 'BLOWN' ? `${acc.name} patladı olarak arşivlendi.` : `${acc.name} arşivlendi.`);
  };

  const handleReopen = (acc: PropAccount) => {
    if (nameTaken(acc.name, acc.id)) return toast.error('Aynı adla aktif bir hesap var.');
    updateAccount({ ...acc, status: 'ACTIVE', closedAt: undefined });
  };

  const handleDeleteChain = (chain: PropChain) => {
    const ids = new Set(chain.accounts.map((a) => a.id));
    onChange(accounts.filter((a) => !ids.has(a.id)));
    toast.success('Hesap zinciri silindi; işlemler duruyor.');
  };

  const handleClone = (acc: PropAccount) => {
    setDraft(draftFromAccount(acc));
    setShowForm(true);
    window.setTimeout(() => document.getElementById('prop-new-chain')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const cardProps = {
    trades,
    onUpdateAccount: updateAccount,
    onAdvance: handleAdvance,
    onClose: handleClose,
    onReopen: handleReopen,
    onDeleteChain: handleDeleteChain,
    onClone: handleClone,
    uploadImage,
    openImage: setLightbox,
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Bilanço — ana paneldeki kartlarla aynı düzen: simgeli başlık · değer · alt rozet (boş alt boşluk yok) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {(() => {
          const payoutCount = chains.reduce((n, c) => n + c.payoutCount, 0);
          const ongoing = chains.length - sheet.resolvedChains;
          return [
            {
              label: 'Ödenen ücret', value: money(sheet.feeTotal), tone: 'text-zinc-100', icon: <Wallet size={12} />,
              chip: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300', sub: `${chains.length} zincir`,
              side: chains.length > 0 ? `ort. ${money(sheet.feeTotal / chains.length)}` : '',
            },
            {
              label: 'Toplam payout', value: money(sheet.payoutTotal), tone: 'text-emerald-400', icon: <Award size={12} />,
              chip: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', sub: `${payoutCount} payout`,
              side: payoutCount > 0 ? `ort. ${money(sheet.payoutTotal / payoutCount)}` : '',
            },
            {
              label: 'Net sonuç', value: signedMoney(sheet.net), tone: sheet.net >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: <Scale size={12} />,
              chip: 'bg-blue-500/10 border-blue-500/20 text-blue-400', sub: 'payout − ücret',
              side: sheet.feeTotal > 0 ? `ROI %${((sheet.net / sheet.feeTotal) * 100).toFixed(0)}` : '',
            },
            {
              label: 'Geçme oranı',
              value: sheet.passRate === undefined ? '—' : `%${sheet.passRate.toFixed(0)}`,
              tone: 'text-blue-400',
              icon: <Trophy size={12} />,
              chip: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
              sub: sheet.resolvedChains > 0 ? `${sheet.fundedChains} / ${sheet.resolvedChains} funded` : 'Sonuçlanan yok',
              side: ongoing > 0 ? `${ongoing} süren` : '',
            },
          ];
        })().map((x) => (
          /* Ana paneldeki kartlarla birebir aynı yapı: başlık · değer · alt satır (rozet + ikinci bilgi) */
          <div key={x.label} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[8.5rem]">
            <div className="flex items-center justify-between mb-2">
              <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
                <span className={`p-1.5 rounded-lg border ${x.chip}`}>{x.icon}</span>
                {x.label}
              </p>
            </div>
            <div className="flex flex-col gap-1 mt-auto pt-1">
              <span className={`text-lg sm:text-xl font-bold tabular-nums ${x.tone}`}>{x.value}</span>
              <div className="flex items-center justify-between gap-1 mt-1 min-w-0 min-h-6">
                <span className="bg-zinc-800/80 border border-zinc-700/60 py-0.5 px-2 rounded-lg text-[10px] font-bold text-zinc-300 truncate">{x.sub}</span>
                {x.side && <span className="text-[10px] font-bold text-zinc-500 tabular-nums truncate shrink-0">{x.side}</span>}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Yeni hesap */}
      {showForm ? (
        <NewChainForm draft={draft} setDraft={setDraft} onCreate={handleCreate} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(emptyDraft());
            setShowForm(true);
          }}
          className="rounded-2xl border border-dashed border-zinc-700 hover:border-blue-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-zinc-300 hover:text-blue-300 cursor-pointer transition-ui"
        >
          <Plus size={15} /> Yeni Hesap Ekle
        </button>
      )}

      {/* Aktif zincirler */}
      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Aktif hesaplar ({activeChains.length})</h3>
        {activeChains.length === 0 && (
          <p className="text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
            Aktif hesap yok. Challenge'ını bir kez tanımla; aşamaları geçtikçe kart üzerinden bir sonraki aşamayı başlatırsın.
          </p>
        )}
        {activeChains.map((c) => (
          <ChainCard key={c.chainId} chain={c} {...cardProps} />
        ))}
      </section>

      {/* Arşiv */}
      {archivedChains.length > 0 && (
        <section className="flex flex-col gap-2">
          <button type="button" onClick={() => setShowArchive((v) => !v)} className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider cursor-pointer w-fit">
            <ChevronDown size={14} className={`transition-transform ${showArchive ? 'rotate-180' : ''}`} />
            Arşiv ({archivedChains.length})
          </button>
          {showArchive && archivedChains.map((c) => <ChainCard key={c.chainId} chain={c} archived {...cardProps} />)}
        </section>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

export default PropView;
