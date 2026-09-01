const fs = require('fs');
let content = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf-8');

const auditModalStr = `
      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        trades={trades}
        dateRangeText={dateRangeText}
      />
`;

content = content.replace('    document.body\n  );\n};', `    document.body\n  );\n  \n  return (\n    <>\n      {portalContent}\n${auditModalStr}    </>\n  );\n};\n`);
// wait, the return statement is currently `return createPortal(...)`.
// Let's check how it's returned.
