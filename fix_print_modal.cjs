const fs = require('fs');
let content = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf8');

// Replace Yön
content = content.replace(
  /<td className="py-2 px-2 text-center whitespace-nowrap">\s*<span\s*className=\{`text-\[9px\] font-black tracking-wider \$\{\s*trade.type === 'LONG'\s*\? 'text-emerald-400'\s*: 'text-rose-400'\s*\}`\}\s*>\s*\{trade.type\}\s*<\/span>\s*<\/td>/gs,
  `<td className="py-2 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center w-full">
                                  {trade.type === 'LONG' ? (
                                    <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded uppercase tracking-wider">
                                      LONG
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded uppercase tracking-wider">
                                      SHORT
                                    </span>
                                  )}
                                </div>
                              </td>`
);

// Replace Result
content = content.replace(
  /<td className="py-2 px-2 text-center whitespace-nowrap">\s*<span\s*className=\{`text-\[9px\] font-extrabold \$\{\s*isWin\s*\? 'text-emerald-400'\s*: isLoss\s*\? 'text-rose-400'\s*: 'text-zinc-300'\s*\}`\}\s*>\s*\{isWin \? 'WIN' : isLoss \? 'LOSS' : 'BE'\}\s*<\/span>\s*<\/td>/gs,
  `<td className="py-2 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center w-full h-[18px]">
                                  {isWin ? (
                                    <span className="inline-flex items-center justify-center rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-[38px] h-[18px] text-[8px] font-black uppercase tracking-wider">
                                      WIN
                                    </span>
                                  ) : isLoss ? (
                                    <span className="inline-flex items-center justify-center rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 w-[38px] h-[18px] text-[8px] font-black uppercase tracking-wider">
                                      LOSS
                                    </span>
                                  ) : isBe ? (
                                    <span className="inline-flex items-center justify-center rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 w-[38px] h-[18px] text-[8px] font-black uppercase tracking-wider">
                                      BE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 w-[38px] h-[18px] text-[8px] font-black uppercase tracking-wider">
                                      AÇIK
                                    </span>
                                  )}
                                </div>
                              </td>`
);

// Replace R multiple
content = content.replace(
  /<td className="py-2 px-2 text-center font-mono font-bold">\s*<span\s*className=\{\s*trade.rr > 0\s*\? 'text-emerald-400'\s*: trade.rr < 0\s*\? 'text-rose-400'\s*: 'text-zinc-500'\s*\}\s*>\s*\{trade.rr > 0 \? '\+' : ''\}\s*\{trade.rr\.toFixed\(2\)\}R\s*<\/span>\s*<\/td>/gs,
  `<td className="py-2 px-2 text-center font-mono font-bold">
                                <div className="flex items-center justify-center w-full h-[18px]">
                                  {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
                                    trade.rr > 0 ? (
                                      <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8.5px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                                        +{trade.rr}R
                                      </span>
                                    ) : trade.rr < 0 ? (
                                      <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8.5px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded">
                                        {trade.rr}R
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8.5px] font-black text-zinc-400 bg-zinc-500/10 border border-zinc-800 rounded">
                                        {trade.rr}R
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[38px] h-[18px] text-center text-[8.5px] font-medium text-zinc-500 rounded">—</span>
                                  )}
                                </div>
                              </td>`
);

// Replace P&L
content = content.replace(
  /<td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">\s*<span\s*className=\{\s*isWin\s*\? 'text-emerald-400'\s*: isLoss\s*\? 'text-rose-400'\s*: 'text-zinc-500'\s*\}\s*>\s*\{isBe \? \(\s*`0\.00 \$\{currency\}`\s*\) : \(\s*<>\s*\{trade\.pnl > 0 \? '\+' : ''\}\s*\{trade\.pnl\.toLocaleString\('en-US', \{\s*minimumFractionDigits: 2,\s*maximumFractionDigits: 2,\s*\}\)\}\s*<\/>\s*\)\}\s*<\/span>\s*<\/td>/gs,
  `<td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                <span
                                  className={
                                    isWin
                                      ? 'text-emerald-400 font-black'
                                      : isLoss
                                      ? 'text-rose-400 font-black'
                                      : 'text-zinc-500 font-bold'
                                  }
                                >
                                  {isBe ? (
                                    \`0.00 \${currency}\`
                                  ) : (
                                    <>
                                      {trade.pnl > 0 ? '+' : ''}
                                      {(trade.pnl || 0).toLocaleString()} {currency}
                                    </>
                                  )}
                                </span>
                              </td>`
);

fs.writeFileSync('src/components/PrintReportModal.tsx', content);
