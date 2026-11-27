import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield } from 'lucide-react';
import { AccountCategory } from '../types';
import { SPRING, EASE } from '../lib/motion';

/**
 * Üst çubuktaki hesap kapsamı seçicisi: PROP · HESAPSIZ (iki parçalı düğme).
 * Seçim işlem listesini, analizi, günlüğü ve haftalık değerlendirmeyi birlikte kapsar.
 * Geçiş: seçili zemin projedeki diğer seçiciler gibi yayla kayar, rengi maviden (Prop) sarıya (Hesapsız) yumuşakça döner.
 */

interface AccountSwitcherProps {
  activeCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  counts: Record<AccountCategory, number>;
}

type PillColor = { backgroundColor: string; borderColor: string };
const OPTIONS: { id: AccountCategory; label: string; icon: React.ReactNode; pill: PillColor; text: string; badgeOn: string }[] = [
  {
    id: 'PROP',
    label: 'PROP',
    icon: <Trophy size={12} className="shrink-0" />,
    pill: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' },
    text: 'text-blue-200',
    badgeOn: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
  {
    id: 'DEMO',
    label: 'HESAPSIZ',
    icon: <Shield size={12} className="shrink-0" />,
    pill: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' },
    text: 'text-amber-200',
    badgeOn: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  },
];

export const AccountSwitcher: React.FC<AccountSwitcherProps> = React.memo(({ activeCategory, onSelect, counts }) => {
  // İlk çizimde renk geçişi yok; sonraki geçişlerde zemin önceki seçeneğin renginden yenisine döner
  const mounted = React.useRef(false);
  React.useEffect(() => {
    mounted.current = true;
  }, []);
  return (
  <div role="radiogroup" aria-label="Hesap türü" className="flex items-center h-7 p-0.5 gap-0.5 rounded-lg border border-zinc-700/60 bg-zinc-900 shrink-0 select-none">
    {OPTIONS.map((o) => {
      const sel = activeCategory === o.id;
      return (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={sel}
          onClick={() => onSelect(o.id)}
          className={`relative h-full flex items-center gap-1 px-1.5 sm:px-2 rounded-md text-label font-black font-sans tracking-wide transition-colors duration-200 cursor-pointer ${
            sel ? o.text : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80'
          }`}
        >
          {sel && (
            <motion.span
              layoutId="accountScopeSlide"
              aria-hidden
              initial={mounted.current ? OPTIONS.find((x) => x.id !== o.id)!.pill : false}
              animate={o.pill}
              transition={{ layout: SPRING.indicator, default: { duration: 0.24, ease: EASE } }}
              className="absolute inset-0 rounded-md border pointer-events-none"
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
          {o.icon}
          <span className="hidden min-[380px]:inline">{o.label}</span>
          <span
            className={`inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 text-label font-bold tabular-nums leading-none rounded border transition-colors duration-200 ${
              sel ? o.badgeOn : 'bg-zinc-800/90 text-zinc-500 border-zinc-700/60'
            }`}
          >
            {counts[o.id]}
          </span>
          </span>
        </button>
      );
    })}
  </div>
  );
});
