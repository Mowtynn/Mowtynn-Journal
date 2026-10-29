import { EASE } from '../../lib/motion';
import { smartUpper } from '../../constants/constants';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';

export function TableSortBadge({ sortState }: { sortState: 'asc' | 'des' | null }) {
  if (!sortState) {
    return (
      <span className="inline-flex flex-col items-center justify-center w-3 h-3 opacity-0 group-hover/th:opacity-50 transition-opacity text-zinc-500 shrink-0">
        <ChevronUp size={8} strokeWidth={2.5} className="-mb-1" />
        <ChevronDown size={8} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-glow-sm shrink-0 transition-ui duration-150">
      {sortState === 'asc' ? (
        <ArrowUp size={9} strokeWidth={2.5} />
      ) : (
        <ArrowDown size={9} strokeWidth={2.5} />
      )}
    </span>
  );
}

/* Sütun başlığı: sıralama oku akış dışında (absolute) durur; böylece yazı, altındaki satır
   içerikleriyle birebir aynı eksende (hücrenin tam ortasında) kalır. */
export function HeaderLabel({ children, sortState }: { children: React.ReactNode; sortState: 'asc' | 'des' | null }) {
  return (
    <span className="relative inline-flex items-center justify-center pl-[0.1em]">
      <span>{children}</span>
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 flex items-center">
        <TableSortBadge sortState={sortState} />
      </span>
    </span>
  );
}

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
}

export const CustomSelect = React.memo(function CustomSelect({ value, onChange, options, placeholder = 'Seçiniz...', className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 sm:h-8 bg-zinc-950 hover:bg-zinc-900/70 border border-zinc-700/50  hover:border-zinc-700/80 rounded-xl px-2.5 text-[10px] text-zinc-300 font-bold flex items-center justify-between transition-colors duration-200 ease-out cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        <span className="truncate uppercase">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="custom-select-dropdown"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-md py-1 custom-scrollbar"
          >
            {options.map((option) => (
              <button
                lang="en"
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold transition-colors duration-200 ease-out flex items-center justify-between cursor-pointer ${
                  option.value === value
                    ? 'toggle-item-brand'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span className="truncate uppercase">{smartUpper(option.label)}</span>
                {option.value === value && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

