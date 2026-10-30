import { Trade, JournalEntry, Note } from '../types';
import { getNyParts, getSweepSide, getTradeHourBucket, WEEKDAY_NAMES_TR, nyWallDate, formatDuration } from '../lib/tradingTime';
import { getNewsDayLabels, getTradeAccountCategory, getTradeStageLabel, ACCOUNT_CATEGORY_LABELS } from '../constants/constants';
import { DATASET_LABELS, getTradeDataset } from '../lib/asiaAnalytics';
import { edgeReportRows } from '../lib/edgeSummary';

// Excel kütüphanesi (xlsx, ~400 kB) yalnızca Excel'e aktarırken indirilir; uygulama açılışını yavaşlatmaz.
// PWA önbelleği ilk ziyaretten sonra dosyayı arka planda saklar, sonraki aktarımlar anında olur.
let xlsxPromise: Promise<typeof import('xlsx')> | null = null;
const loadXlsx = () => {
  if (!xlsxPromise) {
    xlsxPromise = import('xlsx').catch((err) => {
      xlsxPromise = null; // bağlantı geri gelince yeniden denenebilsin
      throw new Error('Excel modülü yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', { cause: err });
    });
  }
  return xlsxPromise;
};

export interface ExportOptions {
  title?: string;
  definitionTitles?: Record<string, string>;
}

/**
 * Tarih/saat metni. Proje genelinde tek saat dilimi America/New_York: dışa aktarımda da NY duvar saati yazılır.
 */
export const formatDateTime = (timestamp: number) => {
  const d = nyWallDate(timestamp);
  if (!Number.isFinite(timestamp) || isNaN(d.getTime())) {
    return { date: '-', time: '-' };
  }
  const dateStr = d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date: dateStr, time: timeStr };
};


// ==========================================
// Ortak yazıcılar (CSV ve Excel)
// ==========================================

type Row = Record<string, string | number>;

/**
 * CSV hücresi. Ayırıcı ";" (Türkçe Excel varsayılanı) olduğu için ondalık ayırıcı virgüldür:
 * "2.5" yazılsaydı Türkçe Excel bunu tarih (2 Mayıs) ya da metin olarak açardı.
 * Formül enjeksiyonuna karşı = + - @ ile başlayan METİNLER tek tırnakla başlatılır (sayılar etkilenmez).
 */
export const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return '""';
  let str: string;
  if (typeof v === 'number') str = Number.isFinite(v) ? String(v).replace('.', ',') : '';
  else {
    str = String(v);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

export const rowsToCsv = (rows: Row[]): string => {
  const headers = Object.keys(rows[0] || {});
  const lines = [headers.map(csvCell).join(';'), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(';'))];
  return '\uFEFF' + lines.join('\r\n');
};

const downloadCsv = (rows: Row[], filename: string) => {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Bazı tarayıcılar indirmeyi tıklamadan sonra başlatır; adres hemen iptal edilirse dosya boş iner
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Excel sayfası: uzun metin kısaltılır, sütun genişliği içeriğe göre (en fazla 60) */
const sheetFromRows = (XLSX: typeof import('xlsx'), rows: Row[], minWidth: number) => {
  const safe = rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? fitCell(v) : v])));
  const ws = XLSX.utils.json_to_sheet(safe);
  const keys = Object.keys(safe[0] || {});
  ws['!cols'] = keys.map((key) => {
    let maxLen = key.length;
    safe.forEach((row) => {
      const len = String(row[key] ?? '').split('\n').reduce((m, l) => Math.max(m, l.length), 0);
      if (len > maxLen) maxLen = Math.min(len, 60);
    });
    return { wch: Math.max(maxLen + 3, minWidth) };
  });
  return ws;
};

const summarySheet = (XLSX: typeof import('xlsx'), rows: { Metrik: string; Değer: string | number }[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 35 }, { wch: 30 }];
  return ws;
};

const nowText = () => {
  const x = formatDateTime(Date.now());
  return `${x.date} ${x.time} (New York)`;
};
const xlsxName = (filename: string) => (filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);

