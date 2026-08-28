const fs = require('fs');

const files = [
  'src/components/TradeList.tsx',
  'src/components/DeepAnalysis.tsx',
  'src/components/AdvancedMetricsDashboard.tsx',
  'src/components/CalendarView.tsx',
  'src/components/PrintReportModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // We know the exact structure of the JSX tags. We can replace them via simple replacement rules based on the content of the span.
  // E.g., for WIN: `<span className="[^"]*">WIN<\/span>` or similar if it has newlines.
  
  // A helper function to replace specific badges.
  function replaceBadge(matchInner, newClass) {
    const regex = new RegExp(`<span\\s+className="[^"]*"[^>]*>\\s*${matchInner}\\s*<\\/span>`, 'g');
    content = content.replace(regex, `<span className="${newClass}">${matchInner}</span>`);
    
    // Sometimes it's wrapped differently or contains expressions
  }

  // YÖN
  replaceBadge('LONG', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors');
  replaceBadge('SHORT', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider transition-colors');

  // SONUÇ
  replaceBadge('WIN', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors');
  replaceBadge('LOSS', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider transition-colors');
  replaceBadge('BE', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider transition-colors');
  replaceBadge('AÇIK', 'inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider transition-colors');

  // PrintReportModal might not have group-hover but it's safe to include. Let's make a print-safe one just in case? No, it's fine.

  fs.writeFileSync(file, content);
}
