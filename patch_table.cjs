const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Add TRIGGER / LEVEL to header
content = content.replace('<th className="py-3 px-4 font-semibold">MODEL BIAS</th>', '<th className="py-3 px-4 font-semibold">MODEL BIAS</th>\n                      <th className="py-3 px-4 font-semibold">TRIGGER / LEVEL</th>');

// Add trigger data cell to body
content = content.replace('const isWin = t.status === \'WIN\';', 'const triggerText = t.timeframe ? `HTF: ${t.htfTimeframe || \'-\'} / LTF: ${t.timeframe}` : \'Auto-detected\';\n                      const isWin = t.status === \'WIN\';');

const oldTd = `                          <td className="py-3 px-4">
                            <span className={\`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border \${
                              t.type === 'LONG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }\`}>
                              {t.type === 'LONG' ? 'BULLISH' : 'BEARISH'}
                            </span>
                          </td>`;

const newTd = `                          <td className="py-3 px-4">
                            <span className={\`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border \${
                              t.type === 'LONG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }\`}>
                              {t.type === 'LONG' ? 'BULLISH' : 'BEARISH'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{triggerText}</td>`;

content = content.replace(oldTd, newTd);
content = content.replace('colSpan={8}', 'colSpan={9}');

// Fix timestamp to UTC
content = content.replace("replace('T', ' ').substring(0, 16) + 'Z'", "replace('T', ' ').substring(0, 16) + ' UTC'");

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
