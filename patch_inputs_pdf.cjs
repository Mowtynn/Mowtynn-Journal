const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// Add delay for DOM update
content = content.replace("setIsGenerating(true);\n    const toastId = toast.loading('PDF Oluşturuluyor...');", "setIsGenerating(true);\n    const toastId = toast.loading('PDF Oluşturuluyor...');\n    await new Promise(resolve => setTimeout(resolve, 100));");

// Replace clientOrg input
const oldClientOrg = `<input 
                      type="text"
                      value={clientOrg}
                      onChange={(e) => setClientOrg(e.target.value)}
                      className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;
const newClientOrg = `{isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{clientOrg}</div>
                    ) : (
                      <input 
                        type="text"
                        value={clientOrg}
                        onChange={(e) => setClientOrg(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
content = content.replace(oldClientOrg, newClientOrg);

// Replace contractRef input
const oldContractRef = `<input 
                      type="text"
                      value={contractRef}
                      onChange={(e) => setContractRef(e.target.value)}
                      className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;
const newContractRef = `{isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{contractRef}</div>
                    ) : (
                      <input 
                        type="text"
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
content = content.replace(oldContractRef, newContractRef);

// Replace methodology input
const oldMethodology = `<input 
                      type="text"
                      value={methodology}
                      onChange={(e) => setMethodology(e.target.value)}
                      className="text-blue-400 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1"
                    />`;
const newMethodology = `{isGenerating ? (
                      <div className="text-blue-400 font-mono text-sm -ml-1 pl-1 py-[1px]">{methodology}</div>
                    ) : (
                      <input 
                        type="text"
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        className="text-blue-400 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}`;
content = content.replace(oldMethodology, newMethodology);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
