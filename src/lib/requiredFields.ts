import type { Trade } from '../types';

/**
 * Zorunlu alan ayarı: tam kayıtta (Hızlı Kayıt hariç) boş bırakılamayacak alanlar.
 * Parite, yön, sonuç / R, hesap ve News Day her zaman zorunludur; burada analizleri besleyen ek alanlar seçilir.
 */
export const REQUIRABLE_FIELDS = [
  { id: 'asiaRange', label: 'Asia Range', missing: (t: Partial<Trade>) => !t.asiaRange },
  { id: 'sweepTime', label: 'Sweep Time', missing: (t: Partial<Trade>) => !t.sweepTime },
  { id: 'session', label: 'Session', missing: (t: Partial<Trade>) => !t.session },
  { id: 'entryModels', label: 'Entry Model', missing: (t: Partial<Trade>) => !t.entryModels?.length },
  { id: 'confirmations', label: 'PD Array', missing: (t: Partial<Trade>) => !t.confirmations?.length },
  { id: 'stopPips', label: 'Stop Pip', missing: (t: Partial<Trade>) => !(typeof t.stopPips === 'number' && t.stopPips > 0) },
  { id: 'tpPips', label: 'TP Pip', missing: (t: Partial<Trade>) => !(typeof t.tpPips === 'number' && t.tpPips > 0) },
  { id: 'asiaRangePips', label: 'Asia Range Pip', missing: (t: Partial<Trade>) => !(typeof t.asiaRangePips === 'number' && t.asiaRangePips > 0) },
  { id: 'planFidelity', label: 'Setup Kalitesi', missing: (t: Partial<Trade>) => !t.planFidelity },
  { id: 'management', label: 'İşlem Yönetimi', missing: (t: Partial<Trade>) => !t.management?.length },
  { id: 'exitAt', label: 'Çıkış Saati', missing: (t: Partial<Trade>) => typeof t.exitAt !== 'number' },
  { id: 'maePips', label: 'MAE Pip', missing: (t: Partial<Trade>) => typeof t.maePips !== 'number' },
  { id: 'mfePips', label: 'MFE Pip', missing: (t: Partial<Trade>) => typeof t.mfePips !== 'number' },
  { id: 'trend', label: 'Trend Yapısı', missing: (t: Partial<Trade>) => !t.trend },
  { id: 'htfTimeframe', label: 'Timeframe', missing: (t: Partial<Trade>) => !t.htfTimeframe },
  { id: 'timeframe', label: 'Entry Timeframe', missing: (t: Partial<Trade>) => !t.timeframe },
  { id: 'tpTargets', label: 'Target', missing: (t: Partial<Trade>) => !t.tpTargets?.length },
  { id: 'premiumDiscount', label: 'Confirmations', missing: (t: Partial<Trade>) => !t.premiumDiscount },
  { id: 'asiaRangeFvg', label: 'Asia Range FVG', missing: (t: Partial<Trade>) => !t.asiaRangeFvg },
] as const;

export type RequirableField = (typeof REQUIRABLE_FIELDS)[number]['id'];

export const DEFAULT_REQUIRED_FIELDS: RequirableField[] = [
  'asiaRange', 'sweepTime', 'session', 'entryModels', 'confirmations', 'stopPips', 'tpPips', 'asiaRangePips', 'planFidelity', 'management',
];

const KEY = 'tj_required_fields';
export const REQUIRED_FIELDS_EVENT = 'tj_required_fields_updated';

export function loadRequiredFields(): RequirableField[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const ids = REQUIRABLE_FIELDS.map((f) => f.id as string);
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.filter((x): x is RequirableField => ids.includes(x));
    }
  } catch {
    /* depolama yoksa varsayılan */
  }
  return DEFAULT_REQUIRED_FIELDS;
}

export function saveRequiredFields(list: RequirableField[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(REQUIRED_FIELDS_EVENT));
  } catch {
    /* yok say */
  }
}

/** Tam kayıtta eksik kalan zorunlu alanların adları */
export function missingRequired(t: Partial<Trade>, required: RequirableField[] = loadRequiredFields()): string[] {
  return REQUIRABLE_FIELDS.filter((f) => required.includes(f.id) && f.missing(t)).map((f) => f.label);
}

/** Buluttan gelen ayar: geçerli kimlikler cihaza yazılır (değişiklik olayı tetiklenmez) */
export function applyRequiredFieldsFromCloud(list: unknown[]): void {
  const ids = REQUIRABLE_FIELDS.map((f) => f.id as string);
  const clean = list.filter((x): x is RequirableField => typeof x === 'string' && ids.includes(x));
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* yok say */
  }
}
