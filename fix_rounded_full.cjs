const fs = require('fs');
const files = [
  'src/components/DeepAnalysis.tsx',
  'src/components/CalendarView.tsx'
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/rounded-full/g, 'rounded');
  fs.writeFileSync(file, content);
}
