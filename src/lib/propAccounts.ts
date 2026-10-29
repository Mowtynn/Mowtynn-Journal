import { PropAccount, PropBalanceAdjustment, PropCertificate, PropStageRule, Trade } from '../types';
import { nyDateKey } from './tradingTime';
import { titleCase } from '../constants/constants';

/** localStorage anahtarı ve bulut ayar alanı */
export const PROP_ACCOUNTS_KEY = 'tj_prop_accounts';

const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const isImage = (v: any): v is string => typeof v === 'string' && (v.startsWith('data:image') || v.startsWith('https://'));

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const isFunded = (a: Pick<PropAccount, 'stage'>) => a.stage === 0;

export const stageLabel = (a: Pick<PropAccount, 'stage'>) => (a.stage === 0 ? 'Funded' : `Phase ${a.stage}`);

export const accountDisplayName = (chainName: string, stage: number) =>
  `${chainName} · ${stage === 0 ? 'Funded' : `Phase ${stage}`}`;

/** Aşamanın kuralı: hedef (Funded'da yok) ve max drawdown */
export function stageRule(a: Pick<PropAccount, 'stage' | 'phaseRules' | 'fundedMaxDdPct'>): { targetPct?: number; maxDdPct: number } {
  if (a.stage === 0) return { maxDdPct: a.fundedMaxDdPct };
  const r = a.phaseRules[a.stage - 1] || a.phaseRules[a.phaseRules.length - 1];
  return r ? { targetPct: r.targetPct, maxDdPct: r.maxDdPct } : { maxDdPct: a.fundedMaxDdPct };
}

function sanitizeCertificate(c: any): PropCertificate | null {
  if (!c || typeof c !== 'object') return null;
  const kind = c.kind === 'PAYOUT' ? 'PAYOUT' : c.kind === 'FUNDED' ? 'FUNDED' : null;
  if (!kind) return null;
  const amount = num(c.amount, NaN);
  return {
    id: str(c.id) || newId('cert'),
    kind,
    date: typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : nyDateKey(Date.now()),
    amount: kind === 'PAYOUT' && Number.isFinite(amount) && amount >= 0 ? amount : undefined,
    image: isImage(c.image) ? c.image : undefined,
    note: str(c.note),
    createdAt: num(c.createdAt, Date.now()),
  };
}

function sanitizeAdjustment(a: any): PropBalanceAdjustment | null {
  if (!a || typeof a !== 'object') return null;
  const amount = num(a.amount, NaN);
  if (!Number.isFinite(amount)) return null;
  return { id: str(a.id) || newId('adj'), at: num(a.at, Date.now()), amount, realBalance: num(a.realBalance) };
}

/**
 * Yedekten / buluttan gelen ham listeyi doğrular; bozuk kayıtları atar.
 * Önceki sürümün kayıtları (type / dailyDrawdownPct / profitTargetPct) yeni zincir yapısına çevrilir.
 */
export function sanitizePropAccounts(raw: any): PropAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: PropAccount[] = [];
  raw.forEach((a) => {
    if (!a || typeof a !== 'object' || typeof a.id !== 'string') return;
    const size = num(a.size);
    if (size <= 0) return;
    const legacy = !Array.isArray(a.phaseRules);
    const maxDd = Math.max(0, num(a.maxDrawdownPct, 10));
    const phaseRules: PropStageRule[] = legacy
      ? [{ targetPct: num(a.profitTargetPct, 10) || 10, maxDdPct: maxDd }]
      : a.phaseRules
          .map((r: any) => ({ targetPct: Math.max(0, num(r?.targetPct)), maxDdPct: Math.max(0, num(r?.maxDdPct)) }))
          .filter((r: PropStageRule) => r.maxDdPct > 0);
    const stage = legacy ? (a.type === 'FUNDED' ? 0 : 1) : Math.max(0, Math.min(phaseRules.length, Math.round(num(a.stage))));
    // Hesap ve firma adları baş harfleri büyük (FTMO 10K · Phase 1); eşleştirme harf duyarsız olduğu için bağ kopmaz
    const chainName = titleCase(str(a.chainName) || str(a.name)) || 'Hesap';
    out.push({
      id: a.id,
      chainId: str(a.chainId) || a.id,
      chainName,
      // Eski kayıtların adı korunur (işlemler bu adla bağlı olabilir)
      name: titleCase(str(a.name)) || accountDisplayName(chainName, stage),
      firm: titleCase(str(a.firm)),
      size,
      drawdownMode: a.drawdownMode === 'TRAILING' ? 'TRAILING' : 'STATIC',
      stage,
      phaseRules,
      fundedMaxDdPct: Math.max(0, num(a.fundedMaxDdPct, maxDd)) || maxDd,
      riskPct: num(a.riskPct) > 0 ? num(a.riskPct) : 1,
      fee: num(a.fee) > 0 ? num(a.fee) : undefined,
      status: ['ACTIVE', 'PASSED', 'BLOWN', 'ARCHIVED'].includes(a.status) ? a.status : 'ACTIVE',
      createdAt: num(a.createdAt, Date.now()),
      closedAt: num(a.closedAt) > 0 ? num(a.closedAt) : undefined,
      startDate: num(a.startDate) > 0 ? num(a.startDate) : undefined,
      note: str(a.note) || str(a.closeNote),
      images: Array.isArray(a.images) ? a.images.filter(isImage) : undefined,
      adjustments: Array.isArray(a.adjustments) ? (a.adjustments.map(sanitizeAdjustment).filter(Boolean) as PropBalanceAdjustment[]) : undefined,
      certificates: Array.isArray(a.certificates) ? (a.certificates.map(sanitizeCertificate).filter(Boolean) as PropCertificate[]) : undefined,
    });
  });
  return out;
}

