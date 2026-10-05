import * as XLSX from 'xlsx';
import { Trade, JournalEntry, Note } from '../types';

export interface ExportOptions {
  currency?: string;
  title?: string;
  definitionTitles?: Record<string, string>;
}

/**
 * Format timestamp into local Turkish Date and Time strings
 */
export const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
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
// 📊 TRADE (İŞLEM GEÇMİŞİ) EXPORT UTILITIES
// ==========================================

export const prepareTradeExportRows = (trades: Trade[], options?: ExportOptions) => {
  const currencySymbol = options?.currency || '$';

  return trades.map((t, index) => {
    const { date, time } = formatDateTime(t.createdAt);

    const sweeps = (t.liquiditySweeps && t.liquiditySweeps.length > 0)
      ? t.liquiditySweeps.join(', ')
      : (t.liquiditySweep || t.concept || '-');

    const confirmations = (t.confirmations && t.confirmations.length > 0)
      ? t.confirmations.join(', ')
      : '-';

    const entryModels = (t.entryModels && t.entryModels.length > 0)
      ? t.entryModels.join(', ')
      : (t.entry || '-');

    return {
      'Sıra': index + 1,
      'İşlem ID': t.id,
      'Tarih': date,
      'Saat': time,
      'Parite / Varlık': t.asset || '-',
      'Yön (Direction)': t.type === 'LONG' ? 'LONG (Alış)' : 'SHORT (Satış)',
      'Sonuç (Status)': t.status === 'WIN' ? 'WIN (Kazanıldı)' : t.status === 'LOSS' ? 'LOSS (Kaybedildi)' : 'BREAKEVEN (Başa Baş)',
      'R/R Oranı': Number(t.rr) || 0,
      [`Net Kâr / Zarar (${currencySymbol})`]: Number(t.pnl) || 0,
      'Stop Mesafesi (Pip)': t.stopPips !== undefined && t.stopPips !== null ? Number(t.stopPips) : '-',
      'TP Mesafesi (Pip)': t.tpPips !== undefined && t.tpPips !== null ? Number(t.tpPips) : '-',
      'Platform': t.platform || '-',
      'Hesap Türü': t.accountCategory || (t.platform ? t.platform.toUpperCase() : '-'),
      'Seans (Session)': t.session || '-',
      'Giriş Zaman Dilimi (TF)': t.timeframe || '-',
      'Yüksek Zaman Dilimi (HTF)': t.htfTimeframe || '-',
      'Likidite Süpürme (Liquidity Sweep)': sweeps,
      'PD Array / Teyitler (Confirmations)': confirmations,
      'Giriş Modeli (Entry Model)': entryModels,
      'Trend Yapısı (Trend)': t.trend || '-',
      'Setup Kalitesi (Plan Fidelity)': t.planFidelity || '-',
      'Analiz & Psikoloji Notları': t.notes ? t.notes.replace(/\r?\n/g, ' ') : '-',
      'Ekran Görüntüsü': t.screenshot ? 'Mevcut' : 'Yok',
    };
  });
};

export const exportTradesToExcel = (
  trades: Trade[],
  filename: string,
  options?: ExportOptions
) => {
  if (!trades || trades.length === 0) {
    throw new Error('Dışa aktarılacak işlem bulunamadı.');
  }

  const rows = prepareTradeExportRows(trades, options);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const columnKeys = Object.keys(rows[0] || {});
  const colWidths = columnKeys.map((key) => {
    let maxLen = key.length;
    rows.forEach((row: any) => {
      const valStr = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (valStr.length > maxLen) {
        maxLen = Math.min(valStr.length, 60);
      }
    });
    return { wch: Math.max(maxLen + 3, 10) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'İşlem Geçmişi');

  // Summary Metrics Sheet
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const breakevens = trades.filter((t) => t.status === 'BREAKEVEN').length;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;
  const totalPnl = Number(trades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0).toFixed(2));
  const totalR = Number(trades.reduce((acc, t) => acc + (Number(t.rr) || 0), 0).toFixed(2));
  const profitFactor = losses > 0
    ? Number((trades.filter(t => t.status === 'WIN').reduce((acc, t) => acc + (Number(t.pnl) || 0), 0) / Math.abs(trades.filter(t => t.status === 'LOSS').reduce((acc, t) => acc + (Number(t.pnl) || 0), 0) || 1)).toFixed(2))
    : (wins > 0 ? 'Sonsuz' : 0);

  const summaryRows = [
    { 'Metrik': 'Rapor Başlığı', 'Değer': options?.title || 'İşlem Geçmişi Raporu' },
    { 'Metrik': 'Dışa Aktarma Tarihi', 'Değer': new Date().toLocaleString('tr-TR') },
    { 'Metrik': 'Toplam İşlem Sayısı', 'Değer': totalTrades },
    { 'Metrik': 'Kazanan İşlemler (WIN)', 'Değer': wins },
    { 'Metrik': 'Kaybeden İşlemler (LOSS)', 'Değer': losses },
    { 'Metrik': 'Başa Baş İşlemler (BREAKEVEN)', 'Değer': breakevens },
    { 'Metrik': 'Kazanma Oranı (Win Rate)', 'Değer': `%${winRate}` },
    { 'Metrik': `Toplam Net Kâr / Zarar (${options?.currency || '$'})`, 'Değer': totalPnl },
    { 'Metrik': 'Toplam Net R', 'Değer': `${totalR} R` },
    { 'Metrik': 'Kâr Faktörü (Profit Factor)', 'Değer': profitFactor },
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Özet İstatistikler');

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
};

export const exportTradesToCSV = (
  trades: Trade[],
  filename: string,
  options?: ExportOptions
) => {
  if (!trades || trades.length === 0) {
    throw new Error('Dışa aktarılacak işlem bulunamadı.');
  }

  const rows = prepareTradeExportRows(trades, options);
  const headers = Object.keys(rows[0] || {});

  const csvLines: string[] = [];
  csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));

  rows.forEach((row: any) => {
    const line = headers.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(';');
    csvLines.push(line);
  });

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==========================================
// 📖 JOURNAL (GÜNLÜK) EXPORT UTILITIES
// ==========================================

export const prepareJournalExportRows = (journals: JournalEntry[]) => {
  return journals.map((j, index) => {
    const { time } = formatDateTime(j.createdAt || new Date(j.date).getTime());

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
      'Günlük Notu & Düşünceler (Content)': j.content ? j.content.replace(/\r?\n/g, ' ') : '-',
    };
  });
};