// ==========================================
// 📊 TRADE (İŞLEM GEÇMİŞİ) EXPORT UTILITIES
// ==========================================

/** Excel hücre sınırı (32.767 karakter); daha uzun metin kesilip işaretlenir */
const EXCEL_CELL_MAX = 32000;
export const fitCell = (v: string) => (v.length > EXCEL_CELL_MAX ? `${v.slice(0, EXCEL_CELL_MAX)}… (kısaltıldı)` : v);

const listText = (v?: string[] | null) => (Array.isArray(v) && v.length > 0 ? v.join(', ') : '-');
const numOr = (v: unknown): number | '-' => (typeof v === 'number' && Number.isFinite(v) ? v : '-');

/**
 * İşlem satırları: formda girilen her alan eksiksiz bir sütundur (boş alan "-").
 * Sütun adları kullanıcının Tanımlamalar'da verdiği başlıkları kullanır.
 */
export const prepareTradeExportRows = (trades: Trade[], titles: Record<string, string> = {}) => {
  // Kullanıcının verdiği başlık başka bir sütunla aynıysa (ör. iki alana da "Timeframe" denmiş) sütun EZİLMEZ:
  // ikinci sütun "(Alan adı)" ekiyle ayrışır. Sabit sütun adları da (Saat, Gün…) korunur.
  const FIXED = new Set(['Sıra', 'İşlem ID', 'Saat', 'Gün', 'Giriş Saati (saatlik)', 'Çıkış', 'Süre', 'Hesap ID', 'Hesap Türü', 'Aşama', 'Risk (%)', 'Risk ($)', 'Potansiyel R (MFE/Stop)', 'Hedef Tamamlama (MFE/TP %)', 'Süpürülen Asia Tarafı', 'Veri Seti', 'Hızlı Kayıt']);
  const usedLabels = new Map<string, string>();
  const T = (key: string, fallback: string) => {
    const want = (titles[key] && String(titles[key]).trim()) || fallback;
    let label = want;
    const owner = usedLabels.get(label.toLocaleLowerCase('tr'));
    if ((owner && owner !== key) || FIXED.has(label)) label = `${want} (${fallback})`;
    if (label !== want && (usedLabels.has(label.toLocaleLowerCase('tr')) || FIXED.has(label))) label = `${want} [${key}]`;
    usedLabels.set(label.toLocaleLowerCase('tr'), key);
    return label;
  };
  return trades.map((t, index) => {
    usedLabels.clear();
    const { date, time } = formatDateTime(t.createdAt);
    const ny = getNyParts(t.createdAt);
    const hasNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    const stopOk = hasNum(t.stopPips) && t.stopPips > 0;
    const hasExit = hasNum(t.exitAt) && t.exitAt >= t.createdAt;
    const news = getNewsDayLabels();
    const shot = t.screenshot || '';

    return {
      'Sıra': index + 1,
      'İşlem ID': t.id,
      [T('tradeDate', 'Tarih')]: date,
      'Saat': time,
      'Gün': ny ? WEEKDAY_NAMES_TR[ny.weekday] : '-',
      'Giriş Saati (saatlik)': getTradeHourBucket(t),
      'Çıkış': hasExit ? (() => { const x = formatDateTime(t.exitAt as number); return `${x.date} ${x.time}`; })() : '-',
      'Süre': hasExit ? formatDuration((t.exitAt as number) - t.createdAt) : '-',
      [T('assets', 'Parite')]: t.asset || '-',
      [T('direction', 'Yön')]: t.type || '-',
      [T('tradeStatus', 'İşlem Durumu')]: t.status || '-',
      [T('rr', 'Sonuç R')]: Number(t.rr) || 0,
      [T('platforms', 'Hesap')]: t.platform || 'Hesapsız',
      'Hesap ID': t.accountId || '-',
      'Hesap Türü': ACCOUNT_CATEGORY_LABELS[getTradeAccountCategory(t)],
      'Aşama': getTradeStageLabel(t) || '-',
      'Risk (%)': numOr(t.riskPct),
      'Risk ($)': numOr(t.riskAmount),
      [T('stopPips', 'Stop Pip')]: numOr(t.stopPips),
      [T('tpPips', 'TP Pip')]: numOr(t.tpPips),
      [T('maePips', 'MAE Pip')]: numOr(t.maePips),
      [T('mfePips', 'MFE Pip')]: numOr(t.mfePips),
      [T('asiaRangePips', 'Asia Range Pip')]: numOr(t.asiaRangePips),
      'Potansiyel R (MFE/Stop)': hasNum(t.mfePips) && stopOk ? Number(((t.mfePips as number) / (t.stopPips as number)).toFixed(2)) : '-',
      'Hedef Tamamlama (MFE/TP %)': hasNum(t.mfePips) && hasNum(t.tpPips) && t.tpPips > 0 ? Math.round(((t.mfePips as number) / t.tpPips) * 100) : '-',
      [T('asiaRange', 'Asia Range')]: t.asiaRange || '-',
      [T('sweepTime', 'Sweep Time')]: t.sweepTime || '-',
      [T('management', 'İşlem Yönetimi')]: Array.isArray(t.management) && t.management.length ? t.management.join(', ') : '-',
      "Çıkış Sonrası TP'ye Ulaştı": typeof t.afterExitTp === 'boolean' ? (t.afterExitTp ? 'Evet' : 'Hayır') : '-',
      [T('planFidelities', 'Setup Kalitesi')]: t.planFidelity || '-',
      [T('trendTypes', 'Trend Yapısı')]: t.trend || '-',
      [T('newsDays', 'News Day/Bank Holiday')]: typeof t.newsDay === 'boolean' ? (t.newsDay ? news.yes : news.no) : '-',
      [T('asiaRangeFvgs', 'Asia Range FVG')]: t.asiaRangeFvg || '-',
      [T('sessions', 'Session')]: t.session || '-',
      [T('htfTimeframes', 'Timeframe')]: t.htfTimeframe || '-',
      [T('timeframes', 'Entry Timeframe')]: t.timeframe || '-',
      [T('confirmations', 'PD Array')]: listText(t.confirmations),
      [T('entryModels', 'Entry Model')]: listText(t.entryModels),
      [T('tpTargets', 'Target')]: listText(t.tpTargets),
      [T('premiumDiscounts', 'Confirmations')]: t.premiumDiscount || '-',
      'Süpürülen Asia Tarafı': getSweepSide(t) === 'HIGH' ? 'High' : 'Low',
      'Veri Seti': DATASET_LABELS[getTradeDataset(t)],
      'Hızlı Kayıt': t.quickEntry ? 'Evet (eksik alan olabilir)' : 'Hayır',
      [T('notesCard', 'Analiz & Notlar')]: t.notes ? t.notes : '-',
      // Kayıtlı / gömülü görsel hücreye sığmaz; bağlantı ise aynen yazılır
      [T('chartLink', 'Grafik Linki')]: !shot ? '-' : shot.startsWith('data:') || shot.startsWith('fsimg:') ? 'Kayıtlı görsel (uygulamada görüntülenir)' : shot,
    };
  });
};

