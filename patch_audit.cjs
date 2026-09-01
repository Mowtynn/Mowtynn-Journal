const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

content = content.replace("import html2canvas from 'html2canvas';", "import html2canvas from 'html2canvas';\nimport { generateCanvasWithOklchPolyfill } from '../utils/canvasUtils';");

const oldCanvasCall = `      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b', // zinc-950
        logging: false
      });`;

const newCanvasCall = `      const canvas = await generateCanvasWithOklchPolyfill(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b', // zinc-950
        logging: false
      });
      if (!canvas) throw new Error("Canvas generation failed");`;

content = content.replace(oldCanvasCall, newCanvasCall);
fs.writeFileSync('src/components/AuditReportModal.tsx', content);
