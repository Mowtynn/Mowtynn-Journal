const fs = require('fs');
const content = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf-8');

const newBtn = `            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold font-mono tracking-widest uppercase bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95"
            >
              <ShieldCheck size={13} />
              <span>Vergilendirme</span>
            </button>
`;

const updatedContent = content.replace('<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">', '<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">\n' + newBtn);

fs.writeFileSync('src/components/PrintReportModal.tsx', updatedContent);