export const exportTradesToExcel = async (trades: Trade[], filename: string, options?: ExportOptions): Promise<void> => {
  if (!trades || trades.length === 0) throw new Error('Dışa aktarılacak işlem bulunamadı.');
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(XLSX, prepareTradeExportRows(trades, options?.definitionTitles), 10), 'İşlem Geçmişi');
  XLSX.utils.book_append_sheet(workbook, summarySheet(XLSX, tradeSummaryRows(trades, options?.title)), 'Özet İstatistikler');
  const edgeRows = edgeReportRows(trades);
  if (edgeRows.length) XLSX.utils.book_append_sheet(workbook, sheetFromRows(XLSX, edgeRows, 1), 'Edge Raporu');
  XLSX.writeFile(workbook, xlsxName(filename));
};

/** Özet sayfası: projedeki tanımlarla aynı (kazanma oranı = kazanç / tüm işlemler, PF kayıp yoksa ∞) */
export const tradeSummaryRows = (trades: Trade[], title?: string) => {
  const r = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
  const n = trades.length;
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const bes = trades.filter((t) => t.status === 'BREAKEVEN').length;
  const totalR = trades.reduce((acc, t) => acc + r(t), 0);
  const rWin = trades.reduce((acc, t) => acc + Math.max(0, r(t)), 0);
  const rLoss = Math.abs(trades.reduce((acc, t) => acc + Math.min(0, r(t)), 0));
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  const range = sorted.length ? `${formatDateTime(sorted[0].createdAt).date} – ${formatDateTime(sorted[sorted.length - 1].createdAt).date}` : '-';
  return [
    { Metrik: 'Rapor Başlığı', Değer: title || 'İşlem Geçmişi Raporu' },
    { Metrik: 'Dışa Aktarma Tarihi', Değer: nowText() },
    { Metrik: 'İşlem Tarih Aralığı (NY)', Değer: range },
    { Metrik: 'Toplam İşlem Sayısı', Değer: n },
    { Metrik: 'Kazanan İşlemler (WIN)', Değer: wins },
    { Metrik: 'Kaybeden İşlemler (LOSS)', Değer: losses },
    { Metrik: 'Başa Baş İşlemler (BREAKEVEN)', Değer: bes },
    { Metrik: 'Kazanma Oranı (%)', Değer: n > 0 ? Number(((wins / n) * 100).toFixed(1)) : 0 },
    { Metrik: 'Toplam Net R', Değer: Number(totalR.toFixed(2)) },
    { Metrik: 'Beklenti (R / işlem)', Değer: n > 0 ? Number((totalR / n).toFixed(3)) : 0 },
    { Metrik: 'Kâr Faktörü (R bazlı)', Değer: rLoss > 0 ? Number((rWin / rLoss).toFixed(2)) : rWin > 0 ? '∞' : 0 },
  ];
};

