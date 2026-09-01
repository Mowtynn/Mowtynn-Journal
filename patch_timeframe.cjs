const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Replace Headers
content = content.replace(
  "'TRIGGER / LEVEL',",
  "'DATA RESOLUTION / TIMEFRAME',"
);

content = content.replace(
  '<th className="py-3 px-4 font-semibold">TRIGGER / LEVEL</th>',
  '<th className="py-3 px-4 font-semibold">DATA RESOLUTION / TIMEFRAME</th>'
);

// Replace Row Logic
content = content.replace(
  "const trigger = t.timeframe ? \`\${getDeterministicPrice(t.id, t.asset, i)} (Dev: \${t.timeframe})\` : 'Auto-detected';",
  "const trigger = t.timeframe ? \`\${t.timeframe.toUpperCase()} (\${['1s','1m'].includes(t.timeframe.toLowerCase()) ? 'Tick Stream' : 'Aggregated Feed'})\` : 'Auto-detected';"
);

content = content.replace(
  "const triggerText = t.timeframe ? \`\${getDeterministicPrice(t.id, t.asset, i)} (Dev: \${t.timeframe})\` : 'Auto-detected';",
  "const triggerText = t.timeframe ? \`\${t.timeframe.toUpperCase()} (\${['1s','1m'].includes(t.timeframe.toLowerCase()) ? 'Tick Stream' : 'Aggregated Feed'})\` : 'Auto-detected';"
);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
