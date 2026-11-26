import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, Plus, Trash2, Pencil, Check, CalendarDays, Building2, TrendingUp } from 'lucide-react';
import type { Payout } from '../types';
import { trNow } from '../lib/tradingTime';
import { formatMoney } from '../lib/format';
import { newPayoutId, summarizePayouts, sortPayouts } from '../lib/payouts';
import { titleCase } from '../constants/constants';
import { TurkishDatePicker } from './TurkishDateTimePicker';

/**
 * Prop sekmesi: yalnızca alınan payout'lar (tarih, tutar, firma, not). Hesap / bakiye / drawdown takibi yok.
 */
interface PropViewProps {
  payouts: Payout[];
  onChange: (payouts: Payout[]) => void;
}

const money = (v: number) => formatMoney(v);
const todayInput = () => {
  const d = trNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const inputCls =
  'w-full h-9 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-2.5 text-xs text-zinc-100 focus:outline-none placeholder-zinc-500 font-sans font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const labelCls = 'text-label font-bold text-zinc-300 uppercase tracking-wide mb-1 block font-sans';
const btn = 'h-8 px-2.5 rounded-xl border text-label font-bold flex items-center gap-1.5 transition-ui cursor-pointer';
const btnGhost = `${btn} border-zinc-700 text-zinc-300 bg-zinc-900 hover:bg-zinc-800`;
const btnGreen = `${btn} border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20`;

type Draft = { id: string | null; date: string; amount: string; firm: string; note: string };
const emptyDraft = (firm = ''): Draft => ({ id: null, date: todayInput(), amount: '', firm, note: '' });

/* ---------- ekleme / düzenleme kartı ---------- */
function PayoutForm({
  draft, setDraft, firms, onSave, onCancel,
}: {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  firms: string[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const set = setDraft;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="bg-zinc-900/60 border border-emerald-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-xs"
    >
      <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
        <Wallet size={14} className="text-emerald-400" />
        {draft.id ? 'Payout Düzenle' : 'Payout Ekle'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div>
          <label className={labelCls}>Tarih</label>
          <div className="h-9 flex items-center">
            <TurkishDatePicker value={draft.date} onChange={(v) => v && set({ date: v })} className="w-full" showPresets={false} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Tutar ($)</label>
          <input
            ref={amountRef}
            autoFocus
            className={inputCls}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="elime geçen"
            value={draft.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Firma</label>
          <input
            className={inputCls}
            list="payout-firms"
            placeholder="ör. FTMO"
            value={draft.firm}
            onChange={(e) => set({ firm: e.target.value })}
          />
          <datalist id="payout-firms">
            {firms.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>
      {/* Daha önce girilen firmalar tek dokunuşla */}
      {firms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-1">
          {firms.slice(0, 8).map((f) => {
            const on = draft.firm.trim().toLowerCase() === f.toLowerCase();
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  set({ firm: f });
                  if (!draft.amount) amountRef.current?.focus();
                }}
                className={`h-7 px-2.5 rounded-lg border text-label font-bold transition-ui cursor-pointer ${
                  on ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      )}
      <div>
        <label className={labelCls}>Not (İsteğe Bağlı)</label>
        <input className={`${inputCls} font-medium`} placeholder="ör. 2. payout, %80 kâr payı" value={draft.note} onChange={(e) => set({ note: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>
          Vazgeç
        </button>
        <button type="submit" className={btnGreen}>
          <Check size={13} /> Kaydet
        </button>
      </div>
    </form>
  );
}

/* ---------- sayfa ---------- */
export function PropView({ payouts, onChange }: PropViewProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(() => sortPayouts(payouts), [payouts]);
  const summary = useMemo(() => summarizePayouts(payouts), [payouts]);
  const firms = useMemo(() => summary.byFirm.map((g) => g.key), [summary]);
  const thisYear = String(trNow().getFullYear());
  const yearTotal = summary.byYear.find((g) => g.key === thisYear);
  const byYear = useMemo(() => {
    const m = new Map<string, Payout[]>();
    sorted.forEach((p) => {
      const y = p.date.slice(0, 4);
      (m.get(y) || m.set(y, []).get(y)!).push(p);
    });
    return [...m.entries()];
  }, [sorted]);

  const startAdd = () => setDraft(emptyDraft(sorted[0]?.firm || ''));
  const startEdit = (p: Payout) => setDraft({ id: p.id, date: p.date, amount: String(p.amount), firm: p.firm, note: p.note || '' });

  const save = () => {
    if (!draft) return;
    const amount = Number(draft.amount);
    const firm = titleCase(draft.firm.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return toast.error('Tarih seç.');
    if (!(amount > 0)) return toast.error('Elime geçen tutarı gir.');
    if (!firm) return toast.error('Firmayı yaz.');
    const prev = draft.id ? payouts.find((p) => p.id === draft.id) : undefined;
    const record: Payout = {
      id: draft.id || newPayoutId(),
      date: draft.date,
      amount,
      firm,
      note: draft.note.trim() || undefined,
      createdAt: prev?.createdAt || Date.now(),
    };
    onChange(prev ? payouts.map((p) => (p.id === prev.id ? record : p)) : [record, ...payouts]);
    toast.success(prev ? 'Payout güncellendi.' : `Payout kaydedildi: ${money(amount)} · ${firm}`);
    setDraft(null);
  };

  const remove = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      window.setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000);
      return;
    }
    onChange(payouts.filter((p) => p.id !== id));
    setConfirmDelete(null);
    toast.success('Payout silindi.');
  };

  const cards = [
    {
      label: 'Toplam payout', value: money(summary.total), tone: 'text-emerald-400', icon: <Wallet size={12} />,
      chip: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', sub: `${summary.count} payout`,
      side: summary.count > 0 ? `ort. ${money(summary.average)}` : '',
    },
    {
      label: `${thisYear} toplamı`, value: money(yearTotal?.total || 0), tone: 'text-zinc-100', icon: <CalendarDays size={12} />,
      chip: 'bg-blue-500/10 border-blue-500/20 text-blue-400', sub: `${yearTotal?.count || 0} payout`, side: '',
    },
    {
      label: 'En büyük payout', value: summary.count ? money(summary.largest) : '—', tone: 'text-zinc-100', icon: <TrendingUp size={12} />,
      chip: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300', sub: summary.lastDate ? `son: ${fmtDate(summary.lastDate)}` : 'Kayıt yok', side: '',
    },
    {
      label: 'Firmalar', value: String(summary.byFirm.length), tone: 'text-zinc-100', icon: <Building2 size={12} />,
      chip: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300',
      sub: summary.byFirm[0] ? `${summary.byFirm[0].key} · ${money(summary.byFirm[0].total)}` : 'Kayıt yok', side: '',
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Özet — ana paneldeki kartlarla aynı düzen */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {cards.map((x) => (
          <div key={x.label} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[7.5rem]">
            <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5 mb-2">
              <span className={`p-1.5 rounded-lg border ${x.chip}`}>{x.icon}</span>
              {x.label}
            </p>
            <div className="flex flex-col gap-1 mt-auto pt-1 min-w-0">
              <span className={`text-lg sm:text-xl font-bold tabular-nums ${x.tone}`}>{x.value}</span>
              <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-1 mt-1 min-w-0 min-h-6">
                <span className="bg-zinc-800/80 border border-zinc-700/60 py-0.5 px-2 rounded-lg text-label font-bold text-zinc-300 truncate max-w-full">{x.sub}</span>
                {x.side && <span className="text-label font-bold text-zinc-500 tabular-nums whitespace-nowrap">{x.side}</span>}
              </div>
            </div>
          </div>
        ))}
      </section>

      {draft && <PayoutForm draft={draft} setDraft={(p) => setDraft((d) => (d ? { ...d, ...p } : d))} firms={firms} onSave={save} onCancel={() => setDraft(null)} />}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 min-h-8">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Payout'lar ({summary.count})</h3>
          {!draft && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-300 cursor-pointer transition-ui whitespace-nowrap"
            >
              <Plus size={14} /> Payout Ekle
            </button>
          )}
        </div>

        {sorted.length === 0 && !draft && (
          <p className="text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
            Henüz payout yok. Aldığın her payout'u tarih, tutar ve firmayla kaydet; toplamlar burada birikir.
          </p>
        )}

        {byYear.map(([year, list]) => {
          const g = summary.byYear.find((y) => y.key === year);
          return (
            <div key={year} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/70 bg-zinc-950/40">
                <span className="text-xs font-bold text-zinc-200 tabular-nums">{year}</span>
                <span className="text-label font-bold text-zinc-400 tabular-nums">
                  {g?.count || 0} payout · <span className="text-emerald-400">{money(g?.total || 0)}</span>
                </span>
              </div>
              <ul className="divide-y divide-zinc-800/60">
                {list.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 min-w-0">
                    <span className="w-20 shrink-0 text-label font-bold text-zinc-400 tabular-nums">{fmtDate(p.date)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-zinc-100 truncate">{p.firm}</span>
                      {p.note && <span className="block text-label text-zinc-500 truncate">{p.note}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-emerald-400 tabular-nums">{money(p.amount)}</span>
                    <span className="shrink-0 flex items-center gap-1">
                      <button type="button" aria-label="Düzenle" onClick={() => startEdit(p)} className="btn-icon w-7 h-7">
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label={confirmDelete === p.id ? 'Silmeyi onayla' : 'Sil'}
                        onClick={() => remove(p.id)}
                        className={
                          confirmDelete === p.id
                            ? 'h-7 px-2 rounded-lg border border-rose-500/40 bg-rose-500/15 text-label font-bold text-rose-300 cursor-pointer'
                            : 'btn-icon w-7 h-7 hover:text-rose-300'
                        }
                      >
                        {confirmDelete === p.id ? 'Sil?' : <Trash2 size={12} />}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Firmaya göre dağılım (birden fazla firma varsa) */}
      {summary.byFirm.length > 1 && (
        <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Firmaya göre</h3>
          {summary.byFirm.map((g) => (
            <div key={g.key} className="flex items-center gap-3 min-w-0">
              <span className="w-28 shrink-0 text-xs font-bold text-zinc-200 truncate">{g.key}</span>
              <span className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <span className="block h-full bg-emerald-500/70 rounded-full" style={{ width: `${summary.total > 0 ? (g.total / summary.total) * 100 : 0}%` }} />
              </span>
              <span className="shrink-0 text-label font-bold text-zinc-400 tabular-nums">
                {g.count} · <span className="text-emerald-400">{money(g.total)}</span>
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default PropView;
