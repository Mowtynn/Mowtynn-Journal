const fs = require('fs');
let content = fs.readFileSync('src/components/CalendarView.tsx', 'utf8');

// LONG/SHORT
content = content.replace(
  /<span className="inline-flex items-center justify-center w-\[42px\] sm:w-\[48px\] h-\[20px\] text-center text-\[9px\] sm:text-\[10px\] font-black text-emerald-400 bg-emerald-400\/10 border border-emerald-400\/20 group-hover:border-emerald-400\/50 py-0.5 rounded uppercase tracking-wider transition-colors">\s*LONG\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8px] sm:text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 group-hover:border-emerald-400/50 rounded uppercase tracking-wider transition-colors">\n                                  LONG\n                                </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center w-\[42px\] sm:w-\[48px\] h-\[20px\] text-center text-\[9px\] sm:text-\[10px\] font-black text-rose-400 bg-rose-500\/10 border border-rose-500\/20 group-hover:border-rose-500\/50 py-0.5 rounded uppercase tracking-wider transition-colors">\s*SHORT\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8px] sm:text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded uppercase tracking-wider transition-colors">\n                                  SHORT\n                                </span>'
);

// RR
content = content.replace(
  /<div className="flex items-center justify-center w-full h-\[20px\]">/g,
  '<div className="flex items-center justify-center w-full h-[18px]">'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center w-\[42px\] sm:w-\[48px\] h-\[20px\] text-center text-\[9px\] sm:text-\[10px\] font-black text-emerald-400 bg-emerald-500\/10 border border-emerald-500\/20 group-hover:border-emerald-500\/50 py-0.5 rounded transition-colors">\s*\+\{t.rr\}R\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8.5px] sm:text-[9.5px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded transition-colors">\n                                      +{t.rr}R\n                                    </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center w-\[42px\] sm:w-\[48px\] h-\[20px\] text-center text-\[9px\] sm:text-\[10px\] font-black text-rose-400 bg-rose-500\/10 border border-rose-500\/20 group-hover:border-rose-500\/50 py-0.5 rounded transition-colors">\s*\{t.rr\}R\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8.5px] sm:text-[9.5px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded transition-colors">\n                                      {t.rr}R\n                                    </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center w-\[42px\] sm:w-\[48px\] h-\[20px\] text-center text-\[9px\] sm:text-\[10px\] font-black text-zinc-400 bg-zinc-500\/10 border border-zinc-800 group-hover:border-zinc-600 py-0.5 rounded transition-colors">\s*\{t.rr\}R\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8.5px] sm:text-[9.5px] font-black text-zinc-400 bg-zinc-500/10 border border-zinc-800 group-hover:border-zinc-600 rounded transition-colors">\n                                      {t.rr}R\n                                    </span>'
);

content = content.replace(
  /<span className="inline-block w-\[42px\] sm:w-\[50px\] text-center text-\[9px\] sm:text-\[10px\] font-medium text-zinc-500 py-0.5 rounded">—<\/span>/g,
  '<span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[8.5px] sm:text-[9.5px] font-medium text-zinc-500 rounded">—</span>'
);

// WIN / LOSS / BE / AÇIK
content = content.replace(
  /<span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500\/10 text-emerald-400 border border-emerald-500\/20 group-hover:border-emerald-500\/50 w-\[50px\] sm:w-\[60px\] h-\[20px\] transition-colors">\s*<CheckCircle2 size=\{9\} \/> <span className="text-\[8px\] sm:text-\[9px\] font-bold uppercase tracking-wider mt-\[1px\]">WIN<\/span>\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:border-emerald-500/50 w-[38px] sm:w-[44px] h-[18px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors">\n                                  WIN\n                                </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-rose-500\/10 text-rose-400 border border-rose-500\/20 group-hover:border-rose-500\/50 w-\[50px\] sm:w-\[60px\] h-\[20px\] transition-colors">\s*<X size=\{9\} \/> <span className="text-\[8px\] sm:text-\[9px\] font-bold uppercase tracking-wider mt-\[1px\]">LOSS<\/span>\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:border-rose-500/50 w-[38px] sm:w-[44px] h-[18px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors">\n                                  LOSS\n                                </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-zinc-500\/10 text-zinc-400 border border-zinc-500\/20 group-hover:border-zinc-500\/50 w-\[50px\] sm:w-\[60px\] h-\[20px\] transition-colors">\s*<Minus size=\{9\} \/> <span className="text-\[8px\] sm:text-\[9px\] font-bold uppercase tracking-wider mt-\[1px\]">BE<\/span>\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 group-hover:border-zinc-500/50 w-[38px] sm:w-[44px] h-[18px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors">\n                                  BE\n                                </span>'
);

content = content.replace(
  /<span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-blue-500\/10 text-blue-400 border border-blue-500\/20 group-hover:border-blue-500\/50 w-\[50px\] sm:w-\[60px\] h-\[20px\] transition-colors">\s*<Clock size=\{9\} \/> <span className="text-\[8px\] sm:text-\[9px\] font-bold uppercase tracking-wider mt-\[1px\]">AÇIK<\/span>\s*<\/span>/g,
  '<span className="inline-flex items-center justify-center rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:border-blue-500/50 w-[38px] sm:w-[44px] h-[18px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors">\n                                  AÇIK\n                                </span>'
);

fs.writeFileSync('src/components/CalendarView.tsx', content);
