import React, { useEffect, useMemo, useState } from "react";
import { smartUpper } from '../../constants/constants';
import { ChevronLeft, ChevronRight, X, CalendarRange, ShieldCheck, ShieldAlert, Trophy, TrendingDown, Target, Save, Check } from "lucide-react";
import type { JournalEntry, Trade, WeeklyAnswers } from "../../types";
import {
  addDays,
  buildWeeklyEntry,
  computeWeekReview,
  currentWeekStart,
  findWeeklyEntry,
  isAnswered,
} from "../../lib/weeklyReview";

/**
 * Haftalık değerlendirme (Günlük sekmesi sağ panel). Üst yarı işlemlerden otomatik hesaplanır (NY haftası),
 * alt yarı üç kısa soru. Kayıt sabit kimlikli günlük kaydıdır (weekly-<pazartesi>); istatistik saklanmaz.
 */

const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const EMPTY: WeeklyAnswers = { good: "", avoid: "", focus: "" };

const fmtR = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toFixed(d)}R`;
const tone = (v: number) => (v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-zinc-300");

const QUESTIONS: { key: keyof WeeklyAnswers; label: string; placeholder: string }[] = [
  { key: "good", label: "Bu hafta neyi iyi yaptım?", placeholder: "Plana sadık kaldığım, iyi yönettiğim işlemler…" },
  { key: "avoid", label: "Neyi tekrar etmemeliyim?", placeholder: "Kural ihlalleri, erken çıkışlar, FOMO…" },
  { key: "focus", label: "Gelecek haftanın tek odağı", placeholder: "Tek, ölçülebilir bir hedef (ör. günde en fazla 2 işlem)" },
];

export const WeeklyReview = React.memo(function WeeklyReview({
  trades,
  entries,
  weekStart,
  onChangeWeek,
  onSave,
  onClose,
  scope = "",
  scopeName = "Tüm hesaplar",
}: {
  /** Üst çubuktaki hesap kapsamının anahtarı ve adı: her kapsamın değerlendirmesi ayrı tutulur */
  scope?: string;
  scopeName?: string;
  trades: Trade[];
  entries: JournalEntry[];
  weekStart: string;
  onChangeWeek: (weekStart: string) => void;
  onSave: (entry: JournalEntry) => void;
  onClose: () => void;
}) {
  const review = useMemo(() => computeWeekReview(trades, weekStart), [trades, weekStart]);
  const entry = findWeeklyEntry(entries, weekStart, scope);
  const prevFocus = findWeeklyEntry(entries, addDays(weekStart, -7), scope)?.weekly?.focus?.trim() || "";
  const thisWeek = currentWeekStart();
  const isFuture = weekStart > thisWeek;

  const saved = entry?.weekly ?? EMPTY;
  const [answers, setAnswers] = useState<WeeklyAnswers>(saved);
  // Hafta değişince ya da kayıt başka cihazdan güncellenince taslak kayıtlı cevaplara döner
  useEffect(() => {
    setAnswers(entry?.weekly ?? EMPTY);
  }, [weekStart, scope, entry?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = answers.good !== saved.good || answers.avoid !== saved.avoid || answers.focus !== saved.focus;
  const save = () => {
    if (!dirty) return;
    onSave(buildWeeklyEntry(weekStart, answers, entry, scope, scope ? scopeName : ""));
  };

  const t = review.totals;
  const p = review.previous;
  const delta = t.netR - p.netR;
  // Hafta sonu sütunları yalnızca o günlerde işlem varsa gösterilir
  const shownDays = review.days.filter((d) => d.index < 5 || d.n > 0);
  const maxAbs = Math.max(1, ...shownDays.map((d) => Math.abs(d.netR)));

  const card = "bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5";
  const tile = "bg-zinc-950/60 border border-zinc-800/70 rounded-xl px-3 py-2 min-w-0";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Başlık + hafta gezinme */}
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
            <CalendarRange size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100 leading-none">Haftalık değerlendirme</h2>
            <p className="text-[11px] text-zinc-500 font-sans mt-1 truncate" title={`${review.label} · ${scopeName}`}>
              {review.label} · <span className="text-zinc-300 font-semibold">{scopeName}</span>
              {isAnswered(entry?.weekly) ? " · yazıldı" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" className="btn-icon" aria-label="Önceki hafta" onClick={() => onChangeWeek(addDays(weekStart, -7))}>
            <ChevronLeft size={16} />
          </button>
          {weekStart !== thisWeek && (
            <button
              type="button"
              onClick={() => onChangeWeek(thisWeek)}
              className="h-8 px-2.5 rounded-lg border border-zinc-700/70 bg-zinc-900 text-[11px] font-bold text-zinc-300 hover:text-white hover:border-zinc-500 transition-ui cursor-pointer"
            >
              Bu hafta
            </button>
          )}
          <button
            type="button"
            className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Sonraki hafta"
            disabled={weekStart >= thisWeek}
            onClick={() => onChangeWeek(addDays(weekStart, 7))}
          >
            <ChevronRight size={16} />
          </button>
          <span className="w-px h-6 bg-zinc-800 mx-1" aria-hidden />
          <button type="button" className="btn-icon" aria-label="Kapat" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Masaüstünde tek ekran: üstte özet, altta solda disiplin/kurulumlar, sağda sorular. Telefonda tek sütun ve kaydırma. */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Otomatik özet */}
        <section className={`${card} shrink-0`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className={tile}>
              <p className="heading-3">Net R</p>
              <p className={`text-lg font-bold tabular-nums leading-tight ${tone(t.netR)}`}>{fmtR(t.netR)}</p>
              <p className="text-[10px] text-zinc-500 tabular-nums truncate">
                {p.n > 0 ? `geçen hafta ${fmtR(p.netR)} · ${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(2)}R` : "geçen hafta işlem yok"}
              </p>
            </div>
            <div className={tile}>
              <p className="heading-3">İşlem</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-zinc-100">{t.n}</p>
              <p className="text-[10px] text-zinc-500 tabular-nums truncate">
                {t.wins}W · {t.losses}L{t.breakevens ? ` · ${t.breakevens}BE` : ""}
              </p>
            </div>
            <div className={tile}>
              <p className="heading-3">Kazanma oranı</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-blue-300">%{t.winRate.toFixed(0)}</p>
              <p className="text-[10px] text-zinc-500 tabular-nums truncate">{p.n > 0 ? `geçen hafta %${p.winRate.toFixed(0)}` : "—"}</p>
            </div>
            <div className={tile}>
              <p className="heading-3">Beklenti</p>
              <p className={`text-lg font-bold tabular-nums leading-tight ${tone(t.expectancy)}`}>{t.n ? fmtR(t.expectancy) : "—"}</p>
              <p className="text-[10px] text-zinc-500 truncate">işlem başına</p>
            </div>
          </div>

          {/* Gün gün R şeridi */}
          <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${shownDays.length}, minmax(0, 1fr))` }}>
            {shownDays.map((d) => (
              <div key={d.key} className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-2 py-1.5 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] font-bold text-zinc-500">{DAY_SHORT[d.index]}</span>
                  <span className="text-[10px] text-zinc-600 tabular-nums">{d.n || ""}</span>
                </div>
                <p className={`text-xs font-bold tabular-nums truncate ${d.n ? tone(d.netR) : "text-zinc-700"}`}>{d.n ? fmtR(d.netR, 1) : "—"}</p>
                <div className="h-1 mt-1 rounded-full bg-zinc-800/80 overflow-hidden" aria-hidden>
                  {d.n > 0 && (
                    <div className={`h-full rounded-full ${d.netR >= 0 ? "bg-emerald-500/70" : "bg-rose-500/70"}`} style={{ width: `${Math.max(6, (Math.abs(d.netR) / maxAbs) * 100)}%` }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="lg:flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Sol: disiplin + kurulumlar (uzun ihlal listesi yalnızca bu sütunda kayar) */}
          <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
            {t.n === 0 ? (
              <div className={`${card} flex-1 flex items-center justify-center text-center text-xs text-zinc-500`}>
                {isFuture ? "Bu hafta henüz başlamadı." : "Bu hafta işlem yok. Yine de haftayı değerlendirebilirsin."}
              </div>
            ) : (
              <>
                <section className={`${card} flex flex-col gap-2`}>
                  <h4 className="heading-2">
                    <ShieldCheck size={12} /> Disiplin
                    <span className="ml-auto text-[10px] font-bold text-zinc-500 normal-case tracking-normal">
                      {review.cleanCount}/{t.n} işlem kurallara uygun
                    </span>
                  </h4>
                  {review.violations.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <ShieldCheck size={14} className="shrink-0" /> Kurallara Uygun Hafta
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {review.violations.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-200 min-w-0">
                            <ShieldAlert size={13} className="text-rose-300 shrink-0" />
                            <span className="truncate" title={v.title}>{v.title}</span>
                          </span>
                          <span className="text-[11px] font-bold tabular-nums text-zinc-400 shrink-0">
                            {v.count}× · <span className={tone(v.costR)}>{fmtR(v.costR, 1)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className={`${card} flex flex-col gap-2`}>
                  <h4 className="heading-2">
                    <Trophy size={12} /> Kurulumlar
                    <span className="ml-auto text-[10px] font-bold text-zinc-500 normal-case tracking-normal truncate">Asia Range · seans · Entry Model</span>
                  </h4>
                  {[
                    { label: "En iyi", row: review.best, icon: <Trophy size={13} className="text-emerald-300 shrink-0" />, empty: "Kazandıran kurulum yok" },
                    { label: "En kötü", row: review.worst, icon: <TrendingDown size={13} className="text-rose-300 shrink-0" />, empty: "Kaybettiren kurulum yok" },
                  ].map((x) => (
                    <div key={x.label} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-1.5 min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        {x.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 shrink-0">{smartUpper(x.label)}</span>
                        <span className="text-xs font-semibold text-zinc-200 truncate" title={x.row?.label}>{x.row ? x.row.label : x.empty}</span>
                      </span>
                      {x.row && (
                        <span className="text-[11px] font-bold tabular-nums shrink-0">
                          <span className={tone(x.row.netR)}>{fmtR(x.row.netR, 1)}</span>
                          <span className="text-zinc-500"> · {x.row.n} işlem</span>
                        </span>
                      )}
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>

          {/* Sağ: üç soru — kutular kalan yüksekliği paylaşır */}
          <section className={`${card} flex flex-col gap-2.5 lg:min-h-0`}>
            {prevFocus && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/5 px-3 py-1.5 min-w-0 shrink-0" title={prevFocus}>
                <Target size={13} className="text-blue-300 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 shrink-0">{smartUpper("Bu haftanın odağı")}</span>
                <span className="text-xs text-zinc-200 truncate">{prevFocus}</span>
              </div>
            )}
            {QUESTIONS.map((q) => (
              <label key={q.key} className="flex flex-col gap-1.5 lg:flex-1 lg:min-h-0">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide shrink-0">{smartUpper(q.label)}</span>
                <textarea
                  value={answers[q.key]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      save();
                    }
                  }}
                  placeholder={q.placeholder}
                  rows={q.key === "focus" ? 2 : 3}
                  maxLength={5000}
                  className="w-full min-h-[3rem] lg:flex-1 bg-zinc-950/80 border border-zinc-700/70 hover:border-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-2.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-ui resize-y lg:resize-none leading-relaxed custom-scrollbar"
                />
              </label>
            ))}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <span className="text-[10px] text-zinc-500 truncate">Ctrl + Enter ile kaydet · odak gelecek hafta hatırlatılır</span>
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className="h-9 px-4 shrink-0 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-ui cursor-pointer bg-blue-500/15 border border-blue-500/40 text-blue-100 hover:bg-blue-500/25 disabled:opacity-50 disabled:cursor-default disabled:hover:bg-blue-500/15"
              >
                {dirty ? <Save size={13} /> : <Check size={13} />}
                {dirty ? "Kaydet" : isAnswered(entry?.weekly) ? "Kaydedildi" : "Kaydet"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});
