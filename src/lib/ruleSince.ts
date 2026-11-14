/**
 * Edge Özeti kurallarının ilk görülme zamanları (localStorage: tj_rule_since) için bakım.
 */
// Kaldırılan girdilere ait kural kayıtları (artık hiçbir kural bu adlarla oluşmaz) depodan temizlenir
const REMOVED_RULE_DIMS = /(?:\||\+ )(?:Entry TF|Timeframe|HTF|PD Array|Sweep→Giriş|İşlem Yönetimi|Yönetim|Asia Range Büyüklüğü|Asia Range Pip|BE sonrası|TP sonrası|Durum)\b/;
export function migrateRuleSince(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || REMOVED_RULE_DIMS.test(k)) return;
    // Sweep Saati → POI Sweep Saati, Trend → İşlem Tipi (alan adları değişti; kuralın ilk görülme zamanı korunur)
    const key = k.replace(/(\||\+ )Sweep Saati/g, '$1POI Sweep Saati').replace(/(\||\+ )Trend:/g, '$1İşlem Tipi:');
    out[key] = out[key] === undefined ? v : Math.min(out[key], v);
  });
  return out;
}
