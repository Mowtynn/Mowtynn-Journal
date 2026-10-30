import type { Trade } from '../types';
import { edgeFromR, type EdgeStats } from './asiaAnalytics';

/**
 * Edge'in zamanla değişimi: son N işlemin beklentisi, öncesindeki işlemlerle karşılaştırılır.
 * Fark, iki ortalamanın standart hatasıyla ölçülür (Welch): |z| ≥ 1.96 → kesin, 1 ≤ |z| < 1.96 → erken sinyal.
 * Karşılaştırma ancak her iki tarafta da yeterli işlem varken yapılır (aksi halde "veri az").
 */
export const DRIFT_RECENT = 20;
export const DRIFT_MIN_TOTAL = 40;

export type DriftDirection = 'WEAKENING' | 'IMPROVING' | 'STABLE';
export interface EdgeDrift {
  ready: boolean;
  /** Karşılaştırma için gereken toplam işlem */
  need: number;
  n: number;
  recent: EdgeStats | null;
  before: EdgeStats | null;
  /** recent − before (R / işlem) */
  diff: number;
  z: number;
  direction: DriftDirection;
  strength: 'CONFIRMED' | 'EARLY' | null;
}

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);

export function computeEdgeDrift(trades: Trade[], recentN = DRIFT_RECENT, minTotal = DRIFT_MIN_TOTAL): EdgeDrift {
  const sorted = [...trades].filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr)).sort((a, b) => a.createdAt - b.createdAt);
  return driftFromR(sorted.map(rOf), sorted.map((t) => t.status), recentN, minTotal);
}

/** Kronolojik R dizisi üzerinden zamanla değişim (kurulum karnesi satırları da bunu kullanır) */
export function driftFromR(rs: number[], st: Trade['status'][], recentN = DRIFT_RECENT, minTotal = DRIFT_MIN_TOTAL): EdgeDrift {
  const n = rs.length;
  const base: EdgeDrift = { ready: false, need: minTotal, n, recent: null, before: null, diff: 0, z: 0, direction: 'STABLE', strength: null };
  if (n < minTotal) return base;
  const recent = edgeFromR(rs.slice(-recentN), st.slice(-recentN));
  const before = edgeFromR(rs.slice(0, n - recentN), st.slice(0, n - recentN));
  const diff = recent.expectancy - before.expectancy;
  const se = Math.sqrt((recent.sd * recent.sd) / recent.n + (before.sd * before.sd) / before.n);
  const z = se > 0 ? diff / se : 0;
  const strength = Math.abs(z) >= 1.96 ? 'CONFIRMED' : Math.abs(z) >= 1 ? 'EARLY' : null;
  return {
    ready: true,
    need: minTotal,
    n,
    recent,
    before,
    diff,
    z,
    direction: strength ? (diff < 0 ? 'WEAKENING' : 'IMPROVING') : 'STABLE',
    strength,
  };
}
