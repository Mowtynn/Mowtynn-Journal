const fs = require('fs');

const files = [
  'src/components/DeepAnalysis.tsx',
  'src/components/CalendarView.tsx',
  'src/components/AdvancedMetricsDashboard.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/bg-zinc-800\/80 border border-zinc-700\/80 text-zinc-300/g, 'bg-zinc-800/90 border border-zinc-700/50 text-zinc-100');

  fs.writeFileSync(file, content);
}
