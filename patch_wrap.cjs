const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Sözleşme Referansı
const contractOld = `{isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{contractRef}</div>
                    ) : (
                      <input 
                        type="text"
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
const contractNew = `{isGenerating ? (
                      <div className="text-zinc-200 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible -ml-1 pl-1 py-[1px]">{contractRef}</div>
                    ) : (
                      <textarea 
                        rows={2}
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        className="text-zinc-200 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors resize-none -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
content = content.replace(contractOld, contractNew);

// Metodoloji
const methodOld = `{isGenerating ? (
                      <div className="text-blue-400 font-mono text-sm -ml-1 pl-1 py-[1px]">{methodology}</div>
                    ) : (
                      <input 
                        type="text"
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        className="text-blue-400 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
const methodNew = `{isGenerating ? (
                      <div className="text-blue-400 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible -ml-1 pl-1 py-[1px]">{methodology}</div>
                    ) : (
                      <textarea 
                        rows={2}
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        className="text-blue-400 font-mono text-[11px] leading-tight whitespace-normal break-words overflow-visible bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors resize-none -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
content = content.replace(methodOld, methodNew);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
