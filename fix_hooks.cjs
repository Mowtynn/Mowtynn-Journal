const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

const hookBlock = `  const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
  const [contractRef, setContractRef] = useState('Professional Services Agreement (PSA) - Schedule 1');
  
  useEffect(() => {
    if (isOpen) {
      setClientOrg(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');
    }
  }, [isOpen, trades]);`;

content = content.replace(hookBlock, '');
content = content.replace('  if (!isOpen) return null;', hookBlock + '\n\n  if (!isOpen) return null;');

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