export function loadPropAccounts(): PropAccount[] {
  try {
    const raw = localStorage.getItem(PROP_ACCOUNTS_KEY);
    return raw ? sanitizePropAccounts(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

const sameName = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Bir işlem bu hesaba mı ait? Önce kesin bağ (accountId); bağsız işlemler için ad + başlangıç tarihi. */
export function tradeBelongsTo(t: Trade, a: PropAccount): boolean {
  if (t.accountId) return t.accountId === a.id;
  if (!a.startDate || !sameName(t.platform, a.name)) return false;
  if (t.createdAt < a.startDate) return false;
  if (a.closedAt && t.createdAt > a.closedAt) return false;
  return true;
}

/** 1R'nin dolar karşılığı (hesap boyutu × risk %) */
export function defaultRiskAmount(a: Pick<PropAccount, 'size' | 'riskPct'>): number {
  return Math.round(a.size * a.riskPct) / 100;
}

/** İşlemin hesaba dolar etkisi: R × işlemin risk tutarı (riskAmount yoksa hesabın 1R'si) */
export function tradeDollarImpact(t: Trade, a?: Pick<PropAccount, 'size' | 'riskPct'>): number {
  const risk = typeof t.riskAmount === 'number' && t.riskAmount > 0 ? t.riskAmount : a ? defaultRiskAmount(a) : 0;
  return Number.isFinite(t.rr) ? t.rr * risk : 0;
}

export interface PropAccountMetrics {
  trades: Trade[];
  tradeCount: number;
  balance: number;
  netPnl: number;            // işlemler + düzeltmeler
  adjustmentsTotal: number;
  peak: number;
  maxDdAmount: number;
  maxLossFloor: number;
  maxLossRemaining: number;  // tabana kalan ($); negatifse aşılmış
  maxBreached: boolean;      // geçmişte herhangi bir anda taban aşıldı mı
  target?: number;           // hedef kâr ($)
  targetRemaining?: number;
  targetReached: boolean;
  rUnit: number;             // 1R ($)
  payoutTotal: number;
  payoutCount: number;
}

/**
 * Hesap metrikleri. Bakiye = boyut + işlemlerin dolar etkisi + bakiye düzeltmeleri (zaman sırasıyla).
 * STATIC: taban = boyut × (1 − DD%). TRAILING: taban = min(boyut, en yüksek bakiye − boyut × DD%).
 */
export function computeAccountMetrics(a: PropAccount, allTrades: Trade[]): PropAccountMetrics {
  const trades = allTrades.filter((t) => tradeBelongsTo(t, a)).sort((x, y) => x.createdAt - y.createdAt);
  const rule = stageRule(a);
  const maxDdAmount = (a.size * rule.maxDdPct) / 100;
  const events: { at: number; amount: number }[] = [
    ...trades.map((t) => ({ at: t.createdAt, amount: tradeDollarImpact(t, a) })),
    ...(a.adjustments || []).map((x) => ({ at: x.at, amount: x.amount })),
  ].sort((x, y) => x.at - y.at);

  const floorFor = (peak: number) => (a.drawdownMode === 'TRAILING' ? Math.min(a.size, peak - maxDdAmount) : a.size - maxDdAmount);
  let balance = a.size;
  let peak = a.size;
  let breached = false;
  events.forEach((e) => {
    balance += e.amount;
    if (balance > peak) peak = balance;
    if (maxDdAmount > 0 && balance <= floorFor(peak)) breached = true;
  });

  const maxLossFloor = floorFor(peak);
  const netPnl = balance - a.size;
  const target = rule.targetPct ? (a.size * rule.targetPct) / 100 : undefined;
  const payouts = (a.certificates || []).filter((c) => c.kind === 'PAYOUT');
  return {
    trades,
    tradeCount: trades.length,
    balance,
    netPnl,
    adjustmentsTotal: (a.adjustments || []).reduce((s, x) => s + x.amount, 0),
    peak,
    maxDdAmount,
    maxLossFloor,
    maxLossRemaining: balance - maxLossFloor,
    maxBreached: breached,
    target,
    targetRemaining: target !== undefined ? Math.max(0, target - netPnl) : undefined,
    targetReached: target !== undefined && netPnl >= target,
    rUnit: defaultRiskAmount(a),
    payoutTotal: payouts.reduce((s, c) => s + (c.amount || 0), 0),
    payoutCount: payouts.length,
  };
}

/** Bir zincirin hesapları (aşama sırasına göre: Phase 1, Phase 2, …, Funded) */
export interface PropChain {
  chainId: string;
  chainName: string;
  accounts: PropAccount[];
  current: PropAccount;           // aktif hesap, yoksa son hesap
  reachedFunded: boolean;
  isActive: boolean;              // aktif hesabı var
  outcome: 'ONGOING' | 'FUNDED' | 'FAILED';
  fee: number;
  payoutTotal: number;
  payoutCount: number;
  lastActivity: number;
}

const stageOrder = (s: number) => (s === 0 ? 1000 : s);

export function groupChains(accounts: PropAccount[]): PropChain[] {
  const map = new Map<string, PropAccount[]>();
  accounts.forEach((a) => {
    const list = map.get(a.chainId) || [];
    list.push(a);
    map.set(a.chainId, list);
  });
  const chains: PropChain[] = [];
  map.forEach((list, chainId) => {
    list.sort((x, y) => stageOrder(x.stage) - stageOrder(y.stage) || x.createdAt - y.createdAt);
    const active = list.find((a) => a.status === 'ACTIVE');
    const current = active || list[list.length - 1];
    const reachedFunded = list.some((a) => a.stage === 0);
    const payouts = list.flatMap((a) => (a.certificates || []).filter((c) => c.kind === 'PAYOUT'));
    chains.push({
      chainId,
      chainName: list[0].chainName,
      accounts: list,
      current,
      reachedFunded,
      isActive: !!active,
      // Funded'a ulaşan zincir başarılı sayılır (sonradan patlasa da). Ulaşmadan aktif hesabı kalmayan zincir başarısızdır.
      outcome: reachedFunded ? 'FUNDED' : active ? 'ONGOING' : 'FAILED',
      fee: list.reduce((s, a) => s + (a.fee || 0), 0),
      payoutTotal: payouts.reduce((s, c) => s + (c.amount || 0), 0),
      payoutCount: payouts.length,
      lastActivity: Math.max(...list.map((a) => a.closedAt || a.createdAt)),
    });
  });
  return chains.sort((x, y) => Number(y.isActive) - Number(x.isActive) || y.lastActivity - x.lastActivity);
}

export interface PropBalanceSheet {
  feeTotal: number;
  payoutTotal: number;
  net: number;
  fundedChains: number;
  resolvedChains: number;
  passRate?: number; // 0–100; sonuçlanan zincir yoksa tanımsız
}

/** Prop bilançosu. Geçme oranı = funded'a ulaşan zincir ÷ sonuçlanan zincir (devam edenler hariç). */
export function computeBalanceSheet(chains: PropChain[]): PropBalanceSheet {
  const feeTotal = chains.reduce((s, c) => s + c.fee, 0);
  const payoutTotal = chains.reduce((s, c) => s + c.payoutTotal, 0);
  const fundedChains = chains.filter((c) => c.outcome === 'FUNDED').length;
  const resolvedChains = chains.filter((c) => c.outcome !== 'ONGOING').length;
  return {
    feeTotal,
    payoutTotal,
    net: payoutTotal - feeTotal,
    fundedChains,
    resolvedChains,
    passRate: resolvedChains > 0 ? (fundedChains / resolvedChains) * 100 : undefined,
  };
}

/** Hesaplardaki tüm görseller (Storage temizliği ve yedek için) */
export function collectAccountImages(accounts: PropAccount[]): string[] {
  const out: string[] = [];
  accounts.forEach((a) => {
    (a.images || []).forEach((i) => out.push(i));
    (a.certificates || []).forEach((c) => c.image && out.push(c.image));
  });
  return out;
}

/** Hesaplardaki her görseli dönüştürür (yedekte URL → data URL, içe aktarmada data URL → Storage URL) */
export async function mapAccountImages(
  accounts: PropAccount[],
  fn: (img: string) => Promise<string>,
): Promise<PropAccount[]> {
  const out: PropAccount[] = [];
  for (const a of accounts) {
    const images = a.images ? await Promise.all(a.images.map(fn)) : undefined;
    const certificates = a.certificates
      ? await Promise.all(a.certificates.map(async (c) => (c.image ? { ...c, image: await fn(c.image) } : c)))
      : undefined;
    out.push({ ...a, images, certificates });
  }
  return out;
}

export const ACCOUNT_STATUS_LABEL: Record<PropAccount['status'], string> = {
  ACTIVE: 'Aktif',
  PASSED: 'Geçti',
  BLOWN: 'Patladı',
  ARCHIVED: 'Arşiv',
};
