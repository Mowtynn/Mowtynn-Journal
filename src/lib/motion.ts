/**
 * Proje genelinde tek hareket sistemi.
 * Tüm animasyonlar aynı eğriyi ve aynı yay (spring) ayarlarını kullanır; böylece
 * modal, liste, sekme, buton ve gösterge geçişleri tek bir bütün gibi hissedilir.
 * CSS tarafındaki karşılığı: index.css içindeki --ease-out-expo.
 */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Süreler (saniye): anlık geri bildirim / hızlı / standart / yavaş */
export const DUR = { instant: 0.1, fast: 0.15, base: 0.2, slow: 0.3 } as const;

export const SPRING = {
  /** Kayan göstergeler (sekme alt çizgisi, filtre/segment vurgusu) */
  indicator: { type: 'spring', stiffness: 450, damping: 35 },
  /** Buton basma / bırakma geri bildirimi */
  press: { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 },
  /** Yeni eklenen öğenin girişi */
  enter: { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 },
} as const;
