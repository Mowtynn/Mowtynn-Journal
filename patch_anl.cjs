const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// 1. Replace logId for both CSV and HTML table
content = content.replace(
  /const logId = \`#LOG-\$\{t\.id\.substring\(0, 5\)\.toUpperCase\(\)\}\`;/g,
  `const hexCode = Math.abs(hashString(t.id)).toString(16).substring(0, 5).toUpperCase().padStart(5, '0');
                      const logId = \`#LOG-ANL-\$\{hexCode\}\`;`
);

// We need to make sure the CSV one which doesn't have much indentation is also properly handled. Let's just do it cleanly.
content = content.replace(
  /const logId = \`#LOG-\$\{t\.id\.substring\(0, 5\)\.toUpperCase\(\)\}\`;/g,
  `const hexCode = Math.abs(hashString(t.id)).toString(16).substring(0, 5).toUpperCase().padStart(5, '0');\n       const logId = \`#LOG-ANL-\$\{hexCode\}\`;`
);

// 2. Replace ticket for CSV
content = content.replace(
  /const ticket = \`\$\{t\.platform \|\| 'FXIFY'\} \/ #\$\{Math\.abs\(hashString\(t\.id\)\)\.toString\(\)\.substring\(0, 7\)\}\`;/g,
  "const ticket = `ID: #${Math.abs(hashString(t.id)).toString().substring(0, 6)}`;"
);

// Replace ticket for HTML table
content = content.replace(
  /const ticket = \`\$\{t\.platform \|\| 'FXIFY'\} \/ #\$\{Math\.abs\(hashString\(t\.id\)\)\.toString\(\)\.substring\(0, 6\)\}\`;/g,
  "const ticket = `ID: #${Math.abs(hashString(t.id)).toString().substring(0, 6)}`;"
);

// 3. Add dateRangeState
const hooksSection = `  const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
  const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');
  const [methodology, setMethodology] = useState('Algorithmic Liquidity & Price Inefficiency Modeling v2.4');`;

const getFormattedDateRange = `
  const getFormattedDateRange = (text: string) => {
    if (text === 'Bu Ay' || text === 'Bu ay' || text === 'This Month') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return \`\$\{firstDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - \$\{lastDay.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}\`;
    }
    return text || '01.08.2026 - 31.08.2026';
  };
`;

const newHooksSection = hooksSection + getFormattedDateRange + `\n  const [dateRangeState, setDateRangeState] = useState(getFormattedDateRange(dateRangeText));`;

content = content.replace(hooksSection, newHooksSection);

// Make sure it updates when dateRangeText changes
const useEffectSection = `  useEffect(() => {
    if (isOpen) {
      setClientOrg(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
    }
  }, [isOpen, trades]);`;

const newUseEffectSection = `  useEffect(() => {
    if (isOpen) {
      setClientOrg(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
      setDateRangeState(getFormattedDateRange(dateRangeText));
    }
  }, [isOpen, trades, dateRangeText]);`;

content = content.replace(useEffectSection, newUseEffectSection);

// Replace "Dönem / Filtre Aralığı" text with input
const oldDateRangeSpan = `<span className="text-zinc-200 font-mono text-sm">{dateRangeText || 'Tüm Zamanlar'}</span>`;
const newDateRangeInput = `{isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{dateRangeState}</div>
                    ) : (
                      <input 
                        type="text"
                        value={dateRangeState}
                        onChange={(e) => setDateRangeState(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;

content = content.replace(oldDateRangeSpan, newDateRangeInput);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
