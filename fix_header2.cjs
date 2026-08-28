const fs = require('fs');

const file = 'src/components/TradeList.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<div className="flex items-center justify-end w-full relative"><span className="pr-1">Kâr\/Zarar<\/span><span className="absolute -right-2 text-\[10px\] w-2 flex justify-center">\{filter\.sortBy === 'pnlAsc' \? '↑' : filter\.sortBy === 'pnlDes' \? '↓' : ''\}<\/span><\/div>/g,
  `<div className="flex items-center justify-end w-full relative"><span>Kâr/Zarar</span><span className="absolute -right-3 text-[10px] w-3 flex justify-center">{filter.sortBy === 'pnlAsc' ? '↑' : filter.sortBy === 'pnlDes' ? '↓' : ''}</span></div>`
);

fs.writeFileSync(file, content);
