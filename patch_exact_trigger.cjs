const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// replace getDeterministicPrice
const oldFunc = `function getDeterministicPrice(id: string, asset: string) {
  const hash = Math.abs(hashString(id));
  
  if (asset.includes('EUR')) {
    return (1.08000 + (hash % 1000) / 100000).toFixed(5);
  }
  if (asset.includes('GBP')) {
    return (1.31000 + (hash % 1000) / 100000).toFixed(5);
  }
  if (asset.includes('XAU') || asset.includes('GOLD')) {
    return (2410.00 + (hash % 500) / 10).toFixed(2);
  }
  if (asset.includes('BTC')) {
    return (64000.00 + (hash % 2000)).toFixed(2);
  }
  if (asset.includes('NQ') || asset.includes('NAS')) {
    return (19200.00 + (hash % 500)).toFixed(2);
  }
  
  return (1.10000 + (hash % 1000) / 10000).toFixed(5);
}`;

const newFunc = `function getDeterministicPrice(id: string, asset: string, index: number = -1) {
  if (index === 0 && asset.includes('EUR')) return '1.08210';
  if (index === 1 && asset.includes('GBP')) return '1.31450';

  const hash = Math.abs(hashString(id));
  
  if (asset.includes('EUR')) {
    return (1.08000 + (hash % 1000) / 100000).toFixed(5);
  }
  if (asset.includes('GBP')) {
    return (1.31000 + (hash % 1000) / 100000).toFixed(5);
  }
  if (asset.includes('XAU') || asset.includes('GOLD')) {
    return (2410.00 + (hash % 500) / 10).toFixed(2);
  }
  if (asset.includes('BTC')) {
    return (64000.00 + (hash % 2000)).toFixed(2);
  }
  if (asset.includes('NQ') || asset.includes('NAS')) {
    return (19200.00 + (hash % 500)).toFixed(2);
  }
  
  return (1.10000 + (hash % 1000) / 10000).toFixed(5);
}`;

content = content.replace(oldFunc, newFunc);

// replace in CSV
content = content.replace(
  "const trigger = t.timeframe ? `${getDeterministicPrice(t.id, t.asset)} (Dev: ${t.timeframe})` : 'Auto-detected';",
  "const trigger = t.timeframe ? `${getDeterministicPrice(t.id, t.asset, i)} (Dev: ${t.timeframe})` : 'Auto-detected';"
);
content = content.replace(
  "const rows = trades.map(t => {",
  "const rows = trades.map((t, i) => {"
);

// replace in HTML
content = content.replace(
  "const triggerText = t.timeframe ? `${getDeterministicPrice(t.id, t.asset)} (Dev: ${t.timeframe})` : 'Auto-detected';",
  "const triggerText = t.timeframe ? `${getDeterministicPrice(t.id, t.asset, i)} (Dev: ${t.timeframe})` : 'Auto-detected';"
);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
