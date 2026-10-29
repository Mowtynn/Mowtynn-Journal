import { POPOVER } from '../lib/motion';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Trophy, Layers, Target, ChevronDown, ChevronRight, Check, Search } from 'lucide-react';
import { AccountCategory, PropAccount } from '../types';
import { UNLINKED, accountCategoryOf, type ScopeAccountRow, type ScopeCategoryRows } from '../lib/accountScope';
import { ACCOUNT_STATUS_LABEL } from '../lib/propAccounts';

/**
 * Üst çubuktaki hesap kapsamı seçicisi.
 * TÜMÜ (Challenge + Funded) · CHALLENGE · FUNDED · HESAPSIZ (ayrı; yalnızca bilinçli seçilince).
 * Challenge ve Funded altında tek hesap seçilebilir.
 * Seçim işlem listesini, analizi, günlüğü ve haftalık değerlendirmeyi birlikte kapsar.
 */

interface AccountSwitcherProps {
  activeCategory: AccountCategory;
  /** Tek hesap seçiliyse o hesap (yoksa kategorinin tamamı) */
  activeAccount: PropAccount | null;
  /** Kategorinin hiçbir hesaba bağlı olmayan işlemleri seçili */
  unlinkedActive?: boolean;
  onSelect: (category: AccountCategory, accountId?: string | null) => void;
  counts: {
    all: number;
    funded: number;
    challenge: number;
    demo: number;
  };
  accounts: { CHALLENGE: ScopeCategoryRows; FUNDED: ScopeCategoryRows };
}

type Option = {
  id: AccountCategory;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  dotClass: string;
  badgeBgClass: string;
  activeBorderClass: string;
  activeBgClass: string;
  triggerClass: string;
  count: number;
};

/** Bu sayıdan fazla hesapta menünün üstünde arama kutusu çıkar */
const SEARCH_THRESHOLD = 8;
const normalize = (v: string) => v.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

const accountShortName = (a: PropAccount) => a.chainName || a.name;
const stageTag = (a: PropAccount) => (a.stage === 0 ? null : `P${a.stage}`);

