const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

const regex = /<div className="grid grid-cols-1 md:grid-cols-3[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
// Let's replace the whole block more precisely.
