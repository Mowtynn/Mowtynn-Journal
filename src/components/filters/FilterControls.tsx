import React from 'react';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';
import { caseInsensitiveEquals, smartUpper } from '../../constants/constants';

/* ------------------------------------------------------------------ */
/* Ortak filtre parçaları: projedeki tüm filtreler bu boyut, renk ve    */
/* yazı ölçüsünü kullanır (Filtreleme menüsü, işlem listesi, analiz).  */
/* ------------------------------------------------------------------ */

/** Filtre alanı başlığı */
export const FILTER_LABEL = 'text-[10px] uppercase font-bold tracking-wider text-zinc-400';

/** Filtrelerdeki sayı / metin kutusu */
export const FILTER_INPUT =
  'w-full h-8 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg px-2.5 text-xs font-bold text-zinc-100 placeholder-zinc-500 focus:outline-none transition-ui [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/** Filtrelerdeki açılır seçim kutusu (native select) */
export const FILTER_SELECT =
  'h-8 sm:h-7 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 focus:border-blue-500 rounded-lg px-2 text-[11px] font-bold font-sans text-zinc-200 focus:outline-none transition-ui cursor-pointer';

/** Seçili renk: "Tümü" nötr, genel seçim marka mavisi; sonuç / yön için kazanç yeşili, kayıp kırmızısı (projedeki WIN / LOSS / BE renkleriyle aynı) */
export type FilterTone = 'brand' | 'win' | 'loss' | 'neutral';
const TONE_ACTIVE: Record<FilterTone, string> = {
  brand: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  win: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  loss: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
  /** "Tümü" (filtre yok) seçimi: nötr */
  neutral: 'bg-zinc-800 border-zinc-600/70 text-zinc-100',
};
const CHIP_IDLE = 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200';

/** Tek filtre düğmesi (çoklu ya da tekli seçim) */
export const FilterChip = ({
  active,
  onClick,
  children,
  tone = 'brand',
  check = true,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: FilterTone;
  /** Seçiliyken tik işareti (çoklu seçimde açık, "Tümü" gibi tekli seçimde kapalı) */
  check?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    lang="en"
    aria-pressed={active}
    title={title}
    onClick={onClick}
    className={`h-8 sm:h-7 px-2.5 inline-flex items-center gap-1 rounded-lg border text-[10px] font-bold font-sans uppercase tracking-wider whitespace-nowrap transition-ui cursor-pointer select-none ${
      active ? TONE_ACTIVE[tone] : CHIP_IDLE
    }`}
  >
    {active && check && <Check size={10} className="shrink-0" />}
    {/* Türkçe ve İngilizce karışık etiketler doğru büyük harfe çevrilir (Giriş → GİRİŞ, Session → SESSION) */}
    {typeof children === 'string' ? smartUpper(children) : children}
  </button>
);

/** Düğme satırı (sarılır) */
export const FilterChipRow = ({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) => (
  <div className={`flex flex-wrap gap-1.5 p-1 ${scroll ? 'max-h-36 overflow-y-auto custom-scrollbar' : ''}`}>{children}</div>
);

const toggleIn = (list: string[], v: string) =>
  list.some((x) => caseInsensitiveEquals(x, v)) ? list.filter((x) => !caseInsensitiveEquals(x, v)) : [...list, v];

/** Çoklu seçim: boş seçim = "Tümü" */
export const PillMultiSelect = ({
  options,
  selectedValues,
  onChange,
}: {
  options: string[];
  selectedValues: string[];
  onChange: (v: string[]) => void;
  /** Eski çağrılar için kabul edilir; tüm listeler aynı (marka) seçili rengi kullanır */
  activeColor?: string;
}) => (
  <FilterChipRow scroll>
    <FilterChip tone="neutral" active={selectedValues.length === 0} check={false} onClick={() => onChange([])}>
      Tümü ({options.length})
    </FilterChip>
    {options.map((option) => (
      <FilterChip
        key={option}
        active={selectedValues.some((v) => caseInsensitiveEquals(v, option))}
        onClick={() => onChange(toggleIn(selectedValues, option))}
      >
        {option}
      </FilterChip>
    ))}
  </FilterChipRow>
);

/** İşlem sonucu (WIN / LOSS / BREAKEVEN), çoklu */
export const StatusMultiSelect = ({ selectedValues, onChange }: { selectedValues: string[]; onChange: (v: string[]) => void }) => (
  <FilterChipRow>
    <FilterChip tone="neutral" active={selectedValues.length === 0} check={false} onClick={() => onChange([])}>
      Tümü
    </FilterChip>
    {([['WIN', 'win'], ['LOSS', 'loss'], ['BREAKEVEN', 'brand']] as const).map(([v, tone]) => (
      <FilterChip key={v} tone={tone} active={selectedValues.some((x) => caseInsensitiveEquals(x, v))} onClick={() => onChange(toggleIn(selectedValues, v))}>
        {v}
      </FilterChip>
    ))}
  </FilterChipRow>
);

/** Yön (LONG / SHORT), çoklu */
export const TypeMultiSelect = ({ selectedValues, onChange }: { selectedValues: string[]; onChange: (v: string[]) => void }) => (
  <FilterChipRow>
    <FilterChip tone="neutral" active={selectedValues.length === 0} check={false} onClick={() => onChange([])}>
      Tümü
    </FilterChip>
    {([['LONG', 'win'], ['SHORT', 'loss']] as const).map(([v, tone]) => (
      <FilterChip key={v} tone={tone} active={selectedValues.includes(v)} onClick={() => onChange(toggleIn(selectedValues, v))}>
        {v}
      </FilterChip>
    ))}
  </FilterChipRow>
);


export interface FilterAccordionRowProps {
  icon: React.ReactNode;
  title: string;
  summaryText: string;
  badgeCount?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const FilterAccordionRow: React.FC<FilterAccordionRowProps> = ({
  icon,
  title,
  summaryText,
  badgeCount = 0,
  isOpen,
  onToggle,
  children
}) => {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors duration-200 ease-out text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0">{icon}</div>
          <span className="text-xs font-bold font-sans text-zinc-200 uppercase tracking-wider shrink-0">
            {title}
          </span>
          <span className="text-xs font-sans text-zinc-400 truncate hidden sm:inline-block uppercase">
            — {summaryText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {badgeCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {badgeCount} seçili
            </span>
          ) : (
            <span className="text-[10px] font-sans text-zinc-400 hidden xs:inline">Tümü</span>
          )}
          <div className="text-zinc-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      <div 
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out will-change-[grid-template-rows,opacity] ${
          isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-zinc-800' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden bg-zinc-900">
          <div className="p-2.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
