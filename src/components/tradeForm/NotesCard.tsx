import React, { useEffect, useState } from "react";
import { X, FileText, Image as ImageIcon, ExternalLink, Check } from "lucide-react";
import { SetState, Titles } from './shared';
import { isHttpLink, normalizeChartLink, resolveChartImage } from '../../lib/chartLink';
import { isImageRef } from '../../lib/imageStore';

/*
 * Analiz notları ve grafik bağlantısı iki ayrı kart: form sütunları dengeli dağılır, kaydırma gerekmez.
 * - NotesCard: notlar metni (1. sütunda, kalan yüksekliği doldurur)
 * - ChartLinkCard: grafik linki + önizleme (3. sütunda Sonuç'un altında, kalan yüksekliği doldurur)
 */

const cardCls = "tf-card bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm flex-1 min-h-0";

export const NotesCard = React.memo(function NotesCard({
  titles,
  notes,
  setNotes,
}: {
  titles: Titles;
  notes: string;
  setNotes: SetState<string>;
}) {
  const { L } = titles;
  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 shrink-0 pb-2.5 border-b border-zinc-800/60">
        <FileText size={14} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("notesCard")}</span>
      </div>
      <textarea
        placeholder="Setup kurgusu, destek/direnç, psikolojik etkenler veya FOMO notlarınız..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full flex-1 min-h-[96px] bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-ui resize-none leading-relaxed font-sans font-medium shadow-inner"
      />
    </div>
  );
});

export const ChartLinkCard = React.memo(function ChartLinkCard({
  titles,
  screenshot,
  setScreenshot,
}: {
  titles: Titles;
  screenshot: string | null;
  setScreenshot: SetState<string | null>;
}) {
  const { L } = titles;
  const link = (screenshot || "").trim();
  // Eski kayıtlardaki gömülü / kayıtlı görsel: kutuda ham veri yerine açıklama gösterilir; link yapıştırınca yerini alır
  const embedded = link.startsWith("data:image") || isImageRef(link);
  const valid = isHttpLink(link) || embedded;
  // Önizleme: TradingView paylaşım linki görsele çözülür; yazarken her tuşta istek atılmasın diye kısa gecikme
  const [preview, setPreview] = useState<{ src: string; state: "loading" | "ok" | "error" } | null>(null);
  useEffect(() => {
    if (!valid) {
      setPreview(null);
      return;
    }
    let alive = true;
    setPreview({ src: "", state: "loading" });
    const timer = window.setTimeout(() => {
      resolveChartImage(link).then((src) => alive && setPreview({ src, state: "loading" }));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [link, valid]);

  const commit = (raw: string) => {
    const v = normalizeChartLink(raw);
    setScreenshot(v ? v : null);
  };

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between shrink-0 pb-2.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-zinc-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">{L("chartLink")}</span>
        </div>
        {valid && (
          <span className="text-[11px] text-emerald-400 font-sans flex items-center gap-1 font-bold">
            <Check size={11} /> Eklendi
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <input
          type="url"
          inputMode="url"
          value={embedded ? "" : screenshot || ""}
          onChange={(e) => setScreenshot(e.target.value || null)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!text) return;
            e.preventDefault();
            commit(text);
          }}
          onBlur={(e) => {
            // Kayıtlı görsel varken boş kutudan çıkmak onu silmez (silmek için ✕)
            if (embedded && !e.target.value.trim()) return;
            commit(e.target.value);
          }}
          placeholder={embedded ? "Kayıtlı görsel var · yerine link yapıştırabilirsin" : "https://... TradingView veya grafik linki"}
          aria-invalid={!!link && !valid}
          className={`flex-1 min-w-0 h-9 bg-zinc-950/80 border hover:border-zinc-500 focus:ring-1 rounded-lg sm:rounded-xl px-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-ui font-sans font-medium shadow-inner truncate ${
            link && !valid ? "border-amber-500/60 focus:border-amber-500 focus:ring-amber-500/30" : "border-zinc-700/70 focus:border-blue-500 focus:ring-blue-500/30"
          }`}
        />
        {valid && !embedded && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Grafiği yeni sekmede aç"
            title="Grafiği yeni sekmede aç"
            className="h-9 w-9 bg-zinc-900 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-700/70 rounded-lg sm:rounded-xl text-zinc-400 transition-colors shrink-0 flex items-center justify-center"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {link && (
          <button
            type="button"
            onClick={() => setScreenshot(null)}
            aria-label="Grafik linkini sil"
            title="Grafik linkini sil"
            className="h-9 w-9 bg-zinc-900 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700/70 rounded-lg sm:rounded-xl text-zinc-400 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/*
        Önizleme kartın KALAN yüksekliğine sığar: görsel mutlak konumlu olduğundan boyutu yerleşimi büyütmez,
        link yapıştırınca form uzayıp kaydırma çıkmaz. Görsel orantısı korunarak tamamı gösterilir.
      */}
      <div className="relative flex-1 min-h-[64px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
        {!link ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-600 font-sans text-center px-3 border border-dashed border-zinc-800 rounded-xl">
            Link eklenince grafik önizlemesi burada görünür
          </p>
        ) : !valid ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-amber-400/90 font-sans text-center px-3">
            Geçerli bir bağlantı değil (https://… ile başlamalı)
          </p>
        ) : (
          <>
            {preview?.src && (
              <a href={embedded ? preview.src : link} target="_blank" rel="noopener noreferrer" className="absolute inset-0" title="Grafiği yeni sekmede aç">
                <img
                  decoding="async"
                  src={preview.src}
                  alt="Grafik önizleme"
                  referrerPolicy="no-referrer"
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${preview.state === "ok" ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setPreview((p) => (p ? { ...p, state: "ok" } : p))}
                  onError={() => setPreview((p) => (p ? { ...p, state: "error" } : p))}
                />
              </a>
            )}
            {preview?.state !== "ok" && (
              <p className="absolute inset-0 flex items-center justify-center text-[11px] font-sans text-center px-3 pointer-events-none text-zinc-500">
                {preview?.state === "error" ? "Önizleme yok; link yine de kaydedilir" : "Önizleme yükleniyor…"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
});
