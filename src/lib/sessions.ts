/**
 * Bilinen session adlarının New York saatiyle aralıkları (ICT kill zone'ları). Tanımlarda özel ad verilmiş
 * session'lar eşleşmez: onlara otomatik öneri yapılmaz.
 */
const SESSION_WINDOWS_NY: { re: RegExp; from: number; to: number }[] = [
  { re: /^asia/i, from: 20 * 60, to: 24 * 60 },
  { re: /^london/i, from: 2 * 60, to: 5 * 60 },
  { re: /^(ny|new york)\s*am/i, from: 7 * 60, to: 10 * 60 },
  { re: /^(ny\s*)?lunch/i, from: 12 * 60, to: 13 * 60 },
  { re: /^(ny|new york)\s*pm/i, from: 13 * 60 + 30, to: 16 * 60 },
];

const windowOf = (name: string) => SESSION_WINDOWS_NY.find((w) => w.re.test(name.trim()));

/**
 * NY saati "HH:mm" hangi tanımlı session'ın aralığına düşüyorsa onun adı (tanım listesindeki yazımıyla).
 * Aralık dışı, geçersiz saat ya da eşleşen tanım yoksa null.
 */
export function sessionForNyTime(hhmm: string, sessions: string[]): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return null;
  const t = Number(m[1]) * 60 + Number(m[2]);
  if (!(t >= 0 && t < 24 * 60)) return null;
  for (const s of sessions) {
    const w = windowOf(s);
    if (w && t >= w.from && t < w.to) return s;
  }
  return null;
}
