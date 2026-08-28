const fs = require('fs');
const t1 = fs.readFileSync('src/components/TradeList.tsx', 'utf8');
const t2 = fs.readFileSync('src/components/DeepAnalysis.tsx', 'utf8');

const getTag = (content, text) => {
  const regex = new RegExp(`className="([^"]+)">${text}<`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

console.log("LONG TradeList:", getTag(t1, 'LONG'));
console.log("LONG DeepAnalysis:", getTag(t2, 'LONG'));
console.log("WIN TradeList:", getTag(t1, 'WIN'));
console.log("WIN DeepAnalysis:", getTag(t2, 'WIN'));
