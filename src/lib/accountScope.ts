import type { AccountCategory, Trade } from '../types';
import { getTradeAccountKind, ACCOUNT_KIND_LABELS } from '../constants/constants';

/**
 * Hesap kapsamı — üst çubuktaki seçici: PROP ya da HESAPSIZ.
 * Tek kaynak: işlem listesi, analiz, günlük ve haftalık değerlendirme aynı kapsamı kullanır.
 * Hesapsız (demo / backtest) işlemler Prop istatistiklerine karışmaz.
 */

export function inScope(t: Trade, category: AccountCategory): boolean {
  return getTradeAccountKind(t) === category;
}

export function scopeTrades(trades: Trade[], category: AccountCategory): Trade[] {
  return trades.filter((t) => inScope(t, category));
}

/**
 * Kalıcı anahtar (haftalık değerlendirme kaydının kimliğinde kullanılır).
 * Prop için boş: eski kayıtlar (weekly-<pazartesi>, eskiden "tüm prop hesapları") Prop kapsamına ait kalır.
 */
export function scopeKey(category: AccountCategory): string {
  return category === 'DEMO' ? 'demo' : '';
}

/** Ekranda gösterilen ad */
export function scopeLabel(category: AccountCategory): string {
  return ACCOUNT_KIND_LABELS[category];
}
