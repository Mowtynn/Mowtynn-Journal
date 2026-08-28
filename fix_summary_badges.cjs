const fs = require('fs');

const files = [
  'src/components/DeepAnalysis.tsx',
  'src/components/CalendarView.tsx',
  'src/components/AdvancedMetricsDashboard.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix LONG summary badge
  content = content.replace(/bg-emerald-500\/5 border border-emerald-500\/10/g, 'bg-emerald-500/10 border border-emerald-500/20');
  content = content.replace(/text-emerald-500\/80/g, 'text-emerald-400');
  
  // Fix SHORT summary badge
  content = content.replace(/bg-rose-500\/5 border border-rose-500\/10/g, 'bg-rose-500/10 border border-rose-500/20');
  content = content.replace(/text-rose-500\/80/g, 'text-rose-400');

  // Fix session background classes
  content = content.replace(/bg-emerald-500\/5 border-emerald-500\/10/g, 'bg-emerald-500/10 border-emerald-500/20');
  content = content.replace(/bg-rose-500\/5 border-rose-500\/10/g, 'bg-rose-500/10 border-rose-500/20');
  content = content.replace(/bg-zinc-500\/5 border-zinc-500\/10/g, 'bg-zinc-500/10 border-zinc-500/20');
  
  // Fix session label text
  content = content.replace(/text-emerald-500\/70/g, 'text-emerald-400');
  content = content.replace(/text-rose-500\/70/g, 'text-rose-400');
  content = content.replace(/text-zinc-500\/70/g, 'text-zinc-400');

  // Fix TOPLAM badge background
  content = content.replace(/bg-zinc-950 border border-zinc-800/g, 'bg-zinc-800/80 border border-zinc-700/80 text-zinc-300');

  fs.writeFileSync(file, content);
}