export const exportTradesToCSV = (trades: Trade[], filename: string, options?: ExportOptions) => {
  if (!trades || trades.length === 0) throw new Error('Dışa aktarılacak işlem bulunamadı.');
  // CSV'de metin bölünmez (notlardaki satır sonları tırnak içinde korunur)
  downloadCsv(prepareTradeExportRows(trades, options?.definitionTitles), filename);
};

// ==========================================
// 📖 JOURNAL (GÜNLÜK) EXPORT UTILITIES
// ==========================================

export const prepareJournalExportRows = (journals: JournalEntry[]) => {
  return journals.map((j, index) => {
    const time = j.createdAt ? formatDateTime(j.createdAt).time : '-';

    let moodText = 'Belirtilmedi';
    if (j.mood === 'excellent') moodText = '⚡ Mükemmel (Harika Odak)';
    else if (j.mood === 'good') moodText = '😊 İyi (Pozitif)';
    else if (j.mood === 'neutral') moodText = '😐 Nötr (Dengeli)';
    else if (j.mood === 'bad') moodText = '😟 Kötü (Stresli/Kaygılı)';
    else if (j.mood === 'terrible') moodText = '💥 Çok Kötü (Yıkım/Tükenmiş)';

    return {
      'Sıra': index + 1,
      'Günlük ID': j.id,
      'Günlük Tarihi': j.date,
      'Kayıt Saati': time,
      'Başlık': j.title || 'Başlıksız Günlük',
      'Ruh Hali / Psikoloji (Mood)': moodText,
      'Etiketler (Tags)': (j.tags && j.tags.length > 0) ? j.tags.join(', ') : '-',
      'Yıldızlı / Favori': j.isFavorite ? 'Evet (Favori)' : 'Hayır',
      'Günlük Notu & Düşünceler (Content)': j.content || '-',
      'Haftalık: Neyi iyi yaptım?': j.weekly?.good?.trim() || '-',
      'Haftalık: Neyi tekrar etmemeliyim?': j.weekly?.avoid?.trim() || '-',
      'Haftalık: Gelecek haftanın odağı': j.weekly?.focus?.trim() || '-',
      'Son Güncelleme': j.updatedAt ? (() => { const x = formatDateTime(j.updatedAt); return `${x.date} ${x.time}`; })() : '-',
    };
  });
};

