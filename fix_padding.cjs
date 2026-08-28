const fs = require('fs');

const files = [
  'src/components/DeepAnalysis.tsx',
  'src/components/CalendarView.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace th py-2 with py-1.5
  content = content.replace(/<th className="py-2 /g, '<th className="py-1.5 ');
  
  // Replace td py-1.5 with py-1
  content = content.replace(/<td className="([^"]*)py-1\.5/g, '<td className="$1py-1');

  fs.writeFileSync(file, content);
}
