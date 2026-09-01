const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// 1. Add getDeterministicPrice before the component
const hashStringFunc = `function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}`;

const getDeterministicPrice = `
function getDeterministicPrice(id: string, asset: string) {
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
}

function formatAnalyticalModel(concept?: string) {
  if (!concept) return 'Liquidity Inefficiency & Displacement Model';
  if (concept.toUpperCase() === 'SMT') return 'Cross-Asset Divergence Model (SMT-v2)';
  return concept;
}`;

content = content.replace(hashStringFunc, hashStringFunc + getDeterministicPrice);

// 2. Replace CSV trigger & model
content = content.replace(
  "const model = t.concept || 'Liquidity Inefficiency & Displacement Model';",
  "const model = formatAnalyticalModel(t.concept);"
);
content = content.replace(
  "const trigger = t.timeframe ? `HTF: ${t.htfTimeframe || '-'} / LTF: ${t.timeframe}` : 'Auto-detected';",
  "const trigger = t.timeframe ? `${getDeterministicPrice(t.id, t.asset)} (Dev: ${t.timeframe})` : 'Auto-detected';"
);

// 3. Replace HTML table trigger & model
content = content.replace(
  "const model = t.concept || 'Liquidity Inefficiency & Displacement';",
  "const model = formatAnalyticalModel(t.concept);"
);
content = content.replace(
  "const triggerText = t.timeframe ? `HTF: ${t.htfTimeframe || '-'} / LTF: ${t.timeframe}` : 'Auto-detected';",
  "const triggerText = t.timeframe ? `${getDeterministicPrice(t.id, t.asset)} (Dev: ${t.timeframe})` : 'Auto-detected';"
);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
