const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Add state
content = content.replace(
  "const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');",
  "const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');\n  const [methodology, setMethodology] = useState('Algorithmic Liquidity & Price Inefficiency Modeling v2.4');"
);

// Replace span with input
const oldSpan = '<span className="text-zinc-200 font-mono text-sm text-blue-400">Algorithmic Liquidity & Price Inefficiency Modeling v2.4</span>';
const newInput = `<input 
                      type="text"
                      value={methodology}
                      onChange={(e) => setMethodology(e.target.value)}
                      className="text-blue-400 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;

content = content.replace(oldSpan, newInput);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
