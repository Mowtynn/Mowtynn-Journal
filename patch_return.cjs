const fs = require('fs');
let content = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf-8');

content = content.replace('  return createPortal(', '  return (\n    <>\n      {createPortal(');
content = content.replace('    document.body\n  );\n};', `    document.body\n  )}\n      <AuditReportModal\n        isOpen={isAuditModalOpen}\n        onClose={() => setIsAuditModalOpen(false)}\n        trades={trades}\n        dateRangeText={dateRangeText}\n      />\n    </>\n  );\n};`);

fs.writeFileSync('src/components/PrintReportModal.tsx', content);
