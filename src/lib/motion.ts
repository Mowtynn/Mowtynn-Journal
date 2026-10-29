/**
 * Proje genelinde tek hareket sistemi.
 * Tüm animasyonlar aynı eğriyi ve aynı yay (spring) ayarlarını kullanır; böylece
 * modal, liste, sekme, buton ve gösterge geçişleri tek bir bütün gibi hissedilir.
 * CSS tarafındaki karşılığı: index.css içindeki --ease-out-expo.
 */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];


export const SPRING = {
  /** Kayan göstergeler (sekme alt çizgisi, filtre/segment vurgusu) */
  indicator: { type: 'spring', stiffness: 450, damping: 35 },
  /** Buton basma / bırakma geri bildirimi */
  press: { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 },
  /** Yeni eklenen öğenin girişi */
  enter: { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 },
} as const;

/**
 * Pencere (modal) açılış / kapanış animasyonu: projedeki TÜM pencereler bunu kullanır.
 * Açılış yavaşça yerine oturur (expo-out), kapanış biraz daha hızlı ve aynı yoldan geri döner.
 * Yalnızca opacity + transform canlandırılır (compositor'da çalışır, ana iş parçacığını yormaz).
 */
export const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

export const MODAL_BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: EASE_IN } },
} as const;

export const MODAL_PANEL = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18, ease: EASE_IN } },
} as const;

/** Açılır menü / popover (tarih seçici, hesap menüsü): pencerenin küçük kardeşi */
export const POPOVER = {
  initial: { opacity: 0, scale: 0.97, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.14, ease: EASE_IN } },
} as const;

/** Yukarı doğru açılan menü (tarih seçicideki saat / dakika menüleri): aynı hareketin aynası */
export const POPOVER_UP = {
  initial: { opacity: 0, scale: 0.97, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: EASE_IN } },
} as const;

/** Pencere kapanırken çıkış animasyonu bitene kadar bileşeni bağlı tutar (koşullu mount çıkışı yok etmesin). */
export const MODAL_EXIT_MS = 320;

/** Sekme / panel içeriği geçişi (AI Co-Pilot sekmeleri, sayfalama vb.): kısa çıkış, yumuşak giriş */
export const PANE = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_IN } },
} as const;
