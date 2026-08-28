const fs = require('fs');
const content = fs.readFileSync('src/components/TradeList.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(1008, 1020).join('\n'));
