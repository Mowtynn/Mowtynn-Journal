const fs = require('fs');

const files = [
  'src/components/TradeList.tsx',
  'src/components/DeepAnalysis.tsx',
  'src/components/AdvancedMetricsDashboard.tsx',
  'src/components/CalendarView.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    /w-\[54px\] h-\[20px\] text-center text-\[9px\] font-black([^ ]+) bg-([^ ]+) border border-([^ ]+) group-hover:border-([^ ]+) rounded-full uppercase tracking-wider/g,
    'w-[50px] sm:w-[60px] h-[22px] px-1.5 py-0.5 text-center text-[10px] font-bold$1 bg-$2 border border-$3 group-hover:border-$4 rounded uppercase tracking-wider font-mono'
  );

  fs.writeFileSync(file, content);
}
