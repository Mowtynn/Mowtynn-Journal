import { Trade } from '../types';

/** Analizlerin (Asia Edge, Asia Range, İşlem Tipi) dayandığı alanlar. Boş kalanlar örneklemi sessizce küçültür. */
export function missingFields(t: Trade): string[] {
  const out: string[] = [];
  // Hesap türü zorunlu: Prop ya da açıkça "Hesapsız" (DEMO); eski kayıtlarda Challenge / Funded ya da hesap bağı
  if (t.prop !== true && !t.accountId && !t.accountCategory) out.push('Hesap');
  if (!t.asiaRange) out.push('Asia Range');
  if (!t.trend) out.push('İşlem Tipi');
  return out;
}

export function logicProblem(t: Trade): string | null {
  if (!t.asset || !t.status) return 'Parite veya durum eksik';
  if (t.status === 'WIN' && t.rr < 0) return 'WIN işlemde R negatif';
  if (t.status === 'LOSS' && t.rr > 0) return 'LOSS işlemde R pozitif';
  if (t.status === 'BREAKEVEN' && t.rr !== 0) return 'BE işlemde R sıfır değil';
  return null;
}

