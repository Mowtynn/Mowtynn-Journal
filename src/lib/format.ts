/**
 * Ortak sayı biçimleri — bütün ekranlarda aynı görünüm için tek kaynak.
 * R değeri: işaretli, sabit ondalık, birim bitişik → "+1.85R", "-0.50R", "0.00R".
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

/** İşaretli R: "+1.85R" */
export const formatR = (v: number, d = 2): string => `${signed(v, d)}R`;

/** İşaretsiz R (büyüklük; drawdown, kaçırılan R gibi): "5.50R" */
export const formatRAbs = (v: number, d = 2): string => `${fixed(Math.abs(Number.isFinite(v) ? v : 0), d)}R`;

/** Yüzde: "%55.4"; eksi değerde işaret başta ("-%12.5") */
export const formatPct = (v: number, d = 1): string => {
  const s = fixed(Math.abs(Number.isFinite(v) ? v : 0), d);
  return `${Number.isFinite(v) && v < 0 && Number(s) !== 0 ? '-' : ''}%${s}`;
};

/** Dolar: tam sayıysa kuruşsuz, değilse iki hane ("$55,517.50"); eksi işaret başta ("-$540") */
export const formatMoney = (v: number): string => {
  const x = Number.isFinite(v) ? v : 0;
  const cents = Math.round(Math.abs(x) * 100);
  const whole = cents % 100 === 0;
  const body = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  return `${x < 0 && cents !== 0 ? '-' : ''}$${body}`;
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
