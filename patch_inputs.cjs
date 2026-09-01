const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Replace const clientOrg with states
content = content.replace(
  "const clientOrg = trades.find(t => t.platform)?.platform || 'FSL PROP DMCC';",
  `const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
  const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');
  
  useEffect(() => {
    if (isOpen) {
      setClientOrg(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
    }
  }, [isOpen, trades]);`
);

// Replace spans with inputs
const oldOrgSpan = '<span className="text-zinc-200 font-mono text-sm">{clientOrg}</span>';
const newOrgInput = `<input 
                      type="text"
                      value={clientOrg}
                      onChange={(e) => setClientOrg(e.target.value)}
                      className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;

const oldRefSpan = '<span className="text-zinc-200 font-mono text-sm">Professional Services Agreement (PSA) - Schedule 1</span>';
const newRefInput = `<input 
                      type="text"
                      value={contractRef}
                      onChange={(e) => setContractRef(e.target.value)}
                      className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;

content = content.replace(oldOrgSpan, newOrgInput);
content = content.replace(oldRefSpan, newRefInput);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
