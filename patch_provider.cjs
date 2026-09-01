const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

// 1. Add states for Service Provider
const stateBlock = `  const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');`;
const newStates = `  const [providerName, setProviderName] = useState('Esat Peker / Quant Developer');
  const [providerVKN, setProviderVKN] = useState('11111111111');
  const [providerTaxOffice, setProviderTaxOffice] = useState('Zincirlikuyu V.D.');
  const [clientOrg, setClientOrg] = useState(trades.find(t => t.platform)?.platform || 'FSL PROP DMCC');`;
content = content.replace(stateBlock, newStates);

// 2. Add Service Provider block to UI
const headerBlock = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-zinc-800 rounded-lg p-5 bg-zinc-900/30">`;
const newHeaderBlock = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-800 rounded-lg p-5 bg-zinc-900/30">
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
                  <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Hizmet Alan Kuruluş</span>`;

content = content.replace(headerBlock, newHeaderBlock);

// Remove the inline title of the next block as we added a shared title
const oldHizmetAlanLabel = `<span className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest block mb-0.5">Hizmet Alan Kuruluş</span>`;
const newHizmetAlanLabel = `<span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Kuruluş / Platform</span>`;
content = content.replace(oldHizmetAlanLabel, newHizmetAlanLabel);

const oldSozlesmeLabel = `<span className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest block mb-0.5">Sözleşme Referansı</span>`;
const newSozlesmeLabel = `<span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Sözleşme Referansı</span>`;
content = content.replace(oldSozlesmeLabel, newSozlesmeLabel);

// Format block 3
const oldDonemLabel = `<span className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest block mb-0.5">Dönem / Filtre Aralığı</span>`;
const newDonemLabel = `<span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest block mb-3 border-b border-zinc-800/50 pb-1">Rapor Detayları</span>
                  <div className="mb-2">
                    <span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Dönem / Filtre Aralığı</span>`;
content = content.replace(oldDonemLabel, newDonemLabel);
content = content.replace(oldDonemLabel, `<span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Dönem / Filtre Aralığı</span>`); // in case there's another

const oldMetodolojiLabel = `<span className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest block mb-0.5">Metodoloji</span>`;
const newMetodolojiLabel = `<span className="text-zinc-500 text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5">Metodoloji</span>`;
content = content.replace(oldMetodolojiLabel, newMetodolojiLabel);


// 3. Fix Table Text Truncation
const oldModelCol = `<td className="py-3 px-4 text-zinc-400 truncate max-w-[180px]">{model}</td>`;
const newModelCol = `<td className="py-3 px-4 text-zinc-400 whitespace-normal break-words max-w-[220px]">{model}</td>`;
content = content.replace(oldModelCol, newModelCol);

// Fix the header width for model to match if necessary, let's leave it as is or add min-w
const oldModelTh = `<th className="py-3 px-4 font-semibold">ANALYTICAL MODEL</th>`;
const newModelTh = `<th className="py-3 px-4 font-semibold min-w-[200px]">ANALYTICAL MODEL</th>`;
content = content.replace(oldModelTh, newModelTh);

// 4. Dynamic Legal Footer
const oldFooter = `İşbu log kütüğü, {clientOrg} adına sağlanan bağımsız piyasa veri analitiği, modelleme ve strateji doğrulama hizmetlerinin teknik çıktı kayıtlarını içermektedir. Kayıtlar bulut veri tabanında zaman damgasıyla kriptografik olarak saklanmaktadır. Bu rapor tamamen bilgi ve iç denetim amaçlıdır.`;
const newFooter = `İşbu log kütüğü, {clientOrg || 'FSL PROP DMCC (Dubai, UAE)'} adına sağlanan bağımsız piyasa veri analitiği, modelleme ve strateji doğrulama hizmetlerinin teknik çıktı kayıtlarını içermektedir. Kayıtlar bulut veri tabanında zaman damgasıyla kriptografik olarak saklanmaktadır. Bu rapor tamamen bilgi ve iç denetim amaçlıdır.`;
content = content.replace(oldFooter, newFooter);

// 5. PDF and Print formatting - ensure table and columns are well sized
// Actually we already have scale: 2 in html2canvas. To make it fit perfectly, we can adjust the layout wrapping.
// The main container has w-full max-w-[297mm] min-h-[210mm] (A4 landscape).
// In downloadPDF, it scales it to A4.
// Let's ensure text sizes are optimal. The table might be slightly overflowing. 
// We can use a specific class for the table container.
const oldTableCont = `<div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/20">`;
const newTableCont = `<div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/20">`;
content = content.replace(oldTableCont, newTableCont);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