export const exportJournalsToExcel = (
  journals: JournalEntry[],
  filename: string
) => {
  if (!journals || journals.length === 0) {
    throw new Error('Dışa aktarılacak günlük kaydı bulunamadı.');
  }

  const rows = prepareJournalExportRows(journals);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const columnKeys = Object.keys(rows[0] || {});
  const colWidths = columnKeys.map((key) => {
    let maxLen = key.length;
    rows.forEach((row: any) => {
      const valStr = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (valStr.length > maxLen) {
        maxLen = Math.min(valStr.length, 60);
      }
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Günlük Kayıtları');

  // Summary Sheet for Journals
  const totalJournals = journals.length;
  const excellent = journals.filter(j => j.mood === 'excellent').length;
  const good = journals.filter(j => j.mood === 'good').length;
  const neutral = journals.filter(j => j.mood === 'neutral').length;
  const bad = journals.filter(j => j.mood === 'bad').length;
  const terrible = journals.filter(j => j.mood === 'terrible').length;
  const favorites = journals.filter(j => j.isFavorite).length;

  const summaryRows = [
    { 'Metrik': 'Rapor Başlığı', 'Değer': 'Psikoloji & Zihin Günlükleri Raporu' },
    { 'Metrik': 'Dışa Aktarma Tarihi', 'Değer': new Date().toLocaleString('tr-TR') },
    { 'Metrik': 'Toplam Günlük Kaydı', 'Değer': totalJournals },
    { 'Metrik': 'Favori / Yıldızlı Günlükler', 'Değer': favorites },
    { 'Metrik': '⚡ Mükemmel (Odaklı) Günler', 'Değer': excellent },
    { 'Metrik': '😊 İyi (Pozitif) Günler', 'Değer': good },
    { 'Metrik': '😐 Nötr Günler', 'Değer': neutral },
    { 'Metrik': '😟 Kötü (Stresli) Günler', 'Değer': bad },
    { 'Metrik': '💥 Çok Kötü Günler', 'Değer': terrible },
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Psikoloji Özeti');

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
};

export const exportJournalsToCSV = (
  journals: JournalEntry[],
  filename: string
) => {
  if (!journals || journals.length === 0) {
    throw new Error('Dışa aktarılacak günlük kaydı bulunamadı.');
  }

  const rows = prepareJournalExportRows(journals);
  const headers = Object.keys(rows[0] || {});

  const csvLines: string[] = [];
  csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));

  rows.forEach((row: any) => {
    const line = headers.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(';');
    csvLines.push(line);
  });

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      'Not İçeriği & Strateji Kuralları (Content)': n.content ? n.content.replace(/\r?\n/g, ' ') : '-',
    };
  });
};

export const exportNotesToExcel = (
  notes: Note[],
  filename: string
) => {
  if (!notes || notes.length === 0) {
    throw new Error('Dışa aktarılacak not bulunamadı.');
  }

  const rows = prepareNoteExportRows(notes);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const columnKeys = Object.keys(rows[0] || {});
  const colWidths = columnKeys.map((key) => {
    let maxLen = key.length;
    rows.forEach((row: any) => {
      const valStr = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (valStr.length > maxLen) {
        maxLen = Math.min(valStr.length, 60);
      }
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Notlarım');

  // Summary Sheet for Notes
  const totalNotes = notes.length;
  const pinnedNotes = notes.filter(n => n.isPinned).length;

  const summaryRows = [
    { 'Metrik': 'Rapor Başlığı', 'Değer': 'Strateji ve Analiz Notları Raporu' },
    { 'Metrik': 'Dışa Aktarma Tarihi', 'Değer': new Date().toLocaleString('tr-TR') },
    { 'Metrik': 'Toplam Kayıtlı Not', 'Değer': totalNotes },
    { 'Metrik': 'Sabitlenmiş (Pinned) Notlar', 'Değer': pinnedNotes },
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Notlar Özeti');

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
};

export const exportNotesToCSV = (
  notes: Note[],
  filename: string
) => {
  if (!notes || notes.length === 0) {
    throw new Error('Dışa aktarılacak not bulunamadı.');
  }

  const rows = prepareNoteExportRows(notes);
  const headers = Object.keys(rows[0] || {});

  const csvLines: string[] = [];
  csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));

  rows.forEach((row: any) => {
    const line = headers.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(';');
    csvLines.push(line);
  });

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
