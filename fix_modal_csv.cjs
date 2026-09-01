const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// 1. Fix z-index
content = content.replace('z-[2000]', 'z-[9999]');

// 2. Fix downloadCSV
const oldCsvBlock = `    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", \`Quantitative_Log_\${new Date().getTime()}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);`;

const newCsvBlock = `    const csvString = "\\uFEFF" + [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", \`Quantitative_Log_\${new Date().getTime()}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);`;

content = content.replace(oldCsvBlock, newCsvBlock);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
