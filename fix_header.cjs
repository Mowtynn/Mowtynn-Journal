const fs = require('fs');

const file = 'src/components/TradeList.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the previous flex header with the absolute arrow version
content = content.replace(
  /<div className="flex items-center justify-end gap-1 w-full"><span>Kâr\/Zarar<\/span><span className="w-2 text-center">\{filter\.sortBy === 'pnlAsc' \? '↑' : filter\.sortBy === 'pnlDes' \? '↓' : ''\}<\/span><\/div>/g,
  `<div className="flex items-center justify-end w-full relative"><span className="pr-1">Kâr/Zarar</span><span className="absolute -right-2 text-[10px] w-2 flex justify-center">{filter.sortBy === 'pnlAsc' ? '↑' : filter.sortBy === 'pnlDes' ? '↓' : ''}</span></div>`
);

fs.writeFileSync(file, content);