export const exportJournalsToExcel = async (journals: JournalEntry[], filename: string): Promise<void> => {
  if (!journals || journals.length === 0) throw new Error('Dışa aktarılacak günlük kaydı bulunamadı.');
  const XLSX = await loadXlsx();
  const count = (m: JournalEntry['mood']) => journals.filter((j) => j.mood === m).length;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(XLSX, prepareJournalExportRows(journals), 12), 'Günlük Kayıtları');
  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet(XLSX, [
      { Metrik: 'Rapor Başlığı', Değer: 'Psikoloji & Zihin Günlükleri Raporu' },
      { Metrik: 'Dışa Aktarma Tarihi', Değer: nowText() },
      { Metrik: 'Toplam Günlük Kaydı', Değer: journals.length },
      { Metrik: 'Haftalık Değerlendirme', Değer: journals.filter((j) => j.weekly).length },
      { Metrik: 'Favori / Yıldızlı Günlükler', Değer: journals.filter((j) => j.isFavorite).length },
      { Metrik: '⚡ Mükemmel (Odaklı) Günler', Değer: count('excellent') },
      { Metrik: '😊 İyi (Pozitif) Günler', Değer: count('good') },
      { Metrik: '😐 Nötr Günler', Değer: count('neutral') },
      { Metrik: '😟 Kötü (Stresli) Günler', Değer: count('bad') },
      { Metrik: '💥 Çok Kötü Günler', Değer: count('terrible') },
    ]),
    'Psikoloji Özeti',
  );
  XLSX.writeFile(workbook, xlsxName(filename));
};

export const exportJournalsToCSV = (journals: JournalEntry[], filename: string) => {
  if (!journals || journals.length === 0) throw new Error('Dışa aktarılacak günlük kaydı bulunamadı.');
  downloadCsv(prepareJournalExportRows(journals), filename);
};

// ==========================================
// 📝 NOTES (NOTLAR) EXPORT UTILITIES
// ==========================================

export const prepareNoteExportRows = (notes: Note[]) => {
  return notes.map((n, index) => {
    const created = formatDateTime(n.createdAt);
    const updated = formatDateTime(n.updatedAt || n.createdAt);

    return {
      'Sıra': index + 1,
      'Not ID': n.id,
      'Oluşturulma Tarihi': created.date,
      'Oluşturulma Saati': created.time,
      'Son Güncelleme': `${updated.date} ${updated.time}`,
      'Başlık': n.title || 'Başlıksız Not',
      'Sabitlenmiş (Pinned)': n.isPinned ? 'Evet (Sabitli)' : 'Hayır',
      'Not İçeriği & Strateji Kuralları (Content)': n.content || '-',
    };
  });
};

export const exportNotesToExcel = async (notes: Note[], filename: string): Promise<void> => {
  if (!notes || notes.length === 0) throw new Error('Dışa aktarılacak not bulunamadı.');
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(XLSX, prepareNoteExportRows(notes), 12), 'Notlarım');
  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet(XLSX, [
      { Metrik: 'Rapor Başlığı', Değer: 'Strateji ve Analiz Notları Raporu' },
      { Metrik: 'Dışa Aktarma Tarihi', Değer: nowText() },
      { Metrik: 'Toplam Kayıtlı Not', Değer: notes.length },
      { Metrik: 'Sabitlenmiş (Pinned) Notlar', Değer: notes.filter((n) => n.isPinned).length },
    ]),
    'Notlar Özeti',
  );
  XLSX.writeFile(workbook, xlsxName(filename));
};

export const exportNotesToCSV = (notes: Note[], filename: string) => {
  if (!notes || notes.length === 0) throw new Error('Dışa aktarılacak not bulunamadı.');
  downloadCsv(prepareNoteExportRows(notes), filename);
};
