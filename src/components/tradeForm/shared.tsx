import { SPRING } from '../../lib/motion';
import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Trade, DefinitionTitles, AccountCategory } from "../../types";
import { DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString, smartUpper, getTradeAccountKind } from "../../constants/constants";
import { toNyInput, newTradeDateInput } from '../../lib/tradingTime';
import { tradeConfirmations } from '../../lib/tradeModel';

/** İşlem formu: bölümlerin ortak sabitleri, türleri ve yardımcıları */

export type Num = number | "";
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
type TitleFn = (key: keyof DefinitionTitles) => string;

/** Seçili değer Tanımlamalar'dan silinmiş olsa bile (düzenleme modunda) chip olarak görünsün */
export const withSelected = (list: string[], selected: string[]) => {
  const extra = selected.filter((x) => x && !list.includes(x));
  return extra.length > 0 ? [...list, ...extra] : list;
};

/** Kurulum çiplerinin ortak ölçüsü (Confirmations) */
export const CHIP_BASE = "relative px-3 py-1.5 text-label rounded-xl transition-ui font-sans font-bold tracking-wide cursor-pointer border uppercase";

export const numOr = (v: unknown): Num => (typeof v === "number" && Number.isFinite(v) ? v : "");
export { statusOfR } from '../../lib/tradeModel';

/**
 * Formun ilk değerleri doğrudan işlemden (ya da boş) kurulur. Eskiden form önce boş çizilip
 * ardından bir efekt ~30 alanı tek tek doldurup/sıfırlıyordu: açılışta fazladan bir tam çizim.
 */
export function buildInitial(t: Trade | null) {
  return {
    asset: t?.asset || "",
    type: (t?.type || "LONG") as "LONG" | "SHORT",
    accountKind: (t ? getTradeAccountKind(t) : null) as AccountCategory | null,
    trend: t?.trend || "",
    confirmations: t ? tradeConfirmations(t) : [],
    asiaRange: (t?.asiaRange || "") as string,
    sweepTime: t?.sweepTime || "",
    poiTimeframe: t?.poiTimeframe || "",
    rrValue: numOr(t?.rr),
    notes: t?.notes || "",
    screenshot: t?.screenshot || null,
    // Düzenlemede işlemin NY işlem günü; yeni işlemde bugünün Türkiye takvim günü
    tradeDate: t?.createdAt ? toNyInput(t.createdAt) : newTradeDateInput(Date.now()),
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

const SLIDE_SPRING = SPRING.indicator;
export function SlideBg({ id, className, rounded = "rounded-lg" }: { id: string; className: string; rounded?: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={SLIDE_SPRING}
      className={`absolute inset-0 border pointer-events-none ${rounded} ${className}`}
    />
  );
}
