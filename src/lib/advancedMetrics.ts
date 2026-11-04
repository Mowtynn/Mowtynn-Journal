import { Trade } from '../types';

import { nyWallDate } from './tradingTime';

/**
 * Gelişmiş metrikler panelinin hesapları (R tabanlı):
 * - deadZone: parite × seans matrisi (işlem, kazanç, toplam R)
 * Ekranda gösterilmeyen eski metrikler (SQN, Sharpe, iflas olasılığı, su altı süresi …) kaldırıldı.
 */

export interface DeadZoneCell {
  count: number;
  wins: number;
  rr: number;
}

export interface AdvancedMetrics {
  deadZone: Record<string, Record<string, DeadZoneCell>>;
}

const advancedMetricsCache = new WeakMap<Trade[], AdvancedMetrics | null>();

/** Aynı işlem dizisi için sonucu önbellekler (sekme değişince yeniden hesaplanmaz). */
export const calculateAdvancedMetrics = (closedTrades: Trade[]): AdvancedMetrics | null => {
  const hit = advancedMetricsCache.get(closedTrades);
  if (hit !== undefined) return hit;
  const result = computeAdvancedMetrics(closedTrades);
  advancedMetricsCache.set(closedTrades, result);
  return result;
};

/** ISO hafta anahtarı, New York takvim gününe göre (tarayıcının saat diliminden bağımsız) */
export function nyIsoWeekKey(ts: number): string {
  const d = nyWallDate(ts);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${week}`;
}

function computeAdvancedMetrics(closedTrades: Trade[]): AdvancedMetrics | null {
  if (closedTrades.length === 0) return null;

  const deadZone: AdvancedMetrics['deadZone'] = {};

  for (const t of closedTrades) {
    const r = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;

    if (t.asset) {
      const session = t.session || 'Belirtilmemiş';
      const row = (deadZone[t.asset] ??= {});
      const cell = (row[session] ??= { count: 0, wins: 0, rr: 0 });
      cell.count++;
      if (t.status === 'WIN') cell.wins++;
      cell.rr += r;
    }

  }

  return { deadZone };
}
