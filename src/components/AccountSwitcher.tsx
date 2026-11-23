import React from 'react';
import { Trophy, Shield } from 'lucide-react';
import { AccountCategory } from '../types';

/**
 * Üst çubuktaki hesap kapsamı seçicisi: PROP · HESAPSIZ (iki parçalı düğme).
 * Seçim işlem listesini, analizi, günlüğü ve haftalık değerlendirmeyi birlikte kapsar.
 */

interface AccountSwitcherProps {
  activeCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  counts: Record<AccountCategory, number>;
}

const OPTIONS: { id: AccountCategory; label: string; icon: React.ReactNode; on: string; badgeOn: string }[] = [
  {
    id: 'PROP',
    label: 'PROP',
    icon: <Trophy size={12} className="shrink-0" />,
    on: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
    badgeOn: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
  {
    id: 'DEMO',
    label: 'HESAPSIZ',
    icon: <Shield size={12} className="shrink-0" />,
    on: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    badgeOn: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  },
];

export const AccountSwitcher: React.FC<AccountSwitcherProps> = React.memo(({ activeCategory, onSelect, counts }) => (
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
          className={`h-full flex items-center gap-1 px-1.5 sm:px-2 rounded-md border text-label font-black font-sans tracking-wide transition-ui cursor-pointer ${
            sel ? o.on : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80'
          }`}
        >
          {o.icon}
          <span className="hidden min-[380px]:inline">{o.label}</span>
          <span
            className={`inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 text-label font-bold tabular-nums leading-none rounded border ${
              sel ? o.badgeOn : 'bg-zinc-800/90 text-zinc-500 border-zinc-700/60'
            }`}
          >
            {counts[o.id]}
          </span>
        </button>
      );
    })}
  </div>
));
