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

  // We need to replace all existing badge classes with the new unified one.
  // The base unified class (without color specific stuff):
  // inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black uppercase tracking-wider rounded-full transition-colors

  // Replace YÖN - LONG
  content = content.replace(/className="inline-flex items-center justify-center [^"]*text-emerald-400[^"]*bg-emerald-400\/10[^"]*LONG[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors"');
  content = content.replace(/className="inline-flex items-center justify-center [^"]*text-emerald-400[^"]*bg-emerald-500\/10[^"]*LONG[^"]*"/gi, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors"');
  
  // Replace YÖN - SHORT
  content = content.replace(/className="inline-flex items-center justify-center [^"]*text-rose-400[^"]*bg-rose-500\/10[^"]*SHORT[^"]*"/gi, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace SONUÇ - WIN
  content = content.replace(/className="inline-flex items-center justify-center [^"]*bg-emerald-500\/10[^"]*WIN[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace SONUÇ - LOSS
  content = content.replace(/className="inline-flex items-center justify-center [^"]*bg-rose-500\/10[^"]*LOSS[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace SONUÇ - BE
  content = content.replace(/className="inline-flex items-center justify-center [^"]*bg-zinc-500\/10[^"]*BE[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace SONUÇ - AÇIK
  content = content.replace(/className="inline-flex items-center justify-center [^"]*bg-blue-500\/10[^"]*AÇIK[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace RR (+)
  content = content.replace(/className="inline-flex items-center justify-center [^"]*bg-emerald-500\/10[^"]*trade\.rr > 0 \? '\+' : ''[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors"');
  
  // Also handle exact string match cases for RR inside JSX
  content = content.replace(/className="inline-flex items-center justify-center w-\[[^\]]+\][^"]*text-emerald-400 bg-emerald-500\/10[^"]*rounded[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace RR (-)
  content = content.replace(/className="inline-flex items-center justify-center w-\[[^\]]+\][^"]*text-rose-400 bg-rose-500\/10[^"]*rounded[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace RR (0)
  content = content.replace(/className="inline-flex items-center justify-center w-\[[^\]]+\][^"]*text-zinc-400 bg-zinc-500\/10[^"]*rounded[^"]*"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider transition-colors"');

  // Replace Session (which I made earlier as 58px)
  content = content.replace(/className="inline-flex items-center justify-center w-\[58px\] h-\[18px\] text-center text-\[8px\] font-black bg-zinc-800\/80 border border-zinc-700\/80 group-hover:border-zinc-500 rounded uppercase tracking-wider text-zinc-300 transition-colors"/g, 
    'className="inline-flex items-center justify-center w-[54px] h-[20px] text-center text-[9px] font-black text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider transition-colors"');
  
  fs.writeFileSync(file, content);
}
