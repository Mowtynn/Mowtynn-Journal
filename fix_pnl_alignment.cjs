const fs = require('fs');
const files = [
  'src/components/TradeList.tsx',
  'src/components/DeepAnalysis.tsx',
  'src/components/CalendarView.tsx',
  'src/components/AdvancedMetricsDashboard.tsx',
  'src/components/PrintReportModal.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix header for Kâr/Zarar in TradeList and others
  content = content.replace(
    /Kâr\/Zarar \{filter\.sortBy[^}]+\}/g,
    `<div className="flex items-center justify-end gap-1 w-full"><span>Kâr/Zarar</span><span className="w-2 text-center">{filter.sortBy === 'pnlAsc' ? '↑' : filter.sortBy === 'pnlDes' ? '↓' : ''}</span></div>`
  );
  
  // For other tables where there is no filter
  content = content.replace(
    /<th[^>]*>Kâr\/Zarar<\/th>/g,
    (match) => match.replace('Kâr/Zarar', '<div className="flex items-center justify-end w-full"><span>Kâr/Zarar</span></div>')
  );

  // We also want to ensure the td has flex justify-end.
  // Actually, in TradeList:
  // <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end">
  // We can just keep it, but wait! What if the user wants it CENTER aligned?
  // Let's check how it looks if we just use flex justify-end for the header.
  
  fs.writeFileSync(file, content);
}
