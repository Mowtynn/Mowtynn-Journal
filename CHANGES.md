# Değişiklik Özeti

## Hata düzeltmeleri
- firestore.rules: herkes herkesin verisine erişebiliyordu -> sahibine özel kurallar. Yayın: `firebase deploy --only firestore:rules`
- server.ts: /api/proxy-image ve /api/resolve-tv SSRF'e açıktı -> IP/host/yönlendirme doğrulaması, sadece image, 15 MB sınırı; sabit zamanlı parola karşılaştırması; verify-token rate limit; PORT env desteği
- AddTradeForm: düzenlemede tarih/saat değişikliği kaydedilmiyordu
- strategyAnalytics: saat/gün analizi NY saatine çevrildi; saat formatı tekilleştirildi; Monte Carlo gerçek R dağılımından ve sabit tohumla; Asia range kovaları parite medyanına göre
- App.tsx: silinen işlemlerin eski cihazdan geri yüklenmesi engellendi
- exportTrades: DXY, Premium/Discount, NY saati, bias, spread, çıkış nedeni, potansiyel R, R bazlı PF/beklenti
- AICoPilotModal: yeni alanlar + NY saati gönderiliyor

## Yeni
- src/components/AsiaEdgeLab.tsx + src/lib/asiaAnalytics.ts + src/lib/tradingTime.ts
- Strateji laboratuvarında "Asia Edge Lab" sekmesi
- İşlem formunda opsiyonel: 1H/4H bias, çıkış nedeni, spread

## Doğrulama
Ağ kapalıydı; tam build çalıştırılmadı. Önce: `npm install && npm run lint && npm run build`

## 2. tur: tasarım + yayına hazırlık
- index.css: ince overlay scrollbar'lar (hover'da belirir), sürekli scrollbar kaldırıldı, klavye odak halkası geri geldi (önceden tüm odak çerçeveleri kapalıydı), azaltılmış hareket desteği, tabular rakamlar, 9–11px yazılar biraz büyütüldü, dokunmatikte daha büyük form alanları, çift font yüklemesi kaldırıldı
- package.json: eksik `html2canvas` eklendi (build'i kırıyordu), kullanılmayan `canvas` (native) ve `glob` kaldırıldı, engines eklendi
- server.ts: `node dist/server.cjs` artık NODE_ENV olmasa da dev (Vite) modunda açılmıyor; hash'li dosyalar immutable, diğerleri 1 saat cache
- storage.rules: sadece kendi klasörüne, sadece image, 5 MB sınırı
- render.yaml, README.md (yayın adımları), index.html (color-scheme, theme-color)
- Silindi: kök dizindeki tek seferlik .py scriptleri, bun.lock (çift lock dosyası)

## 3. tur: sadeleştirme, akıcılık, konfor
- İşlem ekleme: 1H/4H Bias ve Spread alanları kaldırıldı. Bunlara bağlı analiz kartları (Bias Uyumu, parite spread çipleri, kapsama satırları, kombinasyon boyutu), detay satırları, dışa aktarma sütunları ve AI Co-Pilot alanları da çıkarıldı. Eski işlemlerdeki mevcut bias/spread değerleri düzenleme sırasında silinmez (veri korunur).
- Detaylı Analiz: üst metrikler anında çizilir, ağır panel ilk boyamadan sonra kesintiye uğramayan bir geçişle bağlanır (sabit yükseklikli iskelet, sayfa zıplamaz). `calculateAdvancedMetrics` aynı işlem dizisi için önbelleğe alındı. Hesaplama formülleri değişmedi.
- Strateji & Edge Laboratuvarı: sekme şeridi artık kaydırılmıyor; sağ/sol butonlarla kayıyor, seçilen sekme otomatik görünür alana getiriliyor. KPI şeridi kaydırma yerine satıra sarılıyor.
- Pencere açılınca arka planın kayması: `scrollbar-gutter: stable` + scroll kilidinde (desteklemeyen tarayıcılar için) padding telafisi; kilidi olmayan 6 bileşendeki pencereye kilit eklendi; modal overlay'e `overscroll-contain`.
- CSS: buton/input varsayılan geçişleri `@layer base` içine alındı (Tailwind sınıfları ezilmiyor) ve `transform` geçişi kaldırıldı (motion animasyonlarıyla çakışıp gecikme yaratıyordu); tablo satırlarındaki `content-visibility` kaldırıldı (sütun genişliği zıplaması).
- Firebase kuralları (firestore.rules, storage.rules, indexes) değiştirilmedi.

## Doğrulama notu
Ağ kapalı olduğu için `npm install` / `npm run build` bu ortamda çalıştırılamadı. TypeScript ile sözdizimi ve tanımsız isim taraması yapıldı (yeni hata yok). Yayından önce: `npm install && npm run lint && npm run build`.

## 4. tur: site genelinde hata ve anormallik taraması
- server.ts: `trust proxy` eklendi (Render arkasında tüm kullanıcılar tek IP görünüyordu; parola rate limit'i herkes için ortak sayılıyordu). Global 10 MB JSON sınırı `/api/voice-to-*` rotalarının 50 MB sınırını 413 ile kesiyordu, düzeltildi. Var olmayan `/api/*` ve eksik dosya istekleri artık HTML yerine 404 döner. Merkezi hata yakalayıcı (yığın izi sızmaz), `SIGTERM` ile düzgün kapanış, başlangıç hatalarında temiz çıkış, `x-powered-by` kapatıldı.
- vite.config.ts (PWA): `/api` istekleri service worker fallback'inden hariç tutuldu, eski önbellekler temizleniyor, yeni sürüm hemen devralıyor; geliştirme modunda SW kapatıldı.
- index.html: `viewport-fit=cover` (çentikli telefonlarda safe-area boşlukları çalışsın).
- Erişilebilirlik: Strateji Laboratuvarı'nda tüm kontrollerin klavye odak çerçevesini kapatan sınıflar kaldırıldı; `target="_blank"` bağlantısına `rel="noopener noreferrer"` eklendi.
- Firebase kuralları yine değiştirilmedi.
