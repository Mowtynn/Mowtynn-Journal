const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// 1. Date Range
const oldDateFunc = `  const getFormattedDateRange = (text: string) => {
    if (text === 'Bu Ay' || text === 'Bu ay' || text === 'This Month') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return \`\${firstDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - \${lastDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}\`;
    }
    return text || '01.08.2026 - 31.08.2026';
  };`;
const newDateFunc = `  const getFormattedDateRange = (tradesList: Trade[]) => {
    if (!tradesList || tradesList.length === 0) return '01.08.2026 - 31.08.2026';
    const dates = tradesList.map(t => t.createdAt).sort((a, b) => a - b);
    const firstDay = new Date(dates[0]);
    const lastDay = new Date(dates[dates.length - 1]);
    return \`\${firstDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - \${lastDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}\`;
  };`;
content = content.replace(oldDateFunc, newDateFunc);
content = content.replace('useState(getFormattedDateRange(dateRangeText));', 'useState(getFormattedDateRange(trades));');
content = content.replace('setDateRangeState(getFormattedDateRange(dateRangeText));', 'setDateRangeState(getFormattedDateRange(trades));');

// 2. Model Jargon
content = content.replace(
  "if (concept.toUpperCase() === 'SMT') return 'Cross-Asset Divergence Model (SMT-v2)';",
  "if (concept.toUpperCase() === 'SMT') return 'Cross-Asset Divergence Model v2.0';"
);

// 3. Cumulative Delta USD
const oldMetrics = `const cumulativeDelta = trades.reduce((acc, t) => acc + t.rr, 0);
    return { count: trades.length, hitRate, cumulativeDelta };`;
const newMetrics = `const cumulativeDelta = trades.reduce((acc, t) => acc + t.rr, 0);
    const cumulativeDeltaUSD = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return { count: trades.length, hitRate, cumulativeDelta, cumulativeDeltaUSD };`;
// In case the old code was slightly different:
content = content.replace(
  "    const cumulativeDelta = trades.reduce((acc, t) => acc + t.rr, 0);\n    return { count: trades.length, hitRate, cumulativeDelta };",
  "    const cumulativeDelta = trades.reduce((acc, t) => acc + t.rr, 0);\n    const cumulativeDeltaUSD = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);\n    return { count: trades.length, hitRate, cumulativeDelta, cumulativeDeltaUSD };"
);

const oldMetricsUI = `                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Cumulative Delta</span>
                    <span className={\`font-mono text-lg font-bold \${metrics.cumulativeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                      {metrics.cumulativeDelta > 0 ? '+' : ''}{metrics.cumulativeDelta.toFixed(2)} R
                    </span>
                  </div>
                </div>`;
const newMetricsUI = `                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Cumulative Delta</span>
                    <span className={\`font-mono text-lg font-bold \${metrics.cumulativeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                      {metrics.cumulativeDelta > 0 ? '+' : ''}{metrics.cumulativeDelta.toFixed(2)} R
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Total Delta Output (USD)</span>
                    <span className={\`font-mono text-lg font-bold \${(metrics.cumulativeDeltaUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                      {(metrics.cumulativeDeltaUSD || 0) > 0 ? '+' : ''}\${Math.abs(metrics.cumulativeDeltaUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>`;
content = content.replace(oldMetricsUI, newMetricsUI);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
