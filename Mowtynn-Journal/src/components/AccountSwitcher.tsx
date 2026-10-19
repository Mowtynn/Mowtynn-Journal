import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Trophy, Layers, Target, ChevronDown, Check } from 'lucide-react';
import { AccountCategory } from '../types';

interface AccountSwitcherProps {
  activeCategory: AccountCategory;
  onSelectCategory: (category: AccountCategory) => void;
  counts: {
    all: number;
    funded: number;
    challenge: number;
    demo: number;
  };
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = React.memo(({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
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

  const options: {
    id: AccountCategory;
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    badgeBgClass: string;
    activeBorderClass: string;
    activeBgClass: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      label: 'TÜMÜ',
      icon: <Layers size={11} className="shrink-0" />,
      colorClass: 'text-zinc-200',
      badgeBgClass: 'bg-zinc-800 text-zinc-300 border-zinc-700/80',
      activeBorderClass: 'border-zinc-500/40',
      activeBgClass: 'bg-zinc-800/80',
      count: counts.all,
    },
    {
      id: 'FUNDED',
      label: 'FUNDED',
      icon: <Trophy size={11} className="shrink-0 text-emerald-400" />,
      colorClass: 'text-emerald-400',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      activeBorderClass: 'border-emerald-500/40',
      activeBgClass: 'bg-emerald-500/15',
      count: counts.funded,
    },
    {
      id: 'CHALLENGE',
      label: 'CHALLENGE',
      icon: <Target size={11} className="shrink-0 text-blue-400" />,
      colorClass: 'text-blue-400',
      badgeBgClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      activeBorderClass: 'border-blue-500/40',
      activeBgClass: 'bg-blue-500/15',
      count: counts.challenge,
    },
    {
      id: 'DEMO',
      label: 'DEMO',
      icon: <Shield size={11} className="shrink-0 text-amber-400" />,
      colorClass: 'text-amber-400',
      badgeBgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      activeBorderClass: 'border-amber-500/40',
      activeBgClass: 'bg-amber-500/15',
      count: counts.demo,
    },
  ];

  const currentOption = options.find((opt) => opt.id === activeCategory) || options[0];

  const handleSelect = (category: AccountCategory) => {
    onSelectCategory(category);
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0 select-none z-30" ref={containerRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Hesap Türü: ${currentOption.label} (${currentOption.count} İşlem)`}
        className={`flex items-center gap-1.5 h-6 px-2 rounded-lg border transition-all duration-150 cursor-pointer shadow-xs ${
          isOpen
            ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm ring-1 ring-zinc-600/40'
            : currentOption.id === 'FUNDED'
            ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 text-emerald-300'
            : currentOption.id === 'CHALLENGE'
            ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 text-blue-300'
            : currentOption.id === 'DEMO'
            ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 text-amber-300'
            : 'bg-zinc-900 border-zinc-700/60 hover:bg-zinc-800/80 text-zinc-300'
        }`}
      >
        <span className="flex items-center gap-1">
          {currentOption.icon}
          <span className={`text-[10px] font-black font-sans tracking-wide uppercase ${currentOption.colorClass}`}>
            {currentOption.label}
          </span>
        </span>

        <span
          className={`text-[8.5px] px-1 py-0.2 rounded-md font-mono font-bold leading-none border ${currentOption.badgeBgClass}`}
        >
          {currentOption.count}
        </span>

        <ChevronDown
          size={10}
          className={`text-zinc-400 transition-transform duration-150 ml-0.2 ${
            isOpen ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      {/* Small Compact Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="account-switcher-dropdown"
            initial={{ opacity: 0, y: 3, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+4px)] w-[175px] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-xl z-50 p-1 overflow-hidden"
          >
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = activeCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={`w-full px-2 py-1.5 text-left rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? `${opt.activeBgClass} ${opt.activeBorderClass} shadow-xs`
                        : 'border-transparent hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex items-center justify-center shrink-0">
                        {opt.icon}
                      </div>
                      <span
                        className={`text-[10.5px] font-black font-sans tracking-wider uppercase truncate ${
                          isSelected ? opt.colorClass : 'text-zinc-300'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                      <span
                        className={`text-[8.5px] font-bold font-mono px-1 py-0.2 rounded border ${
                          isSelected
                            ? opt.badgeBgClass
                            : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/60'
                        }`}
                      >
                        {opt.count}
                      </span>
                      {isSelected && (
                        <Check size={11} className={opt.colorClass} strokeWidth={2.5} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AccountSwitcher.displayName = 'AccountSwitcher';
