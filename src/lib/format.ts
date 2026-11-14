/**
 * Ortak sayı biçimleri — bütün ekranlarda aynı görünüm için tek kaynak.
 * R değeri: işaretli, gereksiz sıfırsız, birim bitişik → "+2R", "+2.1R", "-0.5R", "0R".
 */

/** Sabit ondalık; yuvarlanınca sıfır olan değer işaret taşımaz ("-0.00" yazılmaz). Geçersiz sayı 0 sayılır. */
export const fixed = (v: number, d = 2): string => {
  const s = (Number.isFinite(v) ? v : 0).toFixed(d);
  return Number(s) === 0 ? (0).toFixed(d) : s;
};

/** İşaretli sabit ondalık: "+1.85", "-0.50", "0.00" */
export const signed = (v: number, d = 2): string => {
  const s = fixed(v, d);
  return Number(s) > 0 ? `+${s}` : s;
};

/** R sayısı, gereksiz sıfırsız: 2 → "2", 2.10 → "2.1", 0.375 → "0.38" (işlem R'si tek ondalık, ortalamalar en çok iki) */
export const rnum = (v: number, d = 2): string => String(Number(fixed(v, d)));

/** İşaretli R sayısı: "+2", "+2.1", "-0.5", "0" */
export const rsigned = (v: number, d = 2): string => {
  const s = rnum(v, d);
  return Number(s) > 0 ? `+${s}` : s;
};

/** İşaretli R: "+2R", "+2.1R", "-1R", "0R" */
export const formatR = (v: number, d = 2): string => `${rsigned(v, d)}R`;

/** Yüzde: "%55.4"; eksi değerde işaret başta ("-%12.5") */
export const formatPct = (v: number, d = 1): string => {
  const s = fixed(Math.abs(Number.isFinite(v) ? v : 0), d);
  return `${Number.isFinite(v) && v < 0 && Number(s) !== 0 ? '-' : ''}%${s}`;
};

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
/** "2026-11-11" → "11 Kas 2026" (diğer ekranlardaki tarih biçimi); tanınmayan metin aynen döner */
export const formatDateKey = (key: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return key || '';
  const month = MONTHS_TR[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : key;
};

/** Dolar: tam sayıysa kuruşsuz, değilse iki hane ("$55,517.50"); eksi işaret başta ("-$540") */
export const formatMoney = (v: number, signed = false): string => {
  const x = Number.isFinite(v) ? v : 0;
  const cents = Math.round(Math.abs(x) * 100);
  const whole = cents % 100 === 0;
  const body = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  // signed: kazançta da işaret yazılır (+$750), sıfırda işaret yok
  const sign = cents === 0 ? '' : x < 0 ? '-' : signed ? '+' : '';
  return `${sign}$${body}`;
};

/**
 * Sayıdan sonra gelen iyelik eki (Türkçe okunuşa göre): %80'i, %92'si, %100'ü, %30'u, %40'ı.
 * Yalnızca tam sayının son hanesine (sıfırsa onlar / yüzler basamağına) bakar.
 */
export const trPossessive = (n: number): string => {
  const x = Math.abs(Math.round(Number.isFinite(n) ? n : 0));
  const ones = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  if (x === 0) return 'ı'; // sıfır-ı
  if (x % 10 !== 0) return ones[x % 10];
  if (x % 100 !== 0) return tens[(x % 100) / 10];
  if (x % 1000 !== 0) return 'ü'; // yüz-ü
  if (x % 1_000_000 !== 0) return 'i'; // bin-i
  return 'u'; // milyon-u
};
