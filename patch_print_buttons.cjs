const fs = require('fs');
let content = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf-8');

const oldVergilendirme = `<button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold font-mono tracking-widest uppercase bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95"
            >
              <ShieldCheck size={13} />
              <span>Vergilendirme</span>
            </button>`;

const newVergilendirme = `<button
              onClick={() => setIsAuditModalOpen(true)}
              title="Vergilendirme"
              className="flex items-center justify-center w-9 h-9 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95"
            >
              <ShieldCheck size={15} />
            </button>`;

const oldDownload = `<button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold font-mono tracking-widest uppercase bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>{isGenerating ? 'Hazırlanıyor...' : 'Görüntü Olarak İndir'}</span>
            </button>`;

const newDownload = `<button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              title="Görüntü Olarak İndir"
              className="flex items-center justify-center w-9 h-9 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
            </button>`;

content = content.replace(oldVergilendirme, newVergilendirme);
content = content.replace(oldDownload, newDownload);

fs.writeFileSync('src/components/PrintReportModal.tsx', content);
