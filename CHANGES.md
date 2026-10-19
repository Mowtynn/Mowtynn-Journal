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

## Doğrulama notu (5. tur)
Ağ kapalı olduğu için `npm install` / `npm run build` bu ortamda çalıştırılamadı. TypeScript ile sözdizimi ve tanımsız isim taraması yapıldı (yeni hata yok). Yayından önce: `npm install && npm run lint && npm run build`.

## 4. tur: site genelinde hata ve anormallik taraması
- server.ts: `trust proxy` eklendi (Render arkasında tüm kullanıcılar tek IP görünüyordu; parola rate limit'i herkes için ortak sayılıyordu). Global 10 MB JSON sınırı `/api/voice-to-*` rotalarının 50 MB sınırını 413 ile kesiyordu, düzeltildi. Var olmayan `/api/*` ve eksik dosya istekleri artık HTML yerine 404 döner. Merkezi hata yakalayıcı (yığın izi sızmaz), `SIGTERM` ile düzgün kapanış, başlangıç hatalarında temiz çıkış, `x-powered-by` kapatıldı.
- vite.config.ts (PWA): `/api` istekleri service worker fallback'inden hariç tutuldu, eski önbellekler temizleniyor, yeni sürüm hemen devralıyor; geliştirme modunda SW kapatıldı.
- index.html: `viewport-fit=cover` (çentikli telefonlarda safe-area boşlukları çalışsın).
- Erişilebilirlik: Strateji Laboratuvarı'nda tüm kontrollerin klavye odak çerçevesini kapatan sınıflar kaldırıldı; `target="_blank"` bağlantısına `rel="noopener noreferrer"` eklendi.
- Firebase kuralları yine değiştirilmedi.

## 5. tur: Ekonomik Takvim kaldırıldı + akıcılık ve arayüz
**Kaldırılan:** Ekonomik Takvim sekmesi tamamen silindi — `EconomicCalendar.tsx`, App.tsx'teki sekme/tip/render dalı, `vite.config.ts` içindeki `/api/economic-calendar` ucu, `index.html`'deki `tradingview-widget.com` preconnect'i ve AI Co-Pilot'ta artık olmayan özelliğe yapılan atıf.

**Geç yükleme yok:** Projede `React.lazy`, `Suspense`, dinamik `import()` veya arka plan ön yüklemesi yok. Tüm kod ve kütüphaneler (xlsx, jspdf, html2canvas, html-to-image dahil) statik import'tur; font CSS'i de normal (bloklayan) stylesheet olarak yüklenir.

**Akıcılık:**
- Sekmeler keep-alive: bir sekme ilk ziyarette kurulur, sonra bellekte kalır ve yalnızca gizlenir/gösterilir. Sekme geçişi ağır ekranı (Detaylı Analiz vb.) yeniden kurmaz. Giriş animasyonu CSS'tedir (`.tab-pane`, 200 ms, bitince transform kalmaz).
- vite.config.ts `manualChunks`: `id.includes('react')` kontrolü lucide-react, react-markdown, react-virtuoso, react-hot-toast gibi paketleri de `vendor-react` içine çekiyordu; yalnızca çekirdek paketlerle sınırlandı.
- Hareket sistemi: Tailwind geçişleri varsayılan 160 ms ve `cubic-bezier(0.16, 1, 0.3, 1)`. Motion süreleri 0.1 / 0.15 / 0.2 s, `easeOut` yerine aynı eğri.
- 177 `transition-all`, yeni `transition-ui` sınıfına çevrildi (yalnızca renk, gölge, opaklık, transform; width/height/margin canlandırılmaz). 4 ilerleme çubuğu `transition-[width]`. `duration-*` / `ease-*` yine ezebilir.
- Kalıcı `will-change` / `translate3d` / `backface-visibility` katman zorlamaları kaldırıldı (sekme sarmalayıcıları, 40 yerde kullanılan `ValueTransition`, dialog seçicileri, `.gpu-layer`). Pencerelerin giriş/çıkış animasyonlarındaki geçici `willChange` korundu.
- Buton basılma efekti bağımsız `scale` özelliğiyle yumuşak geçer (motion ile çakışmaz).
- Kaydırma çubuğu: her elemanda `:hover/:focus-within` yerine yalnızca kaydırılabilir alanlarda. Yumuşak kaydırma yalnızca "hareketi azalt" tercihi yoksa.

**Arayüz:**
- Yazı: `text-rendering: auto`, kerning/optik boyut açık, başlıklarda `text-wrap: balance`; tekrar eden font blokları birleştirildi.
- Toast bildirimleri tema renklerine hizalandı (kart rengi, kart kenarlığı, ana metin rengi, daha yumuşak gölge).
- Sekme çubuğuna `tablist`/`tab`/`aria-selected` rolleri eklendi (ekran okuyucu ve klavye).
- `MotionConfig reducedMotion="user"`: işletim sisteminde "hareketi azalt" açıksa motion animasyonları da yumuşar.
- Kullanılmayan `tabEnter` keyframe'i silindi.

**Firebase:** `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` ve config dosyaları bayt bayt aynı (karşılaştırıldı).

**Doğrulama notu:** Ağ kapalı olduğundan `npm install` / `npm run build` bu ortamda çalıştırılamadı. Tüm `src` + `server.ts` + `vite.config.ts` için TypeScript sözdizimi taraması ve tanımsız-isim karşılaştırması yapıldı. Yayından önce: `npm install && npm run lint && npm run build`, ardından `/api/health` 200 dönmeli.

## 6. tur: sıfır geç yükleme / sıfır gecikmeli render
- Sekmeler artık açılışta hep birlikte kurulur (`visitedTabs` kaldırıldı); sekme geçişi yalnızca göster/gizle.
- Detaylı Analiz: ağır panel iki kare bekletilmeden ilk çizimde gelir; `HeavyPanelSkeleton`, `useDeferredValue`, `startTransition` silindi.
- İşlem listesi filtreleri ve metrik modu (R/PnL) geçişi anında uygulanır (ertelenmiş değer yok).
- `content-visibility: auto` (`.cv-auto`, `.cv-card`) kaldırıldı; ekran dışı içerik geç çizilmez.
- Kullanılmayan `TabPanel.tsx` silindi.
- Arayüz: sekme çubuğunda ok tuşları / Home / End ile gezinme, yatay çubuk gizli, belirgin odak halkası; kartlarda yumuşak kenarlık vurgusu.
- Doğrulama: ağdan npm paketleri indirilemedi (kayıt sunucusu erişimi reddetti), bu yüzden derleme çalıştırılamadı; yalnızca TypeScript sözdizimi taraması yapıldı. Yayından önce: `npm install && npm run lint && npm run build`.

## 7. tur: gizli sekmeleri dondurma
- `TabPane`: gizli sekmenin alt ağacı son aktif render'da dondurulur; Firestore güncellemeleri ve modal açılışları sırasında gizli 4 sekme boşuna yeniden render edilmez. Sekme açıldığında güncel veriyle çizilir. Animasyonlara dokunulmadı.
- `scroll-padding-top`: yapışkan üst çubuğun altında kalan öğeler için.
- Not: bu tur da derleme çalıştırılamadı (npm kayıt sunucusu erişimi reddedildi).

## 8. tur: yükleme paralelliği
- vite.config.ts: xlsx/jspdf/html2canvas/html-to-image ve react-markdown ailesi ayrı `vendor-export` / `vendor-markdown` parçalarına ayrıldı (hepsi statik import; paralel indirilir, uygulama kodu değişince önbellekten gelir). `reportCompressedSize` kapatıldı (build hızlanır).
- index.html: ilk boyamada beyaz parlama olmaması için koyu arka plan, kullanılmayan `s3.tradingview.com` preconnect'i silindi.
- Derleme bu ortamda yine çalıştırılamadı; ilk build'de parça çıktısına bakın.
