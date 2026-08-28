const fs = require('fs');
const files = [
  'src/components/AdvancedMetricsDashboard.tsx',
  'src/components/CalendarView.tsx',
  'src/components/DeepAnalysis.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /className="inline-block w-\[68px\] text-center bg-zinc-800\/80 border border-zinc-700\/80 group-hover:border-zinc-500 py-\[2px\] rounded text-\[10px\] uppercase tracking-wider text-zinc-300 transition-colors"/g,
    'className="inline-flex items-center justify-center w-[58px] h-[18px] text-center text-[8px] font-black bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded uppercase tracking-wider text-zinc-300 transition-colors"'
  );
  fs.writeFileSync(file, content);
}
