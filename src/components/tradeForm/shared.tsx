import { SPRING } from '../../lib/motion';
import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Trade, DefinitionTitles, PropAccount } from "../../types";
import { DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString, smartUpper } from "../../constants/constants";
import { toNyInput } from '../../lib/tradingTime';

/** İşlem formu: bölümlerin ortak sabitleri, türleri ve yardımcıları */
export const NO_ACCOUNT = "__none__";

export type Num = number | "";
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
export type TitleFn = (key: keyof DefinitionTitles) => string;
/** name: işleme yazılan tam ad ("FTMO 100K · Phase 1"); label: çipte görünen zincir adı (aşama ayrıca rozetle gösterilir) */
export type AccountOption = { id: string; name: string; label: string; stage: number; size?: number; status?: PropAccount["status"] };

/** Seçili değer Tanımlamalar'dan silinmiş olsa bile (düzenleme modunda) chip olarak görünsün */
export const withSelected = (list: string[], selected: string[]) => {
  const extra = selected.filter((x) => x && !list.includes(x));
  return extra.length > 0 ? [...list, ...extra] : list;
};

/** Kurulum çiplerinin ortak ölçüsü (Sweep Time, Session, Entry, Target, Confirmations hepsi aynı) */
export const CHIP_BASE = "relative px-3 py-1.5 text-[11px] rounded-xl transition-ui font-sans font-bold tracking-wide cursor-pointer border uppercase";

export const numOr = (v: unknown): Num => (typeof v === "number" && Number.isFinite(v) ? v : "");
export { statusOfR } from '../../lib/tradeModel';

/**
 * Formun ilk değerleri doğrudan işlemden (ya da boş) kurulur. Eskiden form önce boş çizilip
 * ardından bir efekt ~30 alanı tek tek doldurup/sıfırlıyordu: açılışta fazladan bir tam çizim.
 */
/** riskPresets: Tanımlamalar'daki hazır risk yüzdeleri; işlemin riski bunlardan biri değilse elle giriş (CUSTOM) açılır */
export function buildInitial(t: Trade | null, riskPresets: number[]) {
  const rp = t?.riskPct;
  const hasRisk = typeof rp === "number" && rp > 0;
  return {
    asset: t?.asset || "",
    type: (t?.type || "LONG") as "LONG" | "SHORT",
    accountChoice: (t ? (t.accountId ? t.accountId : t.accountCategory === "DEMO" ? NO_ACCOUNT : null) : null) as string | null,
    riskChoice: (hasRisk ? (riskPresets.includes(rp as number) ? rp : "CUSTOM") : null) as number | "CUSTOM" | null,
    customRiskPct: (hasRisk && !riskPresets.includes(rp as number) ? rp : "") as Num,
    session: t?.session || "",
    entries: Array.isArray(t?.entryModels) ? (t!.entryModels as string[]) : [],
    trend: t?.trend || "",
    planFidelity: t?.planFidelity || null,
    tpTargets: Array.isArray(t?.tpTargets) ? (t!.tpTargets as string[]) : [],
    premiumDiscount: t?.premiumDiscount || "",
    newsDay: (typeof t?.newsDay === "boolean" ? t.newsDay : null) as boolean | null,
    asiaRange: (t?.asiaRange || "") as string,
    sweepTime: t?.sweepTime || "",
    asiaFvg: t?.asiaRangeFvg || "",
    rrValue: numOr(t?.rr),
    notes: t?.notes || "",
    screenshot: t?.screenshot || null,
    tradeDate: toNyInput(t?.createdAt || Date.now()),
  };
}

/** Form başlıkları (Tanımlamalar > Form Başlıkları) — başlık nesnesi değişmedikçe aynı fonksiyonlar, büyük harf dönüşümü önbellekli */
export function useTitles(definitionTitles: DefinitionTitles) {
  return useMemo(() => {
    const cache = new Map<string, string>();
    const T: TitleFn = (key) =>
      cleanDefinitionTitleString(definitionTitles[key]) || cleanDefinitionTitleString(DEFAULT_DEFINITION_TITLES[key]) || "";
    const L: TitleFn = (key) => {
      let v = cache.get(key);
      if (v === undefined) {
        v = smartUpper(T(key));
        cache.set(key, v);
      }
      return v;
    };
    // Tanımlama listesi başlıkları (örn. definitionTitles.sessions || "SESSION") için de aynı önbellek
    const H = (key: keyof DefinitionTitles, fallback: string) => {
      const k = `h:${key}`;
      let v = cache.get(k);
      if (v === undefined) {
        v = smartUpper(cleanDefinitionTitleString(definitionTitles[key]) || fallback);
        cache.set(k, v);
      }
      return v;
    };
    return { T, L, H };
  }, [definitionTitles]);
}
export type Titles = ReturnType<typeof useTitles>;

export const SLIDE_SPRING = SPRING.indicator;
export function SlideBg({ id, className, rounded = "rounded-lg" }: { id: string; className: string; rounded?: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={SLIDE_SPRING}
      className={`absolute inset-0 border pointer-events-none ${rounded} ${className}`}
    />
  );
}
