const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

const regex = /<div className="grid grid-cols-1 md:grid-cols-3[\s\S]*?\{\/\* Table \*\//;

const newHeader = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-800 rounded-lg p-5 bg-zinc-900/30">
                {/* Hizmet Sağlayıcı (Yüklenici) */}
                <div className="border-r border-zinc-800/50 pr-4">
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Hizmet Sağlayıcı</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Unvan</span>
                    {isGenerating ? (
                      <div className="text-emerald-400 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerName}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                        className="text-emerald-400 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">VKN / TCKN</span>
                    {isGenerating ? (
                      <div className="text-zinc-300 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerVKN}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerVKN}
                        onChange={(e) => setProviderVKN(e.target.value)}
                        className="text-zinc-300 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Vergi Dairesi</span>
                    {isGenerating ? (
                      <div className="text-zinc-300 font-mono text-xs -ml-1 pl-1 py-[1px]">{providerTaxOffice}</div>
                    ) : (
                      <input 
                        type="text"
                        value={providerTaxOffice}
                        onChange={(e) => setProviderTaxOffice(e.target.value)}
                        className="text-zinc-300 font-mono text-xs bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>

                {/* Hizmet Alan Kuruluş */}
                <div className="border-r border-zinc-800/50 pr-4">
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Hizmet Alan Kuruluş</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Kuruluş / Platform</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{clientOrg}</div>
                    ) : (
                      <input 
                        type="text"
                        value={clientOrg}
                        onChange={(e) => setClientOrg(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Sözleşme Referansı</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{contractRef}</div>
                    ) : (
                      <input 
                        type="text"
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>

                {/* Rapor Detayları */}
                <div>
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Rapor Detayları</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Dönem / Filtre Aralığı</span>
                    {isGenerating ? (
                      <div className="text-zinc-200 font-mono text-sm -ml-1 pl-1 py-[1px]">{dateRangeState}</div>
                    ) : (
                      <input 
                        type="text"
                        value={dateRangeState}
                        onChange={(e) => setDateRangeState(e.target.value)}
                        className="text-zinc-200 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Metodoloji</span>
                    {isGenerating ? (
                      <div className="text-blue-400 font-mono text-sm -ml-1 pl-1 py-[1px]">{methodology}</div>
                    ) : (
                      <input 
                        type="text"
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        className="text-blue-400 font-mono text-sm bg-transparent border-none outline-none p-0 w-full hover:bg-zinc-800/30 focus:bg-zinc-800/50 rounded transition-colors -ml-1 pl-1 py-[1px]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */`;

content = content.replace(regex, newHeader);
fs.writeFileSync('src/components/AuditReportModal.tsx', content);
