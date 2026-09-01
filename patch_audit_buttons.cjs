const fs = require('fs');
let content = fs.readFileSync('src/components/AuditReportModal.tsx', 'utf-8');

const oldCsv = `<button
              onClick={downloadCSV}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors border border-zinc-700"
            >
              <FileText size={14} />
              <span>CSV Logu İndir</span>
            </button>`;

const newCsv = `<button
              onClick={downloadCSV}
              title="CSV Logu İndir"
              className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
            >
              <FileText size={18} />
            </button>`;

const oldPdf = `<button
              onClick={downloadPDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGenerating ? 'Hazırlanıyor...' : 'Resmi PDF Olarak İndir'}</span>
            </button>`;

const newPdf = `<button
              onClick={downloadPDF}
              disabled={isGenerating}
              title="Resmi PDF Olarak İndir"
              className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
            </button>`;

// Ensure RefreshCw is imported if we are using it
if (!content.includes('RefreshCw')) {
  content = content.replace('import { CheckCircle2, ShieldCheck, X, FileText, Download, XCircle, MinusCircle }', 'import { CheckCircle2, ShieldCheck, X, FileText, Download, XCircle, MinusCircle, RefreshCw }');
}

content = content.replace(oldCsv, newCsv);
content = content.replace(oldPdf, newPdf);

fs.writeFileSync('src/components/AuditReportModal.tsx', content);
