const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

const regex = /function getDeterministicPrice\([\s\S]*?\n\}/;
content = content.replace(regex, '');

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