export const AccountSwitcher: React.FC<AccountSwitcherProps> = React.memo(({
  activeCategory,
  activeAccount,
  unlinkedActive = false,
  onSelect,
  counts,
  accounts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options: Option[] = [
    {
      id: 'ALL',
      label: 'TÜMÜ',
      icon: <Layers size={12} className="shrink-0" />,
      colorClass: 'text-zinc-200',
      dotClass: 'bg-zinc-400',
      badgeBgClass: 'bg-zinc-800 text-zinc-300 border-zinc-700/80',
      activeBorderClass: 'border-zinc-500/40',
      activeBgClass: 'bg-zinc-800/80',
      triggerClass: 'bg-zinc-900 border-zinc-700/60 hover:bg-zinc-800/80 text-zinc-300',
      count: counts.all,
    },
    {
      id: 'CHALLENGE',
      label: 'CHALLENGE',
      icon: <Target size={12} className="shrink-0 text-blue-400" />,
      colorClass: 'text-blue-400',
      dotClass: 'bg-blue-400',
      badgeBgClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      activeBorderClass: 'border-blue-500/40',
      activeBgClass: 'bg-blue-500/15',
      triggerClass: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 text-blue-300',
      count: counts.challenge,
    },
    {
      id: 'FUNDED',
      label: 'FUNDED',
      icon: <Trophy size={12} className="shrink-0 text-emerald-400" />,
      colorClass: 'text-emerald-400',
      dotClass: 'bg-emerald-400',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      activeBorderClass: 'border-emerald-500/40',
      activeBgClass: 'bg-emerald-500/15',
      triggerClass: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 text-emerald-300',
      count: counts.funded,
    },
    {
      id: 'DEMO',
      label: 'HESAPSIZ',
      icon: <Shield size={12} className="shrink-0 text-amber-400" />,
      colorClass: 'text-amber-400',
      dotClass: 'bg-amber-400',
      badgeBgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      activeBorderClass: 'border-amber-500/40',
      activeBgClass: 'bg-amber-500/15',
      triggerClass: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 text-amber-300',
      count: counts.demo,
    },
  ];

  const current = options.find((opt) => opt.id === activeCategory) || options[0];
  const catRows = activeCategory === 'CHALLENGE' || activeCategory === 'FUNDED' ? accounts[activeCategory] : null;
  const triggerCount = activeAccount
    ? catRows?.rows.find((r) => r.account.id === activeAccount.id)?.count ?? 0
    : unlinkedActive
      ? catRows?.unlinked ?? 0
      : current.count;
  const triggerLabel = activeAccount ? accountShortName(activeAccount) : unlinkedActive ? `${current.label} · bağsız` : current.label;
  const triggerTitle = activeAccount
    ? `Hesap: ${activeAccount.name} (${triggerCount} işlem)`
    : unlinkedActive
      ? `${current.label}: hiçbir hesaba bağlı olmayan işlemler (${triggerCount})`
      : current.id === 'ALL'
        ? `Tüm prop hesapları (Challenge + Funded) · ${triggerCount} işlem · hesapsız işlemler dahil değil`
        : `Hesap kapsamı: ${current.label} (${triggerCount} işlem)`;

  const select = (category: AccountCategory, accountId: string | null = null) => {
    onSelect(category, accountId);
    setIsOpen(false);
  };

  const badge = (n: number, cls: string) => (
    <span className={`min-w-[1.25rem] text-center text-[10px] font-bold font-mono px-1 py-px rounded-md border leading-tight ${cls}`}>{n}</span>
  );

  // Hesap sayısı artınca: arama kutusu (çok hesapta ad/firma ile süzme)
  const totalAccounts = accounts.CHALLENGE.rows.length + accounts.FUNDED.rows.length;
  const showSearch = totalAccounts > SEARCH_THRESHOLD;
  const [query, setQuery] = useState('');
  const q = normalize(query);
  const matches = (a: PropAccount) => !q || normalize(`${a.name} ${a.chainName} ${a.firm || ''}`).includes(q);
  // Kapanmış (geçti / patladı / arşiv) hesaplar kategori başına katlanır; açılan gruplar menü açıkken hatırlanır
  const [openClosed, setOpenClosed] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    // Seçili satır her zaman görünür: menü açılınca oraya kaydır (kapanmış gruptaysa grup zaten açık başlar)
    const raf = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      if (showSearch) searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, showSearch]);

  const renderAccount = (opt: Option, { account, count }: ScopeAccountRow) => {
    const sel = activeAccount?.id === account.id;
    const active = account.status === 'ACTIVE';
    return (
      <button
        key={account.id}
        type="button"
        role="option"
        aria-selected={sel}
        title={account.name}
        onClick={() => select(opt.id, account.id)}
        className={`w-full h-7.5 shrink-0 pl-6 pr-2 text-left rounded-lg transition-ui flex items-center justify-between gap-2 cursor-pointer border ${
          sel ? `${opt.activeBgClass} ${opt.activeBorderClass}` : 'border-transparent hover:bg-zinc-800/80'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? opt.dotClass : 'bg-zinc-600'}`} aria-hidden />
          <span className={`text-xs font-semibold truncate ${sel ? 'text-zinc-50' : active ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {accountShortName(account)}
          </span>
          {stageTag(account) && (
            <span className="text-[9px] font-bold font-mono px-1 rounded border border-zinc-700 text-zinc-400 shrink-0">{stageTag(account)}</span>
          )}
          {!active && <span className="text-[10px] text-zinc-600 shrink-0">{ACCOUNT_STATUS_LABEL[account.status]}</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {badge(count, sel ? opt.badgeBgClass : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/60')}
          <Check size={12} className={sel ? opt.colorClass : 'invisible'} strokeWidth={2.5} />
        </span>
      </button>
    );
  };

  const visibleCount = (opt: Option) => {
    const group = opt.id === 'CHALLENGE' || opt.id === 'FUNDED' ? accounts[opt.id] : null;
    return group ? group.rows.filter((r) => matches(r.account)).length : 0;
  };
  const noMatch = !!q && accounts.CHALLENGE.rows.every((r) => !matches(r.account)) && accounts.FUNDED.rows.every((r) => !matches(r.account));

  return (
    <div className="relative shrink-0 select-none z-30" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={triggerTitle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 h-7 px-2 rounded-lg border transition-ui duration-150 cursor-pointer shadow-xs max-w-[7.5rem] sm:max-w-[13rem] ${
          isOpen ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm ring-1 ring-zinc-600/40' : current.triggerClass
        }`}
      >
        {current.icon}
        <span className={`text-[11px] font-black font-sans tracking-wide uppercase truncate min-w-0 ${current.colorClass}`}>{triggerLabel}</span>
        {activeAccount && stageTag(activeAccount) && (
          <span className="text-[9px] font-bold font-mono px-1 rounded border border-blue-500/30 text-blue-300 shrink-0">{stageTag(activeAccount)}</span>
        )}
        <span className="shrink-0">{badge(triggerCount, current.badgeBgClass)}</span>
        <ChevronDown size={11} className={`shrink-0 text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-zinc-200' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="account-switcher-dropdown"
            {...POPOVER}
            className="origin-top-right absolute right-0 top-[calc(100%+4px)] w-64 max-w-[calc(100vw-24px)] max-h-[min(70vh,30rem)] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {showSearch && (
              <div className="p-1.5 border-b border-zinc-800 shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const first = [...accounts.CHALLENGE.rows, ...accounts.FUNDED.rows].find((r) => matches(r.account));
                        if (first) select(accountCategoryOf(first.account), first.account.id);
                      }
                    }}
                    placeholder="Hesap ara…"
                    aria-label="Hesap ara"
                    className="w-full h-8 pl-7 pr-2 bg-zinc-950/80 border border-zinc-700/70 focus:border-zinc-500 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div ref={listRef} role="listbox" aria-label="Hesap kapsamı" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
              {options.map((opt) => {
                const isSelected = activeCategory === opt.id && !activeAccount && !unlinkedActive;
                const group = opt.id === 'CHALLENGE' || opt.id === 'FUNDED' ? accounts[opt.id] : null;
                const rows = (group?.rows ?? []).filter((r) => matches(r.account));
                const unlinkedCount = q ? 0 : group?.unlinked ?? 0;
                const live = rows.filter((r) => r.account.status === 'ACTIVE');
                const closed = rows.filter((r) => r.account.status !== 'ACTIVE');
                const selectedClosed = closed.some((r) => r.account.id === activeAccount?.id);
                const closedOpen = !!q || selectedClosed || !!openClosed[opt.id];
                // Aramada eşleşmesi olmayan kategori ve "Hesapsız" gizlenir
                if (q && visibleCount(opt) === 0) return null;
                return (
                  <React.Fragment key={opt.id}>
                    {opt.id === 'DEMO' && <div className="h-px bg-zinc-800 my-1 shrink-0" aria-hidden />}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => select(opt.id)}
                      className={`w-full h-8 shrink-0 px-2 text-left rounded-lg transition-ui flex items-center justify-between gap-2 cursor-pointer border ${
                        isSelected ? `${opt.activeBgClass} ${opt.activeBorderClass}` : 'border-transparent hover:bg-zinc-800/80'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.icon}
                        <span className={`text-[11px] font-black font-sans tracking-wider uppercase truncate ${isSelected ? opt.colorClass : 'text-zinc-200'}`}>
                          {opt.label}
                        </span>
                        {group && (group.rows.length > 0 || group.unlinked > 0) && (
                          <span className="text-[10px] font-semibold text-zinc-500 normal-case shrink-0">tümü</span>
                        )}
                        {opt.id === 'ALL' && <span className="text-[10px] font-semibold text-zinc-500 normal-case truncate">Challenge + Funded</span>}
                        {opt.id === 'DEMO' && <span className="text-[10px] font-semibold text-zinc-500 normal-case truncate">ayrı tutulur</span>}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {badge(opt.count, isSelected ? opt.badgeBgClass : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/60')}
                        <Check size={12} className={isSelected ? opt.colorClass : 'invisible'} strokeWidth={2.5} />
                      </span>
                    </button>

                    {live.map((r) => renderAccount(opt, r))}

                    {closed.length > 0 && !q && (
                      <button
                        type="button"
                        aria-expanded={closedOpen}
                        disabled={selectedClosed}
                        onClick={() => setOpenClosed((m) => ({ ...m, [opt.id]: !m[opt.id] }))}
                        className="w-full h-7 shrink-0 pl-6 pr-2 text-left rounded-lg flex items-center justify-between gap-2 cursor-pointer text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 disabled:cursor-default disabled:hover:bg-transparent transition-ui"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                          <ChevronRight size={12} className={`transition-transform duration-150 ${closedOpen ? 'rotate-90' : ''}`} />
                          Kapanmış Hesaplar
                        </span>
                        <span className="text-[10px] font-bold font-mono">{closed.length}</span>
                      </button>
                    )}
                    {closedOpen && closed.map((r) => renderAccount(opt, r))}

                    {unlinkedCount > 0 && (() => {
                      const sel = unlinkedActive && activeCategory === opt.id;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={sel}
                          title="Hiçbir prop hesabına bağlı olmayan işlemler (eski kayıtlar ya da silinmiş hesaplar)"
                          onClick={() => select(opt.id, UNLINKED)}
                          className={`w-full h-7.5 shrink-0 pl-6 pr-2 text-left rounded-lg transition-ui flex items-center justify-between gap-2 cursor-pointer border ${
                            sel ? `${opt.activeBgClass} ${opt.activeBorderClass}` : 'border-transparent hover:bg-zinc-800/80'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 border border-zinc-500" aria-hidden />
                            <span className={`text-xs italic truncate ${sel ? 'text-zinc-50' : 'text-zinc-400'}`}>Bağlı Hesabı Yok</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {badge(unlinkedCount, sel ? opt.badgeBgClass : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/60')}
                            <Check size={12} className={sel ? opt.colorClass : 'invisible'} strokeWidth={2.5} />
                          </span>
                        </button>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              {noMatch && <p className="px-2 py-3 text-center text-[11px] text-zinc-500">"{query}" ile eşleşen hesap yok</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AccountSwitcher.displayName = 'AccountSwitcher';
