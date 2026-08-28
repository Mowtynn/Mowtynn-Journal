const fs = require('fs');
const files = ['src/components/DeepAnalysis.tsx', 'src/components/AdvancedMetricsDashboard.tsx', 'src/components/PrintReportModal.tsx'];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace background colors in TD
  content = content.replace(/sm:bg-zinc-900 group-hover:bg-slate-800\/90/g, 'sm:bg-zinc-950/30 group-hover:bg-blue-950/10');
  
  // Replace background colors in TH
  content = content.replace(/bg-zinc-900 rounded-l-lg/g, 'bg-zinc-950/40 rounded-l-lg');
  content = content.replace(/bg-zinc-900 rounded-r-lg/g, 'bg-zinc-950/40 rounded-r-lg');
  content = content.replace(/min-w-\[65px\] bg-zinc-900/g, 'min-w-[65px] bg-zinc-950/40');
  content = content.replace(/min-w-\[75px\] bg-zinc-900/g, 'min-w-[75px] bg-zinc-950/40');
  content = content.replace(/min-w-\[95px\] bg-zinc-900/g, 'min-w-[95px] bg-zinc-950/40');
  content = content.replace(/min-w-\[80px\] bg-zinc-900/g, 'min-w-[80px] bg-zinc-950/40');
  
  // Fix TR border
  content = content.replace(/border border-zinc-800\/80 sm:border-none p-2/g, 'border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2');

  // Remove sm:border-t-0
  content = content.replace(/sm:border-t-0 /g, '');

  fs.writeFileSync(file, content);
});
