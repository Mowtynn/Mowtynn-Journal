import { Trade } from '../types';

const hasNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Analizlerin (Asia Edge, MAE/MFE, Asia Range, News Day) dayandığı alanlar. Boş kalanlar örneklemi sessizce küçültür. */
export function missingFields(t: Trade): string[] {
  const out: string[] = [];
  // Hesap seçimi zorunlu: prop hesabı (accountId) ya da açıkça "Hesapsız" (DEMO)
  if (!t.accountId && t.accountCategory !== 'DEMO') out.push('Hesap');
  if (t.accountId && !hasNum(t.riskPct)) out.push('Risk %');
  if (!hasNum(t.stopPips)) out.push('Stop Pip');
  if (!hasNum(t.tpPips)) out.push('TP Pip');
  if (!hasNum(t.maePips)) out.push('MAE Pip');
  if (!hasNum(t.mfePips)) out.push('MFE Pip');
  if (!hasNum(t.asiaRangePips)) out.push('Asia Range Pip');
  if (!t.asiaRange) out.push('Asia Range');
  if (!t.trend) out.push('Trend');
  if (typeof t.newsDay !== 'boolean') out.push('News Day');
  if (!Array.isArray(t.entryModels) || t.entryModels.length === 0) out.push('Entry Model');
  return out;
}

export function logicProblem(t: Trade): string | null {
  if (!t.asset || !t.status) return 'Parite veya durum eksik';
  if (t.status === 'WIN' && t.rr < 0) return 'WIN işlemde R negatif';
  if (t.status === 'LOSS' && t.rr > 0) return 'LOSS işlemde R pozitif';
  if (t.status === 'BREAKEVEN' && t.rr !== 0) return 'BE işlemde R sıfır değil';
  return null;
}

