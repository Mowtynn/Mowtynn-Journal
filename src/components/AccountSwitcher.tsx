import React from 'react';
import { motion } from 'motion/react';
import { Shield, Trophy, Layers } from 'lucide-react';
import { AccountCategory } from '../types';

interface AccountSwitcherProps {
  activeCategory: AccountCategory;
  onSelectCategory: (category: AccountCategory) => void;
  counts: {
    all: number;
    demo: number;
    funded: number;
  };
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = React.memo(({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  const options: {
    id: AccountCategory;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    colorClass: string;
    activeBorderClass: string;
    activeBgClass: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      label: 'TÜMÜ',
      subLabel: 'Tüm Hesaplar',
      icon: <Layers size={11} className="shrink-0" />,
      colorClass: 'text-zinc-200',
      activeBorderClass: 'border-zinc-500/40',
      activeBgClass: 'bg-zinc-800/80',
      count: counts.all,
    },
    {
      id: 'FUNDED',
      label: 'FUNDED',
      subLabel: 'Funded & Canlı Hesaplar',
      icon: <Trophy size={11} className="shrink-0" />,
      colorClass: 'text-emerald-400',
      activeBorderClass: 'border-emerald-500/40',
      activeBgClass: 'bg-emerald-500/15',
      count: counts.funded,
    },
    {
      id: 'DEMO',
      label: 'DEMO',
      subLabel: 'Demo, LiveTest, Challenge',
      icon: <Shield size={11} className="shrink-0" />,
      colorClass: 'text-amber-400',
      activeBorderClass: 'border-amber-500/40',
      activeBgClass: 'bg-amber-500/15',
      count: counts.demo,
    },
  ];

  return (
    <div 
      className="flex items-center bg-zinc-900 border border-zinc-700/60 rounded-xl p-0.5 shadow-xs shrink-0 select-none"
      title="Hesap Türü Filtresi (Demo vs Funded)"
    >
      {options.map((opt) => {
        const isActive = activeCategory === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectCategory(opt.id)}
            title={`${opt.label}: ${opt.subLabel} (${opt.count} İşlem)`}
            className={`relative z-10 flex items-center gap-1.5 px-2 sm:px-2.5 h-6.5 rounded-lg transition-colors duration-150 cursor-pointer text-[10px] sm:text-[11px] font-bold font-sans ${
              isActive ? opt.colorClass : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="accountSwitcherIndicator"
                className={`absolute inset-0 rounded-lg border shadow-xs ${opt.activeBgClass} ${opt.activeBorderClass}`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {opt.icon}
              <span className="tracking-wider">{opt.label}</span>
            </span>
            <span
              className={`relative z-10 text-[9px] px-1 py-0.2 rounded-full font-mono font-medium ${
                isActive
                  ? 'bg-zinc-950/70 text-zinc-100 border border-zinc-700/60'
                  : 'bg-zinc-800/80 text-zinc-500'
              }`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

AccountSwitcher.displayName = 'AccountSwitcher';
