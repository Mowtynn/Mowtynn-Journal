/**
 * Setup Kalitesi kademesi — renkler ve rozetler için TEK kaynak.
 * Düşük kademe: B-C / B / C / FOMO ya da "ihlal", "disiplinsiz", "intikam", "düşük" içeren kalite etiketleri.
 */
export function isLowQualitySetup(planFidelity?: string | null): boolean {
  const pf = (planFidelity || '').trim().toLocaleLowerCase('tr');
  if (!pf) return false;
  return pf === 'b-c' || pf === 'b' || pf === 'c' || pf === 'fomo' || pf.includes('ihlal') || pf.includes('disiplinsiz') || pf.includes('intikam') || pf.includes('düşük');
}

type SetupQualityTier = 'high' | 'mid' | 'low';
export function setupQualityTier(planFidelity?: string | null): SetupQualityTier | null {
  const pf = (planFidelity || '').trim().toLocaleLowerCase('tr');
  if (!pf) return null;
  if (isLowQualitySetup(pf)) return 'low';
  if (pf === 'a+' || pf === 'tam' || ['uygun', 'sadık', 'kusursuz', 'disiplinli', 'disciplined', 'yüksek', 'high', 'ideal'].some((w) => pf.includes(w))) return 'high';
  if (pf === 'a' || pf === 'kısmen' || ['kısmi', 'partial', 'orta', 'medium'].some((w) => pf.includes(w))) return 'mid';
  return null;
}
