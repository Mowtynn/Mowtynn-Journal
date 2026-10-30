# Değişiklik Özeti

## Hata düzeltmeleri
- firestore.rules: herkes herkesin verisine erişebiliyordu -> sahibine özel kurallar. Yayın: `firebase deploy --only firestore:rules`
- server.ts: /api/proxy-image ve /api/resolve-tv SSRF'e açıktı -> IP/host/yönlendirme doğrulaması, sadece image, 15 MB sınırı; sabit zamanlı parola karşılaştırması; verify-token rate limit; PORT env desteği
- AddTradeForm: düzenlemede tarih/saat değişikliği kaydedilmiyordu
- strategyAnalytics: saat/gün analizi NY saatine çevrildi; saat formatı tekilleştirildi; Monte Carlo gerçek R dağılımından ve sabit tohumla; Asia range kovaları parite medyanına göre
- App.tsx: silinen işlemlerin eski cihazdan geri yüklenmesi engellendi
- exportTrades: TP Target, Premium/Discount, NY saati, bias, spread, çıkış nedeni, potansiyel R, R bazlı PF/beklenti
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

## 9. tur: tablo hizası, animasyon, işlem formu, navigasyon, senkron
**Ana panel işlem geçmişi:** satır ve sütunlar tam ortalandı (`.trade-table`: tüm hücreler yatay + dikey ortalı, eşit dikey boşluk; son sütundaki 6 px'lik kayma giderildi). Satırlardaki `contain: layout` (`cv-auto`) kaldırıldı. Boş durum hücresi 7 yerine 8 sütunu kapsıyor.

**Animasyon hataları:**
- İşlem listesi sayfa değiştirirken `AnimatePresence` (sync) eski ve yeni `<tbody>`'yi aynı anda DOM'da tutuyordu (satırlar çift görünüp zıplıyordu) -> düz `<tbody key=sayfa>` + kısa CSS belirme.
- Tablo sarmalayıcısındaki `transform-gpu` kaldırıldı (bulanık yazı, yapışkan başlık ve katman sorunları).
- Sayfalama metni/butonları kırpılmış sayfa (`effectivePage`) ile çalışıyor.

**İşlem ekleme:** "Çıkış nedeni" projeden tamamen kaldırıldı (form, tip, detay penceresi, Asia Edge Lab kartı, dışa aktarma sütunu, AI Co-Pilot verisi, eksik veri listesi). Eski kayıtlardaki alan bir sonraki düzenlemede buluttan da silinir. Tüm form butonlarına ortak seçme/geçiş animasyonu: renk-kenar-gölge geçişi, basınca küçülme, seçilince tek seferlik "pop + halka" (`data-selected`). İşlem durumu, Setup kalitesi ve Trend yapısı grupları büyütüldü (daha yüksek, geniş dolgu, sütun oranı 5/6/3).

**Navigasyon:** üst çubukta logo solda, butonlar sağda (masaüstünde de); çubuk daha ince/dar. Sekme şeridi içeriğine göre daralır.

**Detaylı Analiz > işlem geçmişi indirme menüsü:** tablonun yapışkan başlığı (z-20) başlık çubuğunun (z-10) üstüne biniyor, menü altta kalıp tıklanamıyordu -> başlık z-30, menü z-60.

**Senkron:** `handleDeleteTrade` ve `handleDeleteTradesByPlatform` silinecek kaydı `setTrades` güncelleyicisinin içinde yakalıyordu; güncelleyici gecikmeli çalışınca `deleteDoc` hiç çağrılmıyor ve silinen işlem bulutta kalıp geri geliyordu. Artık mevcut listeden okunuyor; bulut hatasında kullanıcı bilgilendirilip kayıt geri yükleniyor. İşlem kaydetme bulutta başarısız olursa da uyarı gösteriliyor.

**Doğrulama:** ağ kapalı, `npm install` / `npm run build` çalıştırılamadı. `tsc` ile sözdizimi + kullanılmayan/tanımsız isim taraması yapıldı: yeni hata yok. Yayından önce: `npm install && npm run lint && npm run build`.

## 6. tur: tablo hizası, sertifika animasyonları, akıcılık
- TradeList: sütun başlıklarındaki sıralama oku artık akış dışında (absolute) duruyor; başlık yazısı hücrenin tam ortasında. Tarih hücresinde masaüstünde görünmeyen boş kutu (auto-margin yüzünden içeriği sağa itiyordu) kaldırıldı. Tarih, Parite, Yön, RR, Sonuç, Kâr/Zarar, Platform ve İşlem içerikleri başlıklarla aynı eksende.
- CertificatesView: yeni eklenen kayıt yay (spring) animasyonuyla girer + 2 kez genişleyip sönen renkli halka (Fon: mavi, Payout: yeşil); kayıt hangi sayfaya düştüyse o sayfa otomatik açılır; sayfa değişince kartlar kademeli girer.
- Tıklama animasyonları: Yeni Ekle / Kaydet / Sil butonlarında basma geri bildirimi, görsel alanında tıklanan noktadan dalga efekti, önizleme tıklanan küçük resmin konumundan büyüyerek açılır, sayı kartları değişince yumuşak geçiş yapar.
- Akıcılık: sertifika kartları React.memo + sabit callback'ler; animasyonlar yalnızca transform/opacity. Tüm <img> etiketlerine decoding="async" (base64 ekran görüntüleri ana iş parçacığını bloklamaz). lazy/Suspense kullanılmıyor.
- Firebase kuralları değiştirilmedi. Ağ kapalı olduğundan build çalıştırılamadı; yayından önce: `npm install && npm run lint && npm run build`.

## 7. tur: veri senkronu ve tek hareket sistemi
**Veri**
- Başka cihazda silinen not / günlük / sertifika, bu cihazın snapshot'ında yeniden buluta yazılıp geri geliyordu (işlemlerde bu daha önce düzeltilmişti). Üçü de artık işlemlerle aynı kuralı kullanıyor: yerel kayıtlar yalnızca ilk sunucu snapshot'ında yüklenir, sonrasında bulut tek doğru kaynak. Tek ortak `watchCollection` yardımcısı kullanılıyor (setState içindeki yan etkili setDoc çağrıları kalktı).
- Kaydı buluta yazılırken (görsel yükleme dahil) gelen bir snapshot yeni kaydı listeden silip tekrar getirmesin diye "yazımı süren kayıtlar" korunuyor (işlem, not, günlük, sertifika).
- Sertifika görseli yüklenirken kayıt silinirse artık buluta geri yazılmıyor.
- Kaydet/sil fonksiyonları listelere bağımlı olmaktan çıktı (ref ile güncel listeyi okuyor); kimlikleri sabit, Notlar/Günlük/Sertifikalar ekranları veri değişince gereksiz yeniden çizilmiyor.
- localStorage yazımı tek noktaya indi (useLocalStorageState). Sekme gizlenirken/kapanırken bekleyen yazma anında tamamlanır; tekrarlı JSON.stringify ve setState içindeki yan etkiler kaldırıldı. Hafıza dolarsa tek tip uyarı gösterilir.
- Günlük ekranındaki "Günün İşlemleri" artık Dashboard ve İşlem Listesi ile aynı işlem kümesini (aktif hesap + genel filtreler) kullanıyor; eskiden tüm işlemleri gösterip sayılar uyuşmuyordu. W/L sayacında BE artık "L" sayılmıyor.

**Hareket**
- `src/lib/motion.ts`: tek EASE eğrisi, süre ve spring ayarları. 26 dosyadaki dağınık eğri/yay/süre değerleri buraya bağlandı (0.16/0.26/0.28/0.34 gibi yakın süreler standartlara çekildi, easeInOut/easeOut → EASE).
- index.css: Tailwind `ease-out` sınıfı da aynı eğriyi kullanıyor (CSS ve motion artık aynı hissi veriyor).
- Firebase kuralları değiştirilmedi. Ağ kapalı olduğundan build çalıştırılamadı: `npm install && npm run lint && npm run build`.

## 10. tur: pencere sistemi, navigasyon çubuğu, AI Co-Pilot
**Navigasyon çubuğu pencere açılınca kayboluyordu (kök neden):** scroll kilidi `<html>` ile birlikte `<body>`'ye de `overflow: hidden` veriyordu; `body` ayrıca `overflow-x: hidden` taşıdığı için kilit anında kendi kaydırma kabı oluyor ve `position: sticky` üst çubuk, sayfa aşağı kaydırılmışken görünümden çıkıyordu. Ayrıca modal arka planı (%80 koyu) neredeyse siyah olan çubuğu zaten görünmez yapıyordu.
- `useBodyScrollLock`: yalnızca `<html>` kilitlenir. `index.css`: `body { overflow-x: clip }` (desteklemeyen tarayıcıda `hidden` yedeği).
- Tüm pencere katmanları `.modal-layer` ile navigasyon çubuğunun ALTINDAN başlar (`--nav-h`, App.tsx'te ResizeObserver ile ölçülür); çubuk açık pencerede de net ve yerinde görünür. Tek karartma rengi: `.modal-dim`. Ortalanmış pencereler çubuğun altındaki alana sığacak şekilde sınırlandı.

**Tek açılış / kapanış animasyonu:** `lib/motion.ts` → `MODAL_BACKDROP`, `MODAL_PANEL`, `POPOVER`, `PANE`. 21 arka plan ve 24 panel, 5 dışa aktarma/hesap menüsü, tarih-saat seçici açılır penceresi aynı hareketi kullanır (açılış 0.28 s expo-out, kapanış 0.18 s, aynı yoldan geri).
- **Kapanış animasyonu görünmeyen pencereler (kök neden):** App.tsx'te `{isPlatformMenuOpen && <DefinitionsManagerModal/>}`, `{isAuthModalOpen && <AuthModal/>}`, `{isCopilotOpen && <AICoPilotModal/>}` kalıbı bileşeni anında söküyordu, çıkış animasyonu hiç oynamıyordu. Yeni `useExitMount` kancası bileşeni çıkış bitene kadar bağlı tutar.
- Tarih-saat seçici açılır penceresine (iki sürüm) açılış/kapanış animasyonu eklendi (önceden anında kapanıyordu).
- Denetim penceresi (AuditReport) de aynı sisteme bağlandı; kalıcı `will-change` sınıfları ve modal arka planındaki `backdrop-blur` kaldırıldı.

**AI Co-Pilot yenilendi:**
- Proje tasarım diline uyumlu başlık/panel (`bg-bg-modal`, `border-border-card`, `shadow-modal`); başlıkta aktif filtreye göre "N / M işlem analiz ediliyor" bilgisi.
- Sekme şeridinde kayan gösterge (spring), sekme içerik geçişi `PANE` ile (önceden 0.12 s `linear`).
- Yeni mesajlar yay animasyonuyla girer (eskiler tekrar animasyonlanmaz), "Analiz ediliyor" için üç noktalı yazıyor göstergesi, yazı alanı içeriğe göre büyür.
- Otomatik kaydırma: 4 ayrı zamanlayıcı yerine tek `scrollTo` (sekme açılışında anında, yeni mesajda yumuşak).
- Tanımsız olan `copilot-scrollbar` / `hide-scrollbar` sınıfları tanımlandı.
- Hazır analizler güncel projeye göre: "Silver Bullet" yerine "Asia Range" (performans özeti + girdi analizi + edge önerileri) ve "Haftalık Oyun Planı" eklendi; kaldırılan Spread özelliğine yapılan atıf silindi.
- Yüzen AI butonu pencere açılınca nazikçe gizlenir, kapanınca geri gelir (hover/tap geri bildirimi).

**Doğrulama notu:** ağ kapalı olduğundan `npm install` / `npm run build` çalıştırılamadı. Tüm `src` için TypeScript sözdizimi taraması (JSX etiket dengesi dahil) ve eksik import taraması yapıldı: hata yok. Yayından önce: `npm install && npm run lint && npm run build`.

## 11. tur: News Day, Strateji, Asia Range FVG, güvenlik, yedekleme
- İşlem formu: News Day/Bank Holiday (Var/Yok, varsayılan Yok), altında Strateji ve Asia Range FVG. Tüm form başlıkları Tanımlamalar > Form Başlıkları'ndan, tüm listeler kendi sekmelerinden düzenlenir.
- Yeni alanlar: Trade.newsDay (boolean), strategy, asiaRangeFvg. Asia Edge Lab, Strateji Laboratuvarı, Excel, detay penceresi, AI Co-Pilot ve yedeğe dahil.
- Tanımlamalar: yeniden adlandırma işlemlerdeki değeri de günceller; başlık anahtarı hatası (Liquidity Sweep) düzeltildi.
- Yedek: içe aktarma eksik alanları (premiumDiscount, accountCategory, newsDay...) silmiyor; başarısız yükleme/sıfırlamada yanlış "başarılı" bildirimi kaldırıldı; sıfırlama tüm yerel anahtarları temizler.
- Güvenlik: site jetonu artık süreli HMAC imzalı (eski sha256(parola) jetonu geçersiz, bir kez yeniden giriş gerekir); parola limiti yalnızca başarısız denemeleri sayar, jeton doğrulama ayrı limit; /api/resolve-tv ve /api/proxy-image jeton ister; ağ hatasında oturum düşmez. İsteğe bağlı TOKEN_SECRET.
- trading_definitions_revision artık kullanıcı listelerini sıfırlamıyor.
- Derleme bu ortamda çalıştırılamadı (ağ kapalı): `npm install && npm run lint && npm run build`.

## 12. tur: form sadeleştirme ve akıcılık
- İşlem formu: Strateji/Asia FVG altındaki çizgi kaldırıldı; buton, yazı ve boşluklar bir kademe küçültüldü (pencere içi kaydırma gerekmez). Asia Range FVG varsayılanı Var / Yok (eski varsayılanı değiştirmemiş kullanıcılar otomatik taşınır).
- Performans: ana sayfa panelleri `useMemo` ile yalıtıldı; pencere aç/kapa artık dashboard, tablo ve grafikleri yeniden çizmez.
- Performans: `useAfterPaint` ile filtre ve tanımlama pencerelerindeki ağır hesaplar açılış animasyonunun ilk karesinden sonraya ertelendi.

## 13. tur: animasyon bütünlüğü ve senkron
- Pencere taraması: 19 bileşendeki tüm pencereler AnimatePresence + MODAL_* ile açılıp kapanıyor. Eksik 3 yer tamamlandı: Rapor "görüntü hazırlanıyor" katmanı, Verileri Sıfırla onay kutusu, Ayarlar menüsü (ortak POPOVER hareketi).
- Senkron: bulut ayar yankıları (kendi yazdığımız değişiklik) aynıysa state güncellenmez; kapatma fonksiyonları kararlı (useCallback), pencereler gereksiz yeniden çizilmez.

## 14. tur: AI Co-Pilot çökmesi
- AICoPilotModal: `inputPrompt` durumu, onu kullanan useEffect'ten SONRA tanımlıydı (TDZ). Pencere açılırken "Cannot access 'b' before initialization" hatası veriyordu. Tanım effect'ten önceye alındı.
- Tüm proje için tanımlanmadan kullanım taraması yapıldı (hook bağımlılıkları, useMemo/useState gövdeleri): başka örnek bulunmadı.

## 15. tur: açılış çökmesi (React #31)
- App.tsx: 12. turda ana paneller `mainPanes` değişkenine alınırken üçlü ifadenin içinde `{mainPanes}` yazılmıştı. JavaScript bunu `{ mainPanes: ... }` nesnesi olarak okudu; React nesne çizemediği için şifreden hemen sonra uygulama çöktü. `mainPanes` doğrudan döndürülecek şekilde düzeltildi.
- Aynı kalıp (koşullu dalda tek başına `{ifade}`) tüm .tsx dosyalarında tarandı; başka örnek yok.

## 16. tur: gerçek derleme ve tarayıcı testiyle yenileme
Bu tur, proje kullanıcının bilgisayarında `npm install`, `npm run lint`, `npm run build` ve tarayıcıda uçtan uca test edilerek yapıldı.

**Hatalar**
- Sunucu `.env` / `.env.local` dosyasını okumuyordu: yerelde şifre hiç tanımlanmıyor, giriş "parola yapılandırılmamış" diyordu. Artık yükleniyor (Render paneli değişkenlerini ezmez).
- Yerelde canlı yenileme (HMR) sabit 443 portuna bağlanmaya çalışıp her açılışta düşüyordu. Port artık yalnızca `HMR_CLIENT_PORT` verilirse değişir.
- `npm run lint` 4 tip hatası veriyordu (kullanılmayan değişken, sertifika sayaç tipi, Form Başlıkları başlık anahtarı). Lint temiz.
- Şifre ekranı: hata yazısı alttaki butonların üstüne biniyordu; Enter bazı ortamlarda formu göndermiyordu.
- İşlem formu: kısa ekranlarda kaydet/iptal butonları pencerenin dışına taşıyordu. Form açıkken bulut senkronu platform listesini güncellerse girilen her şey sıfırlanıyordu.
- Türkçe tarayıcıda İngilizce terimler "MİTİGATİON", "EQUİLİBRİUM" gibi yazılıyordu (CSS büyük harf + tr dili). Değerler artık İngilizce kuralıyla, Türkçe başlıklar Türkçe kuralıyla büyütülüyor (`smartUpper`).
- Tarih: günlük/haftalık istatistikler UTC'ye göre gruplanıyordu; Türkiye'de 00:00–03:00 arası işlemler takvimde bir gün, Detaylı Analiz'de bir önceki gün görünüyordu. Hepsi yerel güne hizalandı (`localDateKey`). Yedek ve dışa aktarma dosya adlarındaki tarih de yerel.

**İşlem ekleme akışı**
- Kaydedilmemiş değişiklik koruması: Esc, X, İptal veya arka plan tıklaması önce onay çubuğu gösterir ("Düzenlemeye dön" / "Kaydetmeden çık").
- Ctrl/Cmd + Enter her alandan kaydeder; ipucu alt çubukta.
- Yeni işlemde imleç pariteye gelir (yalnızca fare/klavye cihazlarında). Parite listesi ok tuşları + Enter ile seçilir.
- "Son kurulumu kopyala": son işlemin parite, platform ve strateji seçimlerini uygular (sonuç, pip, not ve News Day kopyalanmaz).
- Parite boşsa alan kırmızı vurgulanır ve odaklanır.

**Tasarım**
- 1366×768 ekranda form kaydırmasız sığıyor: grafik linki notlar sütununa taşındı, MAE/MFE/Asia Range tek satır, Setup Kalitesi + Trend Yapısı yan yana, orta sütun genişletildi, teknik matris yeniden eşleştirildi.
- Dashboard kartları 640 piksel üstünde iki sütun.
- Onay çubuğu ile aksiyon butonları beklemesiz çapraz geçiş yapar.
- 102 ikon butonuna erişilebilir ad ve üzerine gelince ipucu eklendi.

**Test edilenler (tarayıcıda):** şifre (yanlış/doğru, Enter, Beni Hatırla), işlem ekle/düzenle/kaydet, tüm sekmeler, 15 strateji alt sekmesi, Tanımlamalar'ın 18 sekmesi, yeniden adlandırmanın işlemlere yansıması, AI Co-Pilot ve sekmeleri, filtre, ayarlar ve hesap menüleri, işlem detayı, not/günlük/sertifika, yedek al → sıfırla → yedekten yükle döngüsü. Konsol hatası: 0.

## Tur: sadeleştirme + prop hesapları
- Ölü kod temizliği: Liquidity Sweep / Konsept alanları ve listeleri, eski `entry`/`htfBias`/`spreadPips` alanları (eski kayıtlar açılışta normalize edilir), `/api/tts`, `/api/stock-prices`, `/api/proxy-image`, kullanılmayan export'lar (FUNDED/CHALLENGE/DEMO_PLATFORMS, isFundedPlatform, getAuthHeaders, calculateExpectancy, DUR), eski localStorage anahtarları.
- News Day: varsayılan seçimsiz; tam kayıtta Var/Yok zorunlu (hızlı kayıtta değil).
- Prop hesapları (Ayarlar > Prop Hesaplarım): challenge/funded, bakiye, günlük/max DD (statik/trailing), kâr hedefi, risk %, başlangıç tarihi. Ana panelde özet şerit. Patladı/Geçti/Arşivle, "aynı ayarlarla yeni hesap". Yedek + bulut senkronu.
- İşlem formu: RİSK ($) alanı; R = |PnL| ÷ risk otomatik (R elle yazılırsa elle değer korunur). Hesap seçilince risk = bakiye × risk %.
- Hızlı kayıt: "Son kurulumu kopyala"nın solunda. Yalnızca temel bilgiler + sonuç; `quickEntry` işaretiyle kaydedilir, tam formla kaydedilince kalkar.
- Sistem Bütünlüğü: hatalı + eksik kayıt listesi, "Tamamla" ile işlemi düzenlemede açar; eksik yoksa onay mesajı.
- AI Co-Pilot: kişilikler, sohbet, görsel, sesli okuma, Sağlık & Disiplin sekmesi kaldırıldı. Yalnızca Hızlı Analizler (14 şablon, alanlara uygun) + Kaydedilenler. Sunucu istemi dengeli, örneklem büyüklüğü zorunlu, uydurma skor/korelasyon yok.
- Metrik düzeltmeleri: beklenti = net R ÷ işlem (BE dahil) ana panel ve Derin Analiz'de; Derin Analiz nakit toplamı BE PnL'ini atlıyordu; seri (runs) testi BE'yi kayıp sayıyordu; ısı haritası BE'yi atlıyor ve yerel günü kullanıyordu (NY günü + BE dahil); AdvancedMetrics kombinasyonları çift sayıyordu; Strateji Optimizer'dan konfluans/skor/sahte öneri kartları kaldırıldı, içgörüler n ≥ 10 ister.
- Raporlar: Denetim raporunda uydurma model/"tick stream" metinleri ve rastgele checksum kaldırıldı, PDF artık çok sayfalı; yazdırma raporunda rastgele "güvenlik kodu" yerine tarih/işlem sayısı; metrik/işlem geçmişi pencerelerinde sabit yükseklikler mobilde taşmayacak şekilde düzeltildi.
- Doğrulama: `npm run lint` temiz, `npm run build` başarılı; tarayıcıda hesap oluşturma, hızlı kayıt, otomatik R, News Day zorunluluğu, Tamamla akışı, arşive alma ve Co-Pilot test edildi.

## Parça 1/4: Temizlik
- AI Co-Pilot tamamen kaldırıldı: pencere, açma düğmesi, kayıtlı analizler, sesle işlem/not/günlük ekleme, mikrofon izni penceresi. Sunucudan /api/copilot ve /api/voice-to-* uçları, Gemini istemcisi ve anahtar okuma kodu silindi. @google/genai, react-markdown ve @tailwindcss/typography paketleri kaldırıldı; GEMINI_* ortam değişkenlerine artık gerek yok (render.yaml, .env.example, README güncellendi).
- React tip paketleri (@types/react, @types/react-dom) package.json'a açıkça eklendi (önceden kaldırılan paket üzerinden dolaylı geliyordu).
- Sertifikalar sekmesi ve verisi kaldırıldı (bileşen, state, bulut senkronu, yedek/içe aktarma, tip). Firestore kuralında eski sertifika kayıtları yalnızca okunup silinebilir.
- "Verileri sıfırla": buluttaki işlemler, notlar, günlükler, eski sertifikalar, ayar belgesi (tanımlamalar, prop hesapları) ve Firebase Storage'daki tüm görseller silinir; tarayıcıda site şifresi oturumu ve Firebase girişi dışındaki her şey temizlenir; tanımlamalar varsayılana döner. Profil adı ve giriş korunur. Bulutta bir adım başarısız olursa yerel veriye dokunulmaz.
- Açılışta kaldırılan özelliklerin eski localStorage anahtarları temizlenir.

## Parça 2/4: Prop sekmesi
- "Prop Hesaplarım" ayarlar menüsünden kalktı; Sertifikalar'ın eski yerinde "Prop" ana sekmesi. Ana paneldeki dolar gösteren hesap şeridi kaldırıldı (dolar yalnızca Prop sekmesinde).
- Günlük drawdown takibi tamamen kaldırıldı.
- Hesap ekleme: ad, firma, boyut, max DD tipi (statik/trailing), aşama sayısı (0–3) ve her aşamanın hedef/max DD'si, funded max DD, 1R risk %, challenge ücreti (yalnızca zincirin ilk hesabında), başlangıç tarihi.
- Aşama zinciri: "Phase N'i başlat" / "Funded'a geç" aynı ayarlarla yeni hesap açar (bakiye sıfırdan, kural o aşamadan), önceki hesap "Geçti" olur. Kartta yolculuk: ücret → aşamalar → funded → payout'lar → patlama. Patladı / Arşivle / Arşivden geri al / Aynı kurallarla yeni / Sil.
- Funded hesaba funded sertifikası ve payout (fotoğraf + net tutar + tarih) eklenir; sertifika hesap durumunu değiştirmez. Hesaplara not ve fotoğraf eklenebilir.
- Fotoğraflar uzun kenar 1800 px WebP olarak sıkıştırılır; girişliyken Storage'a (users/{uid}/prop) yüklenir, girişsizken yerelde kalır ve giriş yapılınca yüklenir. Silinen fotoğraf Storage'dan da silinir. Yedekte fotoğraflar data URL olarak gömülür, içe aktarmada geri gelir (girişliyse Storage'a yüklenir).
- Bakiye = boyut + işlemlerin dolar etkisi + bakiye düzeltmeleri. "Gerçek bakiyeyi gir" farkı tek düzeltme kaydı olarak ekler (R istatistiğine girmez).
- Kartta max DD'ye ve hedefe kalan $ ve R olarak; funded kartta payout toplamı ve sayısı.
- Bilanço: ödenen ücret, toplam payout, net sonuç, geçme oranı (funded'a ulaşan ÷ sonuçlanan zincir).
- Firestore'a yazarken dizilerdeki tanımsız alanlar da temizleniyor (önceden prop hesapları buluta yazılırken hata verebilirdi).
- Önceki sürümün prop kayıtları yeni yapıya çevrilir (ad korunur).
- Yedeğe fotoğraf gömmek için Storage CORS ayarı: storage.cors.json + README'deki gsutil komutu.

## Parça 3/4: R tabanlı model
- Veri modeli: işlemde `pnl` yok (normalizeTrade eski kayıtlardan da düşürür). Yeni alanlar `riskPct` (başlangıç bakiyesinin %'si) ve `accountStage` (işlemin alındığı aşama; 0 = Funded). `riskAmount` = bakiye × % / 100, yalnızca Prop bakiyesi için. BE her zaman 0R.
- İşlem formu: platform açılır menüsü yerine hesap çipleri (aktif prop hesapları + "Hesapsız"). Varsayılan yok; seçilmeden kayıt yapılmaz. Hesap seçiliyken risk satırı: 0.25 / 0.50 / 0.75 / 1 / % (elle). Varsayılan yok; seçilmeden kayıt yapılmaz; yanında $ karşılığı salt okunur. PnL ve Risk ($) alanları kaldırıldı; sonuç yalnızca R. Hesapsızda risk satırı görünmez. Düzenlemede işlemin kendi hesabı (arşivde olsa bile) seçili gelir; aynı hesapta kaldıysa işlemin aşaması korunur. "Son kurulumu kopyala" hesabı kopyalar, riski kopyalamaz.
- Proje geneli: R/$ düğmesi ve MetricContext kaldırıldı; ana panel, takvim, Detaylı Analiz (real/cash kopyaları), Gelişmiş Metrikler, ısı haritası, raporlar, işlem geçmişi/detay ve dışa aktarım yalnızca R. Dışa aktarımda PnL sütunu yerine Risk (%), Hesap, Hesap Türü, Aşama.
- Hesap Türü filtresi: Challenge / Funded / Hesapsız, işlemin hesap tipinden (accountCategory / accountId + aşama). Analiz filtrelerine "Aşama: Phase 1 / Phase 2 (/ 3…) / Funded" eklendi; "Platform" filtresi "Hesap" oldu.
- Tanımlamalar: platform listesi, platform kategorileri, platforma göre işlem silme ve ilgili içe/dışa aktarım kaldırıldı. Eski "Platform", "R:R Oranı", "Finansal Sonuç" başlıkları otomatik "Hesap", "Sonuç R", "Sonuç" olur. Eski localStorage anahtarları (trading_platforms_list, tj_platform_categories, last_used_trade_platform) açılışta temizlenir.
- Sistem Bütünlüğü: eksik kayıt kontrolüne "Hesap" (prop hesabı ya da açıkça Hesapsız seçilmemiş) ve "Risk %" (hesaplı işlemde) eklendi; PnL işaret kontrolleri kaldırıldı. Yedekten içe aktarma pnl okumaz, riskPct/accountStage'i taşır, BE'yi 0R yapar.
- Silinecek dosyalar (içleri boşaltıldı): src/context/MetricContext.tsx, src/components/ValueTransition.tsx

## Parça 4/4: Performans, uçtan uca test, temizlik

### İşlem formu performansı
- Form ilk değerlerini doğrudan işlemden (ya da boş) kurar; açılıştaki "sıfırla/yükle" efekti ve "kaydedilmemiş değişiklik" temeli için yapılan ek çizim kalktı (temel durum ilk çizimde alınır). App'te form `key` ile her açılışta temiz bağlanır.
- Form dört memo bileşene bölündü: Temel bilgiler (parite, yön, hesap, risk, tarih), Sonuç (durum, pipler, R), Kurulum çipleri, Notlar. Bir alana yazmak yalnızca o kartı yeniden çizer.
- Kurulum çipleri ve notlar sütunu açılış animasyonu bittikten sonra (≈300 ms, kesintiye uğratılabilir güncellemeyle) çizilir; o ana kadar aynı boyutta boş kart durur, düzen zıplamaz. Hızlı kayıtta bu sütunlar hiç çizilmez.
- Büyük harf dönüşümleri önbellekte: `smartUpper` genel önbellek, form başlıkları başlık nesnesi değişene kadar bir kez hesaplanır.
- "0R → BE" ve parite listesi imleci artık efekt yerine olay anında ayarlanır (fazladan çizim yok); parite listesi dış tıklama dinleyicisi yalnızca liste açıkken bağlı.

Ölçüm (geliştirme derlemesi; React'in kendi çizim süresi, aynı tarayıcı, her satır 7–8 tekrar). "Sonra" iki tur: test verisi büyüdükten sonraki ikinci turda (5 → 11 işlem, 1 → 3 hesap) değerler biraz yüksek, aralık olarak verildi.

| | Önce | Sonra |
|---|---|---|
| Form açılışı: çizimler | 3–5 dolu çizim (≈30 + ≈23 + ≈23 ms …) | 2 dolu çizim (ilk kare + animasyondan sonra ağır sütunlar) + 2 boş (0 ms) |
| Form açılışı: toplam çizim süresi | 75–110 ms | 20–33 ms |
| İlk kare (açılış animasyonuyla yarışan iş) | 30–38 ms | 12–18 ms |
| Parite yazarken, tuş başı | 22–25 ms | 4–7 ms |
| R yazarken, tuş başı | ≈21.5 ms | 3.5–6 ms |
| Not yazarken, tuş başı | 20–21 ms | 3–4 ms |
| Kurulum çipine tıklama | 20–21 ms | 7–10 ms |

### Uçtan uca test (tarayıcıda)
Hesap ekle (2 aşamalı, $10.000, ücret $100) → Phase 1'de +3R / −1R (risk %1 = $100; bakiye $10.200) → Phase 2'yi başlat (bakiye yeni aşamada $10.000) → +2R (%0.5) → Funded'a geç → +4R (%1; bakiye $10.400) → Payout $300 + fotoğraf (ücret $100, net +$200) → gerçek bakiye $10.050 (−$350 düzeltme kaydı) → Patladı (arşive düştü) → arşivden geri al → arşivle → aynı kurallarla yeni hesap. Hesapsız işlem (risk satırı yok). Hesap Türü (Challenge 3 / Funded 5 / Hesapsız 2 işlem) ve Aşama filtresi (Phase 2 → 1 işlem). Yedek indir (fotoğraf data URL olarak içinde, `pnl` yok) → Verileri sıfırla (0 işlem, hesaplar boş) → yedekten geri yükle (10 işlem, 4 hesap, payout fotoğrafı geri geldi). Bulut (Firebase giriş) bu testte kapalıydı; Storage yolu girişli kullanımda geçerli.

Testte bulunup düzeltilenler:
- İşlem formundaki hesap çipinde aşama iki kez yazıyordu ("E2E 10K · Funded Funded"); çipte artık zincir adı + aşama rozeti var. İşleme yazılan hesap adı değişmedi.
- Detaylı Analiz ve Strateji parite tablolarında BE işlemler L sayılıyordu ("0W/1L"); artık W / L / BE ayrı.
- Prop "Yeni hesap" açıklaması eski "platform" anlatımını kullanıyordu; güncellendi.

### Kullanılmayan kod ve dosya temizliği
- Kaldırıldı: `findActiveAccountByName` (platform döneminden kalma), App'teki `calculateComprehensiveStats` dışa aktarımı (Vite hızlı yenilemeyi bozuyordu), index.css'te hiçbir yerde kullanılmayan ~30 sınıf ve 3 animasyon (Co-Pilot, eski sertifika, eski kart/buton/rozet sistemi, platform menüsü oku; CSS 164.5 → 152.2 kB), `.env.example`'daki kullanılmayan `APP_URL`.
- Kök dizinde silinenler: `firebase-blueprint.json`, `metadata.json`, `assets/.aistudio` (AI Studio kalıntıları), `eslint.config.js` (eslint kurulu değil; denetim `tsc` ile).
- Bilgisayarındaki kopyada silinmesi gereken boş dosyalar (zip'te yoklar): `src/components/AICoPilotModal.tsx`, `CertificatesView.tsx`, `MicrophonePermissionModal.tsx`, `PropAccountsModal.tsx`, `PropAccountsPanel.tsx`, `ValueTransition.tsx`, `VoiceToJournalButton.tsx`, `VoiceToNoteButton.tsx`, `VoiceToTradeButton.tsx`, `src/context/` klasörü; kökte `firebase-blueprint.json`, `metadata.json`, `assets/`, `eslint.config.js`.
- README yayın adımları güncellendi.

### Ek: risk satırı ve sabit pencere boyu
- Risk satırı artık her zaman görünür; Hesapsız seçiliyken (ya da henüz hesap seçilmemişken) çipler soluk ve seçilemez, $ alanı "$ —".
- Hesap ↔ Hesapsız geçişinde pencere boyu değişmiyor: risk satırı hep yerinde, elle yüzde alanının yeri hep ayrılı, seçili çipin onay işareti için yer önceden ayrılı (çip genişleyip alt satıra kaymıyor), hata çerçevesi iç boşluk eklemiyor. Ölçüm: geçişler boyunca kart yüksekliği masaüstünde 385 px, telefonda 377 px sabit.

## Hesaplama testleri ve açılış hızı

### Otomatik testler (`npm test`, 47 test)
- Hesaplamalar saf modüllere ayrıldı (davranış değişmedi): `src/lib/stats.ts` (ana panel istatistikleri), `src/lib/tradeFilters.ts` (üst filtreler: Hesap Türü, Aşama, Hesap, tarih, parite, seans, pip aralıkları), `src/lib/integrity.ts` (Sistem Bütünlüğü kuralları). App ve Yedekleme ekranı bunları kullanıyor; işlem formundaki risk $ karşılığı artık Prop kartıyla aynı fonksiyondan (`defaultRiskAmount`).
- `tests/` altında: istatistikler (WIN/LOSS/BE sayımı, BE dahil kazanma oranı, Net R, ortalama kazanç/kayıp, profit factor ve sınırları, beklenti, 7/30 gün pencereleri, en iyi/kötü parite, boş liste), prop hesapları (1R, işlem $ etkisi, statik ve trailing DD, geçmiş aşım, bakiye düzeltmesi, hedef, Funded kuralı, eski işlemlerin hesaba bağlanması, zincir sonuçları, bilanço ve geçme oranı, yedekten gelen hesap doğrulaması), filtreler, veri modeli (pnl'in düşmesi, BE=0R, eski alan göçü), başlık göçleri ve büyük harf, bütünlük kuralları.
- `npm run lint` artık tip denetiminden sonra testleri de çalıştırıyor (baslat.bat'taki kontrol de dahil). Ek paket gerekmez: Node'un kendi test aracı + projede zaten olan `tsx`.
- Testlerin gerçekten hata yakaladığı denendi: kazanma oranından BE'yi çıkarmak, trailing tabanın başlangıç bakiyesini aşmasına izin vermek ve aşama filtresini gevşetmek gibi bilinçli bozmaların her biri testi kırdı.
- Testlerin bulduğu gerçek hata: bozuk/sonsuz R değeri (ör. içe aktarılan `Infinity`) 0'a çevrilmiyordu ve istatistikleri ∞ yapabiliyordu; düzeltildi.

### Açılış hızı: dışa aktarma kütüphaneleri isteğe bağlı
- Excel (xlsx), PDF (jspdf + html2canvas) ve görsel (html-to-image) kütüphaneleri artık yalnızca ilgili indirme butonuna basılınca yükleniyor. Excel aktarımı sırasında "Excel hazırlanıyor…" bildirimi görünüyor; bağlantı yoksa anlaşılır bir hata çıkıyor.
- Açılışta indirilen JavaScript: ≈3.06 MB → ≈1.98 MB (−1.08 MB, yaklaşık %35). Önceden açılışta yüklenen tek parça "vendor-export" (1.08 MB) yerine dört ayrı, isteğe bağlı parça var: xlsx 429 kB, jspdf 390 kB, html2canvas 202 kB, html-to-image 14 kB.
- PWA önbelleği bu parçaları ilk ziyaretten sonra arka planda sakladığı için sonraki indirmeler beklemesiz; çevrimdışıyken de çalışır.
- Tarayıcıda denendi: açılışta hiçbiri yüklenmiyor; Excel (10 işlem), işlem görseli (PNG) ve denetim raporu (PDF, 233 kB) indirildi.
- İkon-only indirme butonlarına erişilebilir ad ve ipucu eklendi.

### Yayın notu
- Node 20'nin desteği bitti: `render.yaml` Node 22'ye, `engines` ">=22"ye alındı.

## Taslak B görünümü (deneme)
- Ayarlar menüsünde "Yeni görünüm (taslak)" anahtarı: Taslak B'nin renk paleti (daha parlak, okunur metin; yumuşak mavi vurgu; yeni kazanç/kayıp/risk tonları) ve daha yuvarlak köşeler tüm projeye uygulanır. Düzen ve işlevler değişmez; anahtar kapatılınca klasik görünüme anında döner. Tercih tarayıcıda saklanır ve ilk çizimden önce uygulanır.
- Pencerelerin yapısal yeniden tasarımı (işlem ekleme sekmeleri, detayda dikey fiyat yolu, gün gruplu geçmiş, metrik kadranı) beğenilirse ayrı adımda uygulanacak.

## Taslak tasarımdan geri dönüş
- Proje, Taslak A/B tasarım çalışmasına başlamadan önceki klasik görünüme döndürüldü (işlem formu, pencereler, ana panel, Prop ve analiz ekranları eski hâlinde).
- Ayarlar'daki "Yeni görünüm (taslak)" anahtarı ve ona ait kod da kaldırıldı; eski `tj_ui_theme` kaydı açılışta temizlenir.
- Tasarım öncesi yapılan işler korunuyor: hesapsızda kilitli risk satırı, 47 test, dışa aktarma kütüphanelerinin geç yüklenmesi.

## Yeni verilerin kullanımı + akıcılık (parçalara bölme)
Klasik tasarım korunarak, son eklenen alanlar (risk %, hesap bağı, strateji, News day, Premium/Discount, TP target, Asia range FVG, hızlı kayıt) gerçekten işe yarayacakları yerlere taşındı.

### Prop kartında canlı R özeti
- Her aktif hesap kartında: kazanma oranı, işlem başı beklenti (R), max drawdown sınırına kalan R ve "kaç kayıp", hedefe kalan R ve "kaç kazanç".
- Geçme olasılığı: senin R dağılımınla 2000 Monte Carlo denemesi; hesabın kendi işlemi 20'yi geçince yalnızca o hesabın, değilse tüm geçmişinin R'leri kullanılır (en az 10 işlem). Statik/trailing DD kuralı birebir uygulanır. Funded hesapta "sonraki 20 işlemde ayakta kalma" olasılığı gösterilir.
- 1R, hesaptaki işlemlerin medyan risk tutarından alınır; risk girilmemişse hesabın 1R'si. Hesaplama `src/lib/propInsights.ts` (6 test).

### Kurulum karnesi (Strateji laboratuvarı → "Kurulum Karnesi" sekmesi)
- İşlemler seçtiğin en fazla 3 alanın birleşimine göre kurulumlara ayrılır (varsayılan: Strateji + Seans + Giriş modeli; ayrıca P/D, Trend, Entry TF, HTF, TP target, Asia FVG, News day, Yön, Parite).
- Her kurulum: işlem sayısı, kazanma oranı, beklenti ve %95 güven aralığı, net R, PF, hüküm (Kanıtlı edge / Umut verici / Zayıf / Sızıntı / Az örneklem). Üstte "Önceliklendir" ve "Azalt ya da bırak" özetleri.
- Sıralama küçük örneklemi cezalandırır (1 işlemlik +3R, 12 işlemlik istikrarlı kurulumu geçemez). Hesaplama `src/lib/setupScorecard.ts` (4 test).

### Yeni alanlar doğru yerlerde
- Filtre menüsüne 7 yeni satır: Strateji, Premium/Discount, TP target, Asia range FVG, News day (Var/Yok), işlem başı risk %, "yalnızca tamamlanmamış hızlı kayıtlar". Seçenekler Tanımlamalar + işlemlerde görülen değerlerden gelir; rozet sayısı ve Temizle bunları da kapsar. Seçim kalıcı (filtre deposu v4, eski kayıt güvenle taşınır). 1 yeni test.
- Filtre menüsü artık işlemleri de görüyor: Hesap, Parite, Seans vb. listelerde işlemlerde geçen ama tanımlarda olmayan değerler de çıkıyor (önceden işlemler bu pencereye hiç verilmiyordu).
- İşlem detayı: Premium/Discount satırı; hızlı kayıtlı işlemde eksik alanları sayan sarı şerit ve "Tamamla" butonu.
- İşlem listesi: hızlı kayıtlı işlemlerde "Hızlı" rozeti.
- Pre-Trade kontrol: Strateji ve News day ölçütleri eklendi; kalite seçenekleri işlemlerden de alınıyor.

### Akıcılık: geç yükleme ve bölünmüş dosyalar
- Sekmeler (Derin Analiz, Günlük, Prop, Notlar) ve pencereler (işlem formu, işlem detayı, filtre, tanımlamalar, giriş, yedekleme) ayrı parçalara bölündü; ilk açılışta yalnızca ana panel indirilir. Kalanlar tarayıcı boştayken sırayla arka planda indirilir, bu yüzden açılırken bekleme olmaz.
- Önceden açılışta beş sekmenin hepsi birden çiziliyordu; artık bir sekme ilk açıldığında çizilir, sonra bellekte kalır.
- Derin Analiz'de alttaki Gelişmiş metrikler ve Strateji laboratuvarı, ekrana yaklaşınca (ya da kısa süre sonra boşta) çizilir; sekme anında açılır.
- Strateji laboratuvarındaki Kıyaslama ve Pre-Trade kontrol sekmeleri kendi dosyalarına taşındı (`src/components/strategy/`); bir seçim değiştirince 1700 satırlık laboratuvarın tamamı yerine yalnızca o sekme yeniden çizilir. StrategyOptimizerHub 1712 → ~1385 satır.
- Ana JavaScript parçası: 803 kB → 249 kB (−%69). Yeni parçalar: DeepAnalysis 96 kB, StrategyOptimizerHub 116 kB, AdvancedMetrics 80 kB, JournalView 91 kB, AddTradeForm 51 kB, PropView 36 kB, filtre 30 kB, detay 19 kB …
- Testler: 47 → 58.

### Düzeltme: işlem formu geç doluyordu + yeni yükleniyor işareti
- İşlem ekleme penceresi: kurulum çipleri ve notlar sütunları açılış animasyonunun bitmesini (~300 ms) bekliyordu; artık pencerenin ilk karesinden hemen sonra çiziliyor.
- Geç yüklenen parçalar önceden indirilmiş olsa bile ilk açılışta bir kez "yükleniyor"a düşüyordu (React.lazy davranışı). `lazyWithPreload` artık indirilmiş parçayı beklemeden doğrudan çiziyor. İşlem formu ve işlem detayı açılıştan hemen sonra indiriliyor; kalanlar boşta.
- Sekmeler: ilk açılışta önce yükleniyor işareti çizilir (tıklamaya anında tepki), ağır içerik bir sonraki karede kesintiye uğratılabilir şekilde kurulur ve yumuşakça belirir.
- Yeni yükleniyor işareti (sekme, Derin Analiz'in alt bölümleri, işlem formu): koyu kart üzerinde mavi dönen halka + "Yükleniyor..." rozeti ve nefes alan çubuklar. ~120 ms gecikmeyle belirir; hızlı açılışlarda hiç görünmez, yanıp sönme olmaz. Hareket azaltma tercihine uyar.

### İşlem ekleme penceresi: tıklar tıklamaz, eksiksiz
- Yeni işlem formu artık açılıştan kısa süre sonra arka planda, görünmeden kurulup hazır bekliyor. "İşlem Ekle"ye basınca yalnızca görünür oluyor: React'ın o anda yapacağı bir kurulum işi yok, tüm sütunlar (temel bilgiler, sonuç, kurulum çipleri, notlar) ilk karede tam.
- Açılış/kapanış CSS geçişiyle (aynı hareket dili: açılış 280 ms expo-out, kapanış 180 ms). Kapalıyken pencere çizilmez, tıklanmaz ve odak almaz (`visibility: hidden` + `inert`); kaydırma kilidi, Esc koruması ve otomatik odak yalnızca açıkken çalışır.
- Form kapanınca bir sonraki için temiz bir form yine arka planda hazırlanır. Kapanıştan hemen sonra yeniden açılırsa eski içerik görünmez (o an temiz form kurulur). Hazır bekleyen formun tarih/saati açıldığı ana güncellenir (dokunulmamışsa).
- Düzenleme: form o işlemle kurulur ve tüm sütunlar aynı karede çizilir (eskiden kurulum çipleri ve notlar sonradan geliyordu).

### Kod parçalara bölündü
- `AddTradeForm.tsx` 2005 → 634 satır: bölümler `src/components/tradeForm/` altına (BasicInfoCard, ResultCard, SetupChips, NotesCard, ortak yardımcılar `shared.tsx`).
- `TradeList.tsx` 1689 → 1282: satır bileşeni `tradeList/TradeRow.tsx`, açılır seçim/arama kutuları ve başlık rozetleri `tradeList/controls.tsx`.
- `GlobalFilterModal.tsx` → filtre satırı ve seçim düğmeleri `filters/FilterControls.tsx`.
- `DeepAnalysis.tsx` 1593 → 1312: kümülatif kazanç grafiği `deepAnalysis/EquityChart.tsx`.
- Davranış değişmedi; kullanılmayan importlar temizlendi.

### İşlem formu: risk satırı
- 0.25 hazır risk kaldırıldı (hazırlar: 0.50 · 0.75 · 1.00). Eski 0.25'li işlemler düzenlenince elle girilen yüzde olarak açılır, veri kaybı yok.
- Riskin $ karşılığı satırın başına, 0.25'in yerine taşındı; satır artık tek sıra ve sarmıyor: chipler kalan genişliği paylaşıyor, elle yüzde girişi `%` düğmesinin yerine açılıyor (ayrıca yer ayırmıyor). $ kutusu kesik çerçeveyle salt okunur olduğunu belli ediyor; risk seçilince mor vurgu alıyor.

### Yazı tipleri: hiyerarşik yeni sistem
- Plus Jakarta Sans yerine üç aileli sistem:
  - **Inter** — arayüz, metin, etiketler. Uygulamadaki 9–11 px büyük harf etiketlerde çok daha okunaklı; optik boyutlu, açık rakam biçimleri (1/4/6/9 ayırt edilir).
  - **Manrope** — sayfa/pencere başlıkları (`heading-1`, `page-title`, h1/h2) ve büyük değerler (text-lg ve üstü: Net R, bakiye, kazanma oranı…). Büyük harfsiz büyük değerlerde hafif sıkı aralık.
  - **JetBrains Mono** — kod ve sayı rozetleri (`font-mono`; önceden o da Jakarta'ydı).
- Rakamlar her yerde eşit genişlikte (tabular): fiyat, R ve yüzde sütunları hizalı, değer değişince yazı zıplamaz.
- Okunurluk tabanı: 8–8.5 px yazılar 9 px'e çıkarıldı.
- Bildirimler (toast) de aynı yazı tipini kullanıyor.

### Yazı tipleri (2. tur): ferah, rahat okunan, terminal havasından uzak
- Üç aileli sistem (Inter + Manrope + JetBrains Mono) yerine tek aile: **DM Sans** (optik boyutlu). Geniş açıklıklı, yumuşak hatlı; küçük etiketlerde ferah, büyük değerlerde zarif. Kod/mono yazı tipi tamamen kalktı; sayı rozetleri aynı ailede eşit genişlikli rakamlarla.
- Hiyerarşi boyut + ağırlık + renkle: değer/başlık (text-lg+, sıkı aralık) → bölüm başlığı → etiket → metin (14 px, 1.6 satır aralığı).
- "Her şey kalın" görünümü yumuşatıldı: kalın 700 → 640, extrabold 800 → 700, black 900 → 740, semibold 600 → 580.
- Büyük harf etiketlerdeki makine yazısı hissi veren geniş harf aralığı azaltıldı (widest 0.1em → 0.07em, wider 0.05em → 0.045em).
- Küçük yazılar yarım piksel büyütüldü (9 → 9.5, 10 → 10.5, 11 → 11.5 px); 9.5 px altı yok. Sıkı tek satırlık etiketlere 1.1 satır aralığı.
- Eşit genişlikli rakamlar yalnızca tablolarda ve sayı alanlarında; metin içinde doğal rakam genişliği.

### İşlem formu: hesaplar tek satırda + ferah düzen
- Hesap seçimi tek satır: hesaplar satırı eşit paylaşan kartlar (ikon · hesap adı · aşama ve boyut, ör. "Phase 1 · 10K"). Sığmazsa yatay kayar, kenarlar yumuşakça solar; seçilen hesap görünür alana kayar. "Hesapsız" sağda sabit, kesik çerçeveyle ayrı duruyor.
- Sıkışıklık giderildi: kart iç boşlukları 12 → 16 px, satırlar arası 10 → 14 px, etiket altı 4 → 8 px, giriş/düğme yükseklikleri 32 → 36 px, kurulum çipleri daha dolgun; üst ve alt çubuklar ferahladı.
- Geniş ekranda sütun oranları dengelendi (temel bilgi · kurulum · notlar = 11 · 13 · 6): ilk sütun daha geniş, notlar artık dar bir şerit değil.

## Edge kokpiti (Derin Analiz) + disiplin takibi + arayüz cilası

### Edge özeti (Derin Analiz'in en üstü)
- Genel beklenti, %95 güven aralığı ve hüküm (Kanıtlı edge / Umut verici / Henüz zayıf / Negatif edge / Az örneklem).
- **Daha çok yap:** en iyi kurulumlar (Strateji · Seans · Giriş modeli) + en güçlü tekil alanlar (ör. "Seans: London").
- **Azalt ya da bırak:** en zayıf kurulumlar + en çok R kaybettiren alanlar (strateji, seans, giriş modeli, P/D, TF, HTF, trend, TP target, Asia FVG, yön, parite taranır; en az 5 işlem şartı).
- **Risk %'sine göre** beklenti (hangi riskte daha iyi oynuyorsun) ve **News day etkisi** (haber günü / normal gün).
- Her satır tıklanınca o işlemler geçmiş penceresinde açılır. Hesap `src/lib/edgeSummary.ts` (3 test).

### Disiplin ve kural simülasyonu
- Altı kural: düşük kalite setup (B-C), haber günü işlemi, normalden yüksek risk (en sık kullandığın risk %'sinin üstü), intikam işlemi (kayıptan sonra X dk içinde), aşırı işlem (günde N'den fazla), günlük stop sonrası (gün içi −X R'ye inince devam).
- Her kural: ihlal sayısı, ihlallerin toplam R'si (maliyet), "uysaydın" işlem başı beklenti; en pahalı kural en üstte. Veri yoksa "ölçmek için veri yok".
- Özet: temiz işlem oranı (çubuk), temiz vs ihlalli beklenti, "kurallara uysaydın" net R ve şu anki net R ile fark.
- Eşikler ayarlanabilir (intikam 30/60/120 dk, günlük işlem 1–4, günlük stop −1/−2/−3R) ve tarayıcıda hatırlanır. Hesap `src/lib/discipline.ts` (4 test).

### Buton ve pencere cilası (klasik tasarım aynı)
- Simge butonları: üzerine gelince belirginleşen kenar ve hafif halka, basınca çökme.
- Pencereler: daha yumuşak ve derin gölge, ince iç ışık çizgisi; başlık şeridi biraz daha ferah ve hafif aydınlık.
- Eski küçük yazı büyütme kuralları ve genel "eşit genişlikli rakam" kuralı kaldırıldı (yeni yazı hiyerarşisiyle çakışıyordu); eşit genişlik yalnızca tablolarda ve sayı alanlarında.
- Testler: 58 → 65.

## İşlem detayı: verinin tamamı ve doğru yorumu
- **Sonuç: plan ↔ gerçekleşen.** Gerçekleşen R, plan R:R (TP pip ÷ stop pip; önceden stop/TP pip hiç gösterilmiyordu) ve risk % yan yana. Hesapsız işlemde boş risk kutusu yok.
- **Fiyat yolu.** Stop = −1R ölçeğinde çizgi: SL · giriş · TP işaretleri, MAE…MFE gezinme aralığı ve çıkış noktası. Altında: MAE stop'un yüzde kaçı (stop'a %80+ yaklaştıysa kırmızı), MFE kaç R, **masada kalan R** (MFE − gerçekleşen; 1R+ ise sarı) ve **yakalanan %** (hareketin ne kadarını aldın). Stop pip girilmemişse ipucu gösterilir, MAE/MFE pip olarak bağlam listesinde kalır.
- **Kurulum geçmişi.** Bu işlemin kurulumu (Strateji · Seans · Giriş modeli) ile yapılan **diğer** işlemlerin beklentisi, kazanma oranı, net R, %95 güven aralığı ve hükmü (Kanıtlı edge / Umut verici / Zayıf / Sızıntı / Az örneklem). İşlemin kendisi hariç tutulur: "bu kurulumun geçmiş kanıtı".
- **Disiplin rozetleri.** İşlemin çiğnediği kurallar (düşük kalite, haber günü, yüksek risk, intikam, aşırı işlem, günlük stop sonrası) kırmızı rozetlerle; yoksa "Kurallara uygun". Eşikler Disiplin panelindekiyle aynı.
- **Düzeltmeler:** setup kalitesi renkleri sıraya uygun (A+ yeşil · A mavi · B-C kırmızı; önceden A sarı, B-C sarıydı); trend artık kırmızı/yeşil boyanmıyor (reversal bir hata değil, kurulum tipi); sonuç R iki ondalığa yuvarlanıyor.
- Tam geçmiş, detay penceresi nereden açılırsa açılsın (ana liste, analiz, takvim, geçmiş pencereleri) aynı şekilde kullanılır. Hesap `src/lib/tradeInsight.ts` (3 test). Testler: 65 → 68.

## NY saati, çıkış saati, Target, edge kanıtı ve tekrarların temizliği

### Giriş ve çıkış saati New York saatiyle
- İşlem formunda **Giriş (NY)** ve isteğe bağlı **Çıkış (NY)** alanları. Takvimdeki "Şimdi / Bugün / Dün" NY'ye göre çalışır. Girilen NY duvar saati gerçek ana çevrilip saklanır (ABD/Avrupa yaz saati farkı haftaları dahil; testli).
- Gösterim de NY: işlem listesi ("Tarih · NY"), işlem detayı (NY rozeti), rapor ve yedek listeleri.
- Hesaplamalar NY takvimine göre: günlük/haftalık/aylık gruplama, takvim, gün-içi disiplin kuralları (aşırı işlem, günlük stop, intikam), haftanın günü ve saat analizleri.
- Entry Time çipi, NY giriş saatinden otomatik seçilir (çipe elle dokunursan ezilmez).
- Eski kayıtlar değişmez: zaman damgaları gerçek an olduğundan yalnızca NY saatiyle gösterilir.

### Çıkış saati ve işlemde kalma süresi
- Yeni alan `exitAt`; girişten önce olamaz (form uyarır, veri modeli ve yedek içe aktarma da denetler).
- İşlem detayında "Süre" ve çıkış saati (NY). Edge özetinde **kazanan / kaybeden işlemlerde ortalama kalma süresi**.

### TP Target → Target (çıkış hedefi)
- Alanın adı **Target** oldu ve anlamı çıkış hedefi: işlemden nerede çıkmayı hedeflediğin. Kayıtlı "TP Target" başlığı otomatik olarak Target'a dönüşür (özel başlık verdiysen korunur).
- İstatistiklerde bu bağlamda: laboratuvarda "Target & Bölge" sekmesi ve "Target (çıkış hedefi) performansı", kurulum karnesi / Edge özeti / filtre / kıyaslama / Excel'de "Target (çıkış)". İşlem detayında Target artık sonuç bölümünde, süre ile yan yana.

### Hızlı kayıt
- Hızlı kayda **Stop pip** ve **TP pip** eklendi (plan R:R ve önerilen R için). MAE/MFE/Asia range yalnızca tam formda.

### Ana panel: beklenti ve edge kanıtı
- "Ortalama Beklenti" kartı **"Beklenti & Edge Kanıtı"** oldu: beklentinin %95 güven aralığı ve durum çubuğu — "Edge kanıtlandı" / "Kanıt için ~N işlem daha" / "Edge yok".

### Tekrarlar kaldırıldı
- Laboratuvardaki **Hata & Sızıntı** sekmesi kaldırıldı → Derin Analiz'deki **Disiplin** paneli.
- Laboratuvardaki **Monte Carlo Riski** sekmesi kaldırıldı → Prop kartındaki **geçme / ayakta kalma olasılığı**.
- **Pre-Trade Kontrol** sekmesi kaldırıldı → **Kurulum Karnesi**'ne "işlem öncesi kontrol" arama kutusu (ör. "London FVG" yaz, o kurulumun karnesini gör; eşleşme yoksa "kanıtsız kurulum").
- `strategy/PreTradeCheckerTab.tsx` artık kullanılmıyor (boş bırakıldı, silebilirsin).
- Edge kanıtındaki "kaç işlem daha" hesabı güven aralığıyla aynı t-değerini kullanıyor (küçük örneklemde "0 işlem daha" deyip aralığın hâlâ sıfırı kapsaması düzeltildi).
- Testler: 68 → 76.

## Tutarlılık turu: tek eşik, tek tanım, sabit disiplin kuralları
- **Tek örneklem eşiği:** `src/lib/sampleSize.ts` → `MIN_SAMPLE = 5`. Kurulum karnesi, Edge özeti, Disiplin ve Strateji laboratuvarının tüm sekmeleri (önceden 10) aynı eşiği kullanıyor; aynı kurulum bir ekranda hüküm alıp başka ekranda "az örneklem" görünmüyor. Hükümler yine %95 güven aralığına dayanıyor.
- **Düşük kalite setup tek tanım:** `isLowQualitySetup` (B-C / B / C / FOMO, "ihlal / disiplinsiz / intikam / düşük" içeren etiketler). Laboratuvarın Genel Bakış'ındaki "plan dışı işlemleri elerseniz" hesabı ile Disiplin panelinin "Düşük kalite setup" kuralı artık aynı işlemleri sayıyor.
- **Monte Carlo hesabı kaldırıldı:** sekmeden sonra arka plandaki simülasyon da kalktı (laboratuvar her açılışta 500 simülasyon çalıştırıyordu). Geçme / ayakta kalma olasılığı Prop kartında.
- **Dışa aktarma "Bu hafta / Bu ay":** New York takvimine göre (hafta pazartesi 00:00 NY).
- **Disiplin sadeleşti:** intikam kuralı ve tüm süre ayarı projeden kaldırıldı; ayar paneli yok. Sabit kurallar: **günde en fazla 2 işlem** (NY günü), günlük stop −2R, düşük kalite setup, haber günü, normalden yüksek risk. Panel başlığında "Günde en fazla 2 işlem" rozeti; işlem detayındaki rozetler aynı kuralları kullanıyor. Eski ayar kaydı (`tj_discipline_rules`) artık okunmuyor.
- Testler: 76 (intikam testi kaldırıldı, tek tanım testi eklendi).

## Düzeltmeler: hesap satırı, kapatma, ana panel, yazı tipi
- **Hesap satırı (tam form):** 4 aktif hesapta kartlar sığmayıp kayıyordu, bazı hesaplar görünmüyordu. Kartlar sadeleşti: ikon kutusu yerine sol kenar rengi (yeşil = Funded, mavi = değerlendirme), aşama kısa ("P1 · 10K"), uzun ad kısaltılır (tamamı ipucunda). 1280 ve 1440 px ekranda 4 hesap + Hesapsız tek satırda; telefonda yatay kayar.
- **İşlem penceresi kapatma:** "Kaydedilmemiş değişiklikler" uyarısı kaldırıldı; çarpı, İptal ve Esc pencereyi doğrudan kapatır (açık parite listesi varsa Esc önce onu kapatır). Bir sonraki açılışta form yine temiz gelir.
- **"Stop ve TP pip girilirse R önerilir"** yazısı kaldırıldı.
- **Ana panel:** "Beklenti & Edge Kanıtı" kartı uzundu ve satırdaki tüm kartları uzatıyordu. Kart artık **"Edge Kanıtı"**: işlem başı beklenti + durum rozeti ("✓ Kanıtlandı" / "~N işlem daha" / "Edge yok") + güven aralığı + ince ilerleme çizgisi; diğer kartlarla aynı yükseklik. Ortalama kazanç / kayıp Derin Analiz'de.
- **Etiket:** Psikoloji sekmesinde "İntikam İşlemi Riski" → "Kayıp sonrası performans". Metrik açıklamalarındaki intikam ticareti ifadeleri, güncel kurallara (günde en fazla 2 işlem, günlük stop −2R, plan dışı işlem maliyeti) göre yeniden yazıldı.
- **Çevrimdışı yazı tipi:** DM Sans artık Google Fonts yerine projeye gömülü (`@fontsource-variable/dm-sans`); woff2 dosyaları PWA önbelleğine girer, internetsiz de aynı görünür ve açılışta yazı tipi kayması olmaz.

## Edge Durumu, laboratuvar sekmeleri, form sırası, Entry Time kaldırıldı, NY yaz/kış saati güvenliği
- **Ana panel:** "Edge Kanıtı" kartının adı **Edge Durumu**.
- **Edge Özeti ve Disiplin laboratuvara taşındı:** Detaylı Analiz'in üstünden kaldırıldı; Strateji & Edge Geliştirme Laboratuvarı'nda sırasıyla **Genel Bakış → Edge Özeti → Disiplin → Kurulum Karnesi → …** sekmeleri. Satırlara tıklayınca işlemler yine geçmiş penceresinde açılır (oradan düzenlenebilir). Başlık "Edge Özeti".
- **İşlem formu kurulum sırası:** Strateji · Session · Timeframe · PD Array · Entry Timeframe · Entry Model · Target · **Confirmations** (eski adı Premium / Discount; kayıtlı "Premium / Discount" başlığı otomatik Confirmations olur, özel başlık korunur; filtre, detay, karne, kıyaslama, laboratuvar ve Excel'de de Confirmations).
- **Asia Range FVG** artık News Day / Bank Holiday'in sağında, aynı butonlu (segment) tasarımda.
- **Entry Time tamamen kaldırıldı:** formdan, Tanımlamalar'dan ve işlem detayından. Giriş saati her yerde işlem zamanından (NY) türetiliyor; eski kayıtlardaki `entryTime` okunurken düşer. Saat analizleri (saat dilimi, ısı haritası, Excel) yalnızca NY giriş zamanını kullanır.
- **NY yaz/kış saati önlemleri:**
  - Saat geri alındığında (kasım) iki kez yaşanan 01:00–01:59 → her zaman ilk geçiş (yaz saati) seçilir; giriş/çıkış ve süre gerçek zamandan hesaplanır (o gece 00:30 → 02:30 = 3 saat).
  - Saat ileri alındığında (mart) hiç yaşanmayan 02:00–02:59 → 03:xx'e kaydırılır; form "02:30 New York'ta yok, 03:30 NY olarak kaydedilir" uyarısı gösterir. Önceden bu saat 01:30'a düşüp başka bir işlemle çakışabiliyordu (düzeltildi).
  - Saklanan değer her zaman gerçek an (UTC); gösterim ve gruplamalar Intl ile NY'ye çevrilir, ABD/Avrupa farklı geçiş haftaları dahil (testli).
- **İşlem detayı sol panel:** sonuç kartları, fiyat yolu, kurulum geçmişi ve disiplin daha kompakt; işlem bağlamı iki sütunlu döşemeye geçti (hesap tam satır). Tüm detaylar kaydırmadan görünür.
- **Prop sekmesi üst kartları** ana paneldeki kartlarla aynı düzende: simgeli başlık · değer · alt rozet (zincir sayısı, payout sayısı, "payout − ücret", funded oranı); altta boş alan kalmıyor.
- **Ana panel boşlukları:** sekme içeriği sarmalayıcısı düzen sınıflarını yutuyordu; kartlar, "Yeni Pozisyon Girişi Yap" ve İşlem Geçmişi birbirine yapışıktı. Boşluklar geri geldi (tüm sekmelerde).
- Testler: 79.
- İşlem detayı sol paneli 720px yükseklikte de kaydırmasız sığacak şekilde sıkılaştırıldı (bölüm aralığı ve bağlam döşemeleri).
- App.tsx'te kalan eski `entryHours` prop'u kaldırıldı.

## İşlem detayı sol panel sırası
- Sıra: Sonuç → İşlem Bağlamı → Fiyat Yolu → Disiplin → Kurulum Geçmişi.
- İşlem Bağlamı sırası: Hesap, Strateji, Session, Trend Yapısı, Asia Range FVG, Timeframe, PD Array, Entry Timeframe, Entry Model, Target, Confirmations, News Day/Bank Holiday, Setup Kalitesi (varsa pip alanları en sonda).
- Target artık her zaman işlem bağlamında; sonuç bölümünde yalnızca işlemde kalma süresi kaldı.
- Kaydırmasız sığması için: işlem bağlamı 3 sütun (telefonda 2), Asia Range (pip) Asia Range FVG döşemesine birleşti, süre sonuç satırında 4. kart, fiyat yolu metrikleri tek satır, kurulum geçmişindeki tekrar eden değer çipleri ipucuna taşındı.
- İşlem bağlamı yeniden iki sütun: Hesap tek satır, diğer alanlar sırayla ikili.
- İşlem bağlamı eski ferah döşemesine döndü; yer açmak için Fiyat Yolu küçültüldü (ince gösterge, kenarlıksız tek satır MAE/MFE/Masada kalan/Yakalanan, açıklamalar ipucunda).

## İşlem detayı yeniden düzen
- Sol panel (%40): yalnızca Sonuç ve ferah İşlem Bağlamı.
- Sağ panel (%60): Teknik Analiz Görseli → analiz şeridi (Fiyat Yolu solda; Disiplin + Kurulum Geçmişi sağda) → Notlar. Görsel yoksa boş kutu küçültüldü.
- Telefonda başlıktaki düzenle/sil/indir butonları gizlendi (alt çubukta zaten var); Kapat butonu artık ekran dışına taşmıyor.

## İşlem detayı: gezinme ve yeni yerleşim
- Sonuç kartları 2×2 ızgara; etiket solda, değer sağda (dar panelde taşma yok).
- Disiplin işlem bağlamının altına; Fiyat Yolu ve Kurulum Geçmişi notların altına (yan yana) taşındı.
- İşlemler arası geçiş: başlıkta ‹ › butonları ve sıra göstergesi (ör. 3 / 10), klavyede ← / →. Sıra, işlemin açıldığı listenin görünen sırasını (filtre + sıralama) izler; geçişte paneller en üste döner.
- Fiyat Yolu ve Kurulum Geçmişi kutuları eşit yükseklikte; Asia Range FVG bağlamında önce pip, sonra var/yok yazılır.

## Proje geneli uyum ve kararlılık
- Saat birliği: işlem listesi tarih aralığı filtresi, Excel/CSV dışa aktarım (Tarih/Saat/Çıkış/Süre), denetim raporu tarih aralığı ve görsel indirme dosya adı NY gününe göre. Yerel saat (İstanbul) ile kayan gün farkı giderildi.
- Setup kalitesi kademesi tek kaynakta (`setupQualityTier`); form, filtre, Detaylı Analiz ve işlem detayı aynı renk kademesini kullanır. "B" artık her yerde düşük kalite (disiplin kuralıyla aynı); Detaylı Analiz'de B-C'nin nötr görünmesi düzeltildi.
- Örneklem eşiği birliği: Edge Durumu kartı ve Asia Edge Lab hükmü/varsayılanı ortak `MIN_SAMPLE` (5) eşiğine bağlandı.
- Kaldırılan ölü yapı: Entry Time tanım listesi (entryHours: durum, bulut eşitleme, yedek, tanım yöneticisi), filtre `entryTime` alanı, panelde hiç açılmayan işlem detayı penceresi.
- Escape çakışması: işlem detayında silme onayı açıkken Escape yalnızca onayı kapatır (ana uygulama ve işlem geçmişi penceresi detayı ikinci kez kapatmaz).
- Dışa aktarım: çift tarih sütunları birleşti, "PD Array" sütun adı düzeltildi, Çıkış (NY) ve Süre sütunları eklendi.
- Kural metinleri (günde en fazla işlem, günlük stop) sabitlerden türetilir.
- Sekmeler arası eşitleme genişletildi: setup kalitesi, entry model, trend, target, confirmations, strateji, Asia FVG, news day listeleri, başlıklar ve Prop hesapları da diğer sekmedeki değişikliği alır (eski listeyle üzerine yazma riski kalktı).
- Başlık göçleri (TP Target → Target, Premium / Discount → Confirmations) artık kayda da yazılır; eski Entry Time başlığı ve listesi kayıttan silinir.
- Uçtan uca doğrulama: işlem ekleme → düzenleme → silme akışı, NY saatiyle kayıt, panel sayılarının kayıtla birebir eşleşmesi.

## Yeni işlem formu: kompakt hesap seçimi, kaydırmasız yerleşim · Firebase kuralları
- Hesap seçimi: tek kutu içinde segmentli seçim (İşlem Durumu ile aynı dil). Renkli nokta = hesap türü (yeşil Funded, mavi değerlendirme), küçük aşama etiketi (P1/F); bakiye ve durum ipucunda. Hesaplar ızgarada sarar, hiçbir hesap gizlenmez veya adı kesilmez.
- Yerleşim dengelendi: 1. sütun Temel Bilgiler + Analiz notları, 2. sütun kurulum, 3. sütun Sonuç + Grafik linki (önizleme alanı kalan yeri doldurur). 1920×1080, 1440×900, 1366×768, 1536×730 ve 1280×720'de kaydırmasız; kısa ekranlarda boşluklar orantılı küçülür.
- Hızlı kayıt: Temel ve Sonuç yan yana iki sütun (eskiden tek sütunda taşıyordu).
- MAE/MFE/Asia Range pip girişleri aynı hizada.
- Firestore kuralları: işlem/not/günlük için alan doğrulaması (zorunlu alanlar, izinli değerler, boyut sınırları), belge kimliği = id, ayar belgesinde userId denetimi, silme ayrı kural. Storage: yükleme yalnızca trades/prop klasörlerine, 5 MB altı raster görsel (SVG yok).
- İstemci: kurallarla birebir aynı `isValidTrade`; yedek içe aktarma ve toplu yazımlarda bozuk kayıt atlanır (tek kayıt 400'lük yazımı düşürmez), eski biçimler (long/win, metin tarih) onarılır.
- Bulut hataları (izin, oturum, kota, bağlantı) Türkçe ve tekrar etmeyen bildirimle gösterilir; not/günlük kaydı başarısızlığı artık sessiz değil.
- Yayın: kurallar `firebase deploy --only firestore:rules,storage` ile yayınlanmalı.

## Kart doluluğu, parite birliği, yayın hazırlığı
- Ana panel kartları dolduruldu: Profit Factor'da brüt kazanç / kayıp R; Kazanma Oranı'nda BE sayısı; Parite Başarı Analizi'nde her parite için net R ve işlem sayısı; Dönemsel Performans'ta dönem başına işlem sayısı ve kazanma oranı.
- Prop kartları ana paneldeki kartlarla aynı yapı ve yükseklikte: başlık · değer · alt satırda rozet + ikinci bilgi (ortalama ücret, ortalama payout, ROI, süren zincir sayısı).
- Parite birliği: "EUR/USD", "eurusd", "EUR-USD" tek parite ("EURUSD"). Kayıtlar okunurken, kaydedilirken, filtrelerde, tanım listesinde ve form aramasında aynı kural; Asia analizleriyle tek kaynak (`canonicalAsset`). Aynı paritenin iki yazımı artık istatistikleri bölmez. Varsayılan liste: EURUSD, GBPUSD, XAUUSD, NQ100, BTCUSDT.
- Yayın: sunucu Vite'ı yalnızca geliştirmede yükler (production başlangıcı hafif); Render için TOKEN_SECRET otomatik üretilir. Yeni production duman testi derlenmiş sunucuyu başlatıp sağlık, SPA, 404, güvenlik başlıkları ve parola akışını gerçek HTTP ile doğrular.

## Haftalık değerlendirme, hesap şeridi, ölçek düzeltmeleri
- Yeni: Günlük sekmesinde haftalık değerlendirme (src/lib/weeklyReview.ts, src/components/journal/WeeklyReview.tsx). NY haftası (Pzt–Paz). Otomatik gösterilenler: net R, işlem sayısı, kazanma oranı, beklenti ve önceki haftaya göre fark; günlük R şeridi; disiplin ihlalleri ve maliyeti; en iyi/en kötü kurulum. Üç soru var. Cevaplar `weekly-<pazartesi>` kimliğiyle günlük kaydı olarak saklanır; istatistik saklanmaz, her açılışta yeniden hesaplanır. "Tek odak" cevabı bir sonraki haftanın kartında görünür. Cuma 17:00 NY'den sonra ve hafta sonu, bu hafta işlem varsa ve değerlendirme yazılmadıysa ana panelde hatırlatma çıkar. Testler: tests/weeklyReview.test.ts
- İşlem ekleme: hesap seçimi tek satır oldu (src/components/common/ScrollStrip.tsx). Sığmayınca sağ/sol okları çıkar, fare tekerleği yatay kaydırır, seçili hesap görünür alana gelir.
- Ölçek: seçim çipleri tek ölçüde (CHIP_BASE). Tarih seçici 36px. 20–26px ikon butonları 28/32px yapıldı (29 buton). İşlem satırındaki Düzenle/Sil 28px.
- Hata: sabit kimlikli günlük kayıtları (ör. haftalık) hiç eklenmiyordu; artık ekleniyor, oluşturulma zamanı korunuyor.
- Hata: misafir modunda yerel işlemler normalizasyondan geçmiyordu (parite birliği vb. uygulanmıyordu).
- Hata: günlük tarihleri UTC'ye göre ayrıştırılıp bir gün kayabiliyordu.
- Hata: bozuk yerel listeler (dizi olmayan değer) çökme yerine yok sayılıyor.
- Kaldırıldı: Ctrl+Shift+Q/A ile tetiklenen ölü "quant mode" kısayolu (Ctrl+Shift+A'yı engelliyordu). Yinelenen .no-scrollbar CSS kuralı.
- Yedekten içe aktarma haftalık cevapları koruyor.

## İşlem formu sonuç kartı, haftalık değerlendirme tek ekran
- İşlem durumu: WIN/LOSS/BREAKEVEN yazıları kutuya tam sığıyor. BREAKEVEN'a daha geniş sütun verildi, iç boşluk azaltıldı, satır kırılması kapatıldı.
- Sonuç (R) artık kartın odak noktası. Alan duruma göre renkleniyor (yeşil/kırmızı/mavi), değer büyük yazıyla ve +/− işaretiyle gösteriliyor, yanında R eki var. Kısa bir ipucu da çıkıyor; stop ve TP girildiyse ipucu yerine plan R:R görünüyor.
- Pip etiketleri tek satırda kalıyor. Asia Range sütunu genişletildi, uzun özel başlıklar taşmak yerine kısaltılıyor (tam adı üzerine gelince görünüyor).
- Haftalık değerlendirme: masaüstünde kaydırmasız tek ekran. Üstte özet, altta solda disiplin ve kurulumlar, sağda üç soru; soru kutuları kalan yüksekliği paylaşıyor. "Bu haftanın odağı" tek satıra indi. Telefonda tek sütun.

## Hesap kapsamı, grafik linki, sağlamlaştırma
- Üst çubuktaki hesap seçici (TÜMÜ) artık tek kaynak. Seçenekler: TÜMÜ · CHALLENGE · FUNDED · HESAPSIZ. Challenge ve Funded altında her hesap tek tek seçilebilir; aktif hesaplar önce gelir, kapanmış ama işlemi olan hesaplar soluk görünür. Hiçbir hesaba bağlı olmayan eski kayıtlar "Bağlı hesabı yok" altında ayrı listelenir, böylece kategori toplamı alt satırların toplamına eşit olur. Silinen hesap seçiliyse seçim kendiliğinden kategoriye döner. (src/lib/accountScope.ts, testler: tests/accountScope.test.ts)
- Seçim ana paneli, işlem listesini, detaylı analizi, günlüğü ve haftalık değerlendirmeyi birlikte kapsıyor. Hesapsız işlemler hiçbir prop görünümüne karışmıyor.
- Haftalık değerlendirme kapsam başına ayrı tutuluyor (kimlik: weekly-<pazartesi>--<kapsam>; TÜMÜ'nün eski kayıtları aynen geçerli). Başlıkta kapsam adı yazıyor, günlük listesinde yalnızca seçili kapsamın değerlendirmeleri görünüyor, ana panel hatırlatması seçili kapsama göre çıkıyor.
- Yeni işlem formu, üstte aktif tek hesap ya da Hesapsız seçiliyse hesabı önceden seçili açılıyor.
- Grafik linki: yapıştırınca form uzamıyor, kaydırma çıkmıyor; önizleme kartın kalan alanına sığıyor ve görselin tamamını gösteriyor. Baştaki/sondaki boşluklar atılıyor, şemasız link https ile tamamlanıyor. TradingView paylaşım linki işlem detayındaki gibi görsele çözülüyor (ortak yardımcı: src/lib/chartLink.ts). Görsel açılamazsa uyarı veriliyor ama link yine kaydediliyor. Yeni sekmede açma butonu eklendi.
- Sağlamlık: yerel kayıtlar anahtar anahtar okunuyor; bozuk bir not ya da günlük kaydı artık işlemlerin yüklenmesini engellemiyor. Sekmeler arası eşitlemede bozuk/dizi olmayan değerler yok sayılıyor.
- Telefon: uzun hesap adı seçildiğinde üst çubuk taşmıyor.

## Hesap menüsü düzeni, filtre tutarlılığı, kayıt mantığı testleri, kural sıkılaştırma
- Hesap menüsü:
  - Kapanmış (geçti / patladı / arşiv) hesaplar her kategoride "Kapanmış hesaplar (n)" altında katlı duruyor.
  - 8'den fazla hesap olunca üstte arama kutusu çıkıyor: ad ya da firmayla süzülüyor, Enter ilk eşleşmeyi seçiyor.
  - Seçili hesap her zaman görünür: kapanmış gruptaysa grup açık başlıyor ve menü seçili satıra kayıyor.
- Sayı tutarlılığı: varsayılan tarih aralığı "6 ay"dan "Tüm zamanlar"a geçti. Kayıtlı eski varsayılan da bir kez taşınıyor (filtre sürümü 5). Aralık daraltıldığında ana panel ve detaylı analizde "Son 3 ay gösteriliyor · n işlem · Tüm zamanları göster" notu çıkıyor.
- Filtre menüsü: üst çubuktaki hesap seçiciyle çakışan "Hesap" ve "Aşama" filtreleri kaldırıldı. Eski kayıtlı seçimler gizli filtre olarak kalmasın diye temizleniyor.
- Kayıt mantığı ayrı ve test edilebilir modüle taşındı (src/lib/recordStore.ts, tests/recordStore.test.ts):
  - ekleme / güncelleme / silme;
  - hata durumunda geri alma;
  - sabit kimlikli günlük kaydı;
  - bulut ile yerel listenin birleştirilmesi.
- Bulut eşitlemesindeki yan etki (yerel kayıtları yükleme) state güncelleyicisinin dışına alındı. Liste artık her zaman güncel durumdan birleştiriliyor; aynı anda yapılan iyimser ekleme kaybolmuyor.
- Günlük sıralaması saat dilimine bağlı Date ayrıştırması yerine tarih metniyle yapılıyor.
- Yerel not ve günlük listeleri yüklenirken doğrulanıyor: bozuk öğe atılıyor, dizi olmayan değer boş listeye dönüyor.
- İşlem modeli: isteğe bağlı metin ve sayı alanlarının türü onarılıyor. Bozuk eski kayıtlar düzeltiliyor; buluta yazımda kural reddi olmuyor. isValidTrade kuralla birebir aynı alanları denetliyor.
- firestore.rules:
  - İşlemde tüm metin alanlarına uzunluk sınırı ve hesap tipi denetimi eklendi.
  - Günlükte haftalık cevaplar (yalnızca good / avoid / focus, en fazla 5000 karakter) denetleniyor.
  - Ayar belgesinde alan sayısı, tanım listelerinin boyu ve kullanıcı adı sınırlandı.
  - Yayın: `firebase deploy --only firestore:rules,storage`

## TÜMÜ = prop hesapları, denetim düzeltmeleri
- TÜMÜ artık yalnızca Challenge + Funded'ı kapsıyor. Hesapsız işlemler (hesap bilgisi olmayan eski kayıtlar dahil) panelde, listede, analizde, günlükte ve haftalık değerlendirmede yalnızca HESAPSIZ seçilince görünüyor. Menüde TÜMÜ "Challenge + Funded", HESAPSIZ "ayrı tutulur" diye açıklanıyor; TÜMÜ'nün sayısı yalnızca prop işlemlerini sayıyor.
- Uygulama her açılışta TÜMÜ ile başlıyor; seçim yalnızca o oturum boyunca korunuyor (eski kalıcı kayıt temizleniyor).
- Kaydedilen işlem seçili görünümün dışında kalıyorsa nerede görüleceği söyleniyor (ör. "görmek için üstten HESAPSIZ seçin").
- Filtre menüsündeki seçenek listeleri seçili kapsamın işlemlerinden üretiliyor.
- Hata: Gelişmiş metriklerdeki "gün × yön" ve "saat bazlı kayıp" kovaları NY saati yerine tarayıcı saat dilimine göre kayıyordu. İstanbul'da saatler 3 saat geride, 00:00–03:00 NY işlemleri bir önceki güne yazılıyordu (London açılışı tam bu aralıkta). Düzeltildi; İstanbul saat dilimiyle test eklendi (tests/nyBuckets.test.ts).
- Hata: Asia Edge Lab'deki kayan beklenti tarihi UTC gününe göre yazılıyordu; artık NY günü.
- Sağlamlık: R işareti durumla tutarlı tutuluyor (WIN pozitif, LOSS negatif, BE 0); ters işaretli eski ya da içe aktarılmış kayıt istatistiği bozmuyor.
- "Son kurulumu kopyala" dizi sırasına bakmadan en son girilen işlemi alıyor.

## Saat dilimi, dışa aktarım, filtre tasarımı, sadeleştirme
- Saat dilimi: projenin tamamı America/New_York ile çalışıyor.
  - Kapsananlar: işlem formundaki otomatik saat ve tarih seçicinin "Şimdi / Bugün / Dün" düğmeleri, takvimler, günlük, notlar, prop tarihleri, PDF/Excel/CSV çıktıları ve dosya adlarındaki tarih.
  - Prop hesabının başlangıç günü artık NY gece yarısından sayılıyor.
  - Tüm "NY" rozet ve etiketleri kaldırıldı.
- Açılış varsayılanı: uygulama her açılışta TÜMÜ ve "Tüm zamanlar" ile başlıyor; zaman aralığı artık kalıcı tutulmuyor (filtre sürümü 6).
- İşlem detayı: ← / → ile işlemler arasında geçerken içerik geldiği yönden hafifçe kayarak beliriyor. Animasyon yalnızca opaklık ve konumla çalışıyor, görseller yeniden yüklenmiyor; azaltılmış hareket ayarı açıksa kapanıyor.
- PDF işlem çıktısı: paritenin altındaki entry model etiketleri kaldırıldı.
- Excel / CSV:
  - Formdaki her girdi kendi sütununda: hesap ID, risk ($), hızlı kayıt, grafik linkinin kendisi.
  - Sütun adları Tanımlamalar'daki başlıkları kullanıyor.
  - Notlardaki satır sonları korunuyor.
  - Günlük çıktısına haftalık değerlendirme cevapları ve son güncelleme eklendi.
  - Excel hücre sınırını aşan metin işaretlenerek kısaltılıyor.
  - Testler: tests/exportTrades.test.ts
- Kaldırıldı: "Veri Analitiği ve Denetim" raporu ve butonu. Kullanılmayan jspdf bağımlılığı da çıkarıldı. AuditReportModal.tsx artık boş, silinebilir.
- Filtre tasarımı: tüm filtre düğmeleri tek ortak bileşenden geliyor (src/components/filters/FilterControls.tsx).
  - Ortak bileşenler: FilterChip, FilterSegment, FILTER_LABEL / FILTER_INPUT / FILTER_SELECT.
  - Aynı boy, yazı ve renk: "Tümü" nötr, seçim mavi, WIN/LONG yeşil, LOSS/SHORT kırmızı, BE mavi.
  - Kapsanan yerler: filtreleme menüsü, işlem listesi (Durum / Yön), Asia Edge Lab, Setup Scorecard, karşılaştırma seçimleri ve gelişmiş metriklerdeki parite filtresi (artık aşağı açılan düzenli bir panel).

## Tek filtre yeri, edge kanıt eşiği, yumuşak geçiş
- İşlem listesinin kendi filtre panelinde artık yalnızca listeye özgü seçenekler var: sıralama ve tarih aralığı (arama üstte). Sonuç, yön, parite, PD array, setup kalitesi, seans, timeframe, trend, entry model ve Asia range filtreleri yalnızca Filtreleme Menüsü'nde. İki ayrı yerde çakışan seçimle listenin "sebepsiz" boşalması önlendi; görsel tutarsızlık da ortadan kalktı.
- Edge kanıtı: "Kanıtlandı" / "Kanıtlı edge" için hem güven aralığının sıfırın üstünde olması hem de en az 30 işlem gerekiyor (EDGE_PROOF_MIN). O sayıya kadar pozitif sonuç "Umut verici · n/30", negatif sonuç "Şu an negatif · n/30" olarak gösteriliyor. Zarar / sızıntı uyarıları eşiği beklemiyor. Bu kural ana panelde, kurulum karnesinde, Edge kokpitinde, işlem detayında ve Asia Edge Lab'de aynı.
- İşlem detayı geçişi yumuşatıldı: içerik tamamen kararmıyor, daha kısa bir mesafeden ve daha uzun süzülen bir yavaşlamayla (0,45 sn) yerine oturuyor.
- İşlem detayı geçişi yeniden ayarlandı: pencere artık hiç kararmıyor ya da ton değiştirmiyor. İçerik neredeyse tam opaklıktan (0,88) çok kısa bir mesafeyle (6px) 0,5 sn'de süzülüyor. WIN/LOSS rozetleri, R rengi ve kart zeminleri gibi renk değişimleri ani değil, aynı sürede yumuşakça karışıyor (index.css · .detail-soft; kendi geçişi olan öğeler etkilenmiyor).
- Hata: Orta genişlikte (≈800px) işlem detayının başlığında tarih metni gezinme düğmelerinin altına taşıp üst üste biniyordu. Artık xl altında başlık, rozetler ve tarih alt alta diziliyor; tarih kısa biçimde ("21 Eki 2026 Çar 19:07") ve gerekirse kısaltılarak gösteriliyor.

## Geçiş yeniliği, orta genişlik düzeltmeleri, genel denetim
- İşlem detayı geçişi yeniden tasarlandı:
  - Pencere ve zemin sabit kalıyor.
  - Bölümler (sonuç, bağlam, disiplin, görsel, notlar) geldiği yönden 5px kayarak sırayla (35 ms arayla) yerine süzülüyor.
  - Sayaçtaki yeni numara yönüyle geliyor.
  - Başlığın altındaki ince çizgi, listedeki konumu yumuşakça gösteriyor.
  - Renkler aynı sürede karışıyor.
  - Görseller yeniden yüklenmiyor; "hareketi azalt" ayarına uyuluyor.
- Orta genişlik (768–1100px) taraması: tüm sekmeler, hesap menüsü, işlem detayı, işlem formu, filtre menüsü, tanımlamalar ve haftalık değerlendirme ölçüldü. Bulunan ve düzeltilenler:
  - İşlem formu 1024–1279px'de üç sütuna sıkışıyordu: alanlar kesiliyor, yatay kaydırma çıkıyordu. Artık iki sütun; Sonuç ve Grafik Linki alta, yan yana iniyor. 1280px ve üstünde düzen eskisi gibi tek ekran.
  - Trend yapısı düğmelerinde "CONTINUATION" dar sütunda kesiliyordu.
  - İşlem listesinde Düzenle/Sil sütunu dar kaldığı için Sil düğmesi 800px civarında taşıyordu; sütun genişlikleri dengelendi.
  - Daha önce: işlem detayının başlığında tarih düğmelerin altına biniyordu.
- Güvenlik: grafik linki yalnızca http(s) bağlantısı ya da gömülü görsel olabiliyor. Bozuk ya da kötü niyetli bir yedekten gelen "javascript:" gibi tıklanınca kod çalıştırabilecek değerler yüklenirken düşüyor; işlem detayındaki "yeni sekmede aç" bağlantısı da yalnızca http(s) açıyor. Test eklendi.
- Yedekten içe aktarma:
  - Eski yedeklerdeki gömülü görseller giriş yapılmışken önce Storage'a yükleniyor. Daha önce 1 MiB'yi aşan tek bir görsel 400 kayıtlık toplu yazımın tamamını düşürüyordu.
  - Kimliği olmayan bozuk not/günlük kayıtları atlanıyor.

## Kod denetimi turu (veri doğruluğu)
- advancedMetrics: "Su altı süresi" art arda kazançlar arasındaki boşluğu da düşüş sayıyordu → yalnızca zirvenin altında geçen süre ölçülüyor (test eklendi).
- İşlem detayı içgörüsü: kurulum geçmişi ve günlük disiplin sayaçları (günlük işlem sınırı, günlük stop) hesapsız işlemleri de katıyordu → hesapsız yalnızca hesapsızla, prop işlemi yalnızca Challenge + Funded ile karşılaştırılıyor (test eklendi).
- Prop Monte Carlo: hesabın kendi işlemi 20'den azken örneklem tüm işlemlerden (hesapsız dahil) alınıyordu → yalnızca prop geçmişi; açıklama metni güncellendi.
- Strateji laboratuvarı: "A+ / A Kalite Getirisi" ve "A+ Net R" negatif olduğunda "+-2.5 R" gibi görünüyordu → işaret ve renk değere göre.

## Yayına hazırlık turu (tutarlılık, senkron, stabilite)
**Setup kalitesi tek tanım:** A+ = yüksek, A = orta, B-C / FOMO = düşük. Strateji laboratuvarı (Disiplin Deltası artık üç sütun: Yüksek / Orta / Düşük), "Sadece A+" simülasyonu, kalite kartları ve Detaylı Analiz renkleri aynı kaynaktan (`setupQualityTier`). Detaylı Analiz'deki farklı kurallı, kullanılmayan sınıflandırma silindi.

**Az örneklemli hükümler:** Ortak `signalStrength` kuralı: olumlu bulgu ancak ≥30 işlem ve %95 aralık sıfırın üstündeyse "Kanıtlı"; sızıntı, aralık tamamen negatifse beklemeden "Kesin"; geri kalanı "Erken · n/30". Edge Özeti satırları, Altın Setup, Target önerisi, Asia/Stop/Zone/News cümleleri bu rozet/notu taşır; kesin bulgular önce sıralanır. Tilt "YÜKSEK" yalnızca istatistiksel olarak anlamlıysa (Wilson aralığı) verilir.

**Senkron ve hesap güvenliği:**
- Cihazdaki veri sahibi hesapla işaretlenir; çıkış yapmadan başka hesapla girilirse eski hesabın işlemleri/notları/prop hesapları yeni hesaba yüklenmez.
- Çıkışta prop hesapları da temizlenir; bekleyen bulut yazımları için 4 sn beklenir, kalan varsa uyarı gösterilir; çıkış sırasındaki "erişim reddedildi" bildirimleri susturuldu.
- Kullanıcı adı değişince Firebase kullanıcı nesnesi kopyalanmıyor (yöntemleri kayboluyor ve tüm bulut dinleyicileri yeniden kuruluyordu).
- Buluttaki not/günlük kayıtları okunurken onarılıyor (bozuk alan ekranı çökertmez); birleştirme güncel durumdan yapılıyor (eşzamanlı ekleme kaybolmaz).
- İlk sunucu okumasında bulutta olmayan yerel tanım listeleri ve prop hesapları buluta tamamlanıyor (diğer cihazlar da görür).
- Parite yazımı düzeltmesi buluta gerçekten geri yazılıyor (eski kapanış nedeniyle atlanıyordu).
- İşlem kaydı: görsel yükleme ve bulut yazımı arka planda; yavaş/çevrimdışı bağlantı formu kilitlemiyor. Görsel yükleme en fazla 2 dk dener.

**Stabilite:** Başarısız indirilen kod parçası önbellekte kalmıyor (tekrar denenir); yeni sürüm sonrası eski sekme kendini bir kez yeniliyor. Sunucu TradingView çözümlemesi yalnızca https görsel adresi döndürüyor.

**Testler:** kalite kademeleri, bulgu güveni, tilt eşiği, not/günlük onarımı.

## İşlem ekleme · Sonuç R
- Sonuç R kutusu küçültüldü (kutu 44px → 36px). İşaret, değer ve "R" tek okunuş olarak ortada (+2.5R): aynı boyut, aynı renk (R biraz soluk), alan genişliği yazılan değere göre ayarlanır; kutunun her yerine tıklamak alana odaklar.

## Temizlik ve tam kontrol turu
**Ölü kod:**
- Gelişmiş metrikler yalnızca ekranda gösterilenleri hesaplıyor (parite × seans matrisi, haftalık hacim). Gösterilmeyen SQN/Sharpe/iflas olasılığı/su altı süresi/Markov/faz/sağlamlık hesapları kaldırıldı.
- Detaylı Analiz'in gösterilmeyen hesapları (Kelly, Sortino, Sharpe, Z-skoru, seri bağımlılığı, sızıntı endeksi, gün/parite dökümleri) ve kullanılmayan kalite sınıflandırması silindi; sayılar test edilen `lib/deepMetrics.ts`'den.
- Strateji laboratuvarındaki gösterilmeyen "Hata & Sızıntı" hesabı, kullanılmayan `CustomComboBox`, `FilterSegment`, `ALL_SCOPE`, Sortino/Kelly fonksiyonları, eski giriş saati yardımcıları, metrik açıklamalarından 22 kullanılmayan kayıt, hiç açılmayan üç rapor penceresi ve iki ölü durum değişkeni, `toggle-item` CSS'i, Yedek panelindeki ölü dal kaldırıldı.
- `html2canvas` bağımlılığı kaldırıldı; `src/utils/canvasUtils.ts` boş (silinebilir).

**Yanlış gösterilen değerler:**
- "DD Toparlanma Süresi" her zaman 0, "Son 10" PF her zaman "Sonsuz" görünüyordu (değerler hiç hesaplanmıyordu) → gerçek hesap.
- "Son 10 İşlem Ortalaması" aslında sermaye eğrisinin hareketli ortalamasıydı → son 10 işlemin işlem başına R'si.
- Kayıp yokken PF "999.00" görünüyordu → ∞ (tek biçimlendirici `formatPF`).
- "Kârlı/Zararlı Gün" kartına tıklamak hiçbir şey açmıyordu → açıklama eklendi.
- Setup kalitesi kartlarında "a+" ve "A+" ayrı sayılıp biri kayboluyordu → harf farkı birleşir; varsayılan seçenekler A+ / A / B-C.
- Sıralamadaki "RR" ve "Net R" aynı sıralamayı veriyordu → "Ort. R" (işlem başına R). Tablolarda "RR" başlığı "R" oldu.
- Türkçe/İngilizce büyük harf: "STRATEJI", "TİMEFRAME" gibi yanlış harfler → tüm büyük harfli metinler kelime bazında doğru kurala göre (GİRİŞ, TIMEFRAME).

**Çıktılar:**
- PDF: rapor penceresinde gerçek "PDF / Yazdır" (A4 yatay, seçilebilir metin, sayfalara bölünen tablo). Önceden yalnızca PNG iniyordu.
- Rapor başlığı her zaman "Analiz Raporu"ydu → seçilen rapor (Haftalık / Aylık / Filtrelenmiş / Son N). Tarih aralığı gerçek tarihleri de gösterir; R değerleri 2 basamak, BE "0R".
- CSV: Türkçe Excel için ondalık virgül (2.5 → 2,5; önceden tarih/metin olarak açılıyordu), formül enjeksiyonuna karşı koruma, satır sonları korunur.
- Excel/CSV: aynı başlık verilen iki alan artık birbirini ezmiyor; özet sayfasında tarih aralığı, PF ∞; günlükte boş kayıt saati 1970 yazmıyor.
- JSON yedeğe Storage'a yüklenmiş işlem görselleri de gömülüyor; indirme bağlantısı erken iptal edilmiyor (boş dosya riski).
- Tanımlama içe aktarımı yalnızca bilinen başlıkları ve metin değerleri alıyor.

**Diğer:** Sistem bütünlüğü panelinde her satırın hesabı görünüyor ve kontrolün hesap seçiminden bağımsız olduğu yazıyor.

## Baş harfler ve son kontrol
**Her kelimenin ilk harfi büyük (tek kural: `titleCase`):**
- Tanım listeleri (Session, Strateji, Entry Model, Target, Confirmations, Trend, PD Array, Asia Range FVG, News Day…), form başlıkları, işlemdeki tüm tanım alanları, prop hesap / firma adları, not ve günlük başlıkları: "asia range" → "Asia Range", "giriş modeli" → "Giriş Modeli", "inverse fvg" → "Inverse FVG".
- Kasıtlı büyük harfler ve kısaltmalar korunur (FVG, iFVG, NY AM, A+, B-C, PD ARRAY, PDH / PDL); rakamla başlayanlar (5M, 10K) aynen kalır; Türkçe kurallı (ilk → İlk), bağlaçlar küçük (ve, vs, x).
- Eski kayıtlar okunurken düzelir (yerel, bulut, yedek); harf farkıyla tekrar eden tanımlar tek kalır. Eşleştirmeler harf duyarsız olduğu için hesap / filtre bağları kopmaz.
- Arayüzde küçük harfle kalan düğme ve etiketler (Yeni Hesap Ekle, Payout Ekle, Hızlı Kayıt, Çıkış Saati Ekle, Hesap Adı, Başlangıç Tarihi, Kapanmış Hesaplar, Bağlı Hesabı Yok, Tüm Prop Hesapları…) aynı biçime getirildi.

**Kontrol:** Ana panel ve detaylı analiz sayıları ham veriden bağımsız yeniden hesaplandı (Net R, WR, PF, beklenti, max DD, recovery factor) ve birebir tuttu. 1440 px ve 375 px genişlikte tüm sekmeler, strateji alt sekmeleri, form, işlem detayı, rapor ve hesap menüsü taşma / üst üste binme / kesilme için tarandı: sorun yok. Konsol hatası yok.

## Görseller Firestore'da (Firebase Storage kaldırıldı)
- Ücretsiz planda Storage açılamadığı için görseller artık Firestore'daki `images` koleksiyonunda: sıkıştırılmış (en fazla ~900 KB) data URL, kullanıcı başına ayrı belge. Kayıtlarda yalnızca `fsimg:<kimlik>` referansı tutulur (`lib/imageStore.ts`).
- Prop fotoğrafları ve sertifikalar eskisi gibi dosyadan eklenir; yazım beklenmez (çevrimdışı da çalışır), görseller önbellekli yüklenir (`StoredImage`, `useImageSrc`). Kaldırılan fotoğraflar buluttan da silinir; "Verileri sıfırla" tüm görselleri siler.
- İşlem grafikleri yalnızca link (TradingView vb.). Eski kayıtlardaki gömülü görseller görüntülenmeye devam eder; formda ham veri yerine "Kayıtlı görsel var" yazar, link yapıştırınca yerini alır. Detaydaki düğme "Grafik Linki Ekle" oldu.
- JSON yedek kayıtlı görselleri gömer; yedekten yüklemede gömülü görseller yeniden kaydedilir.
- `firestore.rules`: `images` koleksiyonu (yalnızca sahibi okur/siler; boyut ve alan denetimi). `firebase.json`, `storage.rules`, `storage.cors.json` ve Storage SDK kaldırıldı.
- Yayın: `firebase deploy --only firestore:rules,firestore:indexes`

## Asia Range + Sweep Time (Strateji kaldırıldı)
- İşlem formu: Strateji çipleri kaldırıldı. Yerine geniş, üç seçenekli **Asia Range** buton grubu (Range · Trend · Swept) ve Strateji'nin yerinde **Sweep Time** saat seçici (New York saati, "HH:mm"; saat ızgarası, 5'er dakika, ±1 dk ince ayar, temizle).
- Veri: işlemde `asiaRange` ('Range' | 'Trend' | 'Swept') ve `sweepTime` ("HH:mm", NY). Okurken onarılır (harf farkı, "2:05" → "02:05"), geçersiz değer düşer; Firestore kuralı iki alanı da denetler. Eski işlemlerdeki `strategy` değeri silinmez (düzenlemede de korunur), yalnızca hiçbir yerde gösterilmez.
- Strateji her yerden kaldırıldı: Tanımlamalar sekmesi, ayar listesi / bulut senkronu / yedek, global filtre, kıyaslama seçeneği, işlem detayı, dışa aktarma sütunu, Asia Edge Lab, kapsama ve eksik alan kontrolü.
- Analizler Asia Range'e geçti: Kurulum Karnesi varsayılanı (Asia Range · Seans · Giriş Modeli), Edge Özeti taraması, en iyi kombinasyon, işlem içgörüsü, haftalık özet, kombinasyon bulucu, Detaylı Analiz kurulum çipleri. Asia Edge Lab'e "Asia Range" ve "Sweep Time (NY, saatlik)" tabloları; global filtreye Asia Range seçimi; dışa aktarmaya Asia Range ve Sweep Time sütunları; Form Başlıkları'nda iki yeni başlık.
- Yayın: kural değişti → `firebase deploy --only firestore:rules,firestore:indexes`
- Sweep Time, Asia Range'den (Range / Trend / Swept) tamamen bağımsız bir alandır; hiçbir analizde birbirine bağlanmaz.
- Edge analizleri: Sweep Saati (NY, 30 dakikalık dönemler; Asia → London → NY sırası), Sweep → Giriş Gecikmesi (0–15 dk … 8 sa+; Asia'daki sweep → London/NY girişi gece yarısını aşsa da ölçülür) ve Setup Kalitesi; Kurulum Karnesi, Edge Özeti taraması ve kombinasyon bulucuda boyut olarak eklendi. Asia Edge Lab'de gecikme tablosu.
- Edge analizleri: İşlem Süresi (giriş → çıkış: <15 dk … 4 sa+) ve Hesap Aşaması (Phase 1 / Phase 2 / Funded) boyutları; Kurulum Karnesi, Edge Özeti, kombinasyon bulucu ve Asia Edge Lab tabloları.
- Edge analizleri: PD Array (confirmations alanı) Kurulum Karnesi ve Edge Özeti taramasına eklendi (önceden yalnızca Asia Edge Lab'de vardı).
- Excel dışa aktarımına **Edge Raporu** sayfası: her girdinin her değeri (Asia Range, Sweep Saati, Sweep → Giriş, Session, PD Array, Entry Model … Risk %) ve varsayılan kurulumlar; işlem, WR, net R, beklenti ve %95 aralığı, PF, hüküm (Kanıtlı Edge / Umut Verici / Zayıf / Sızıntı / Az Veri). Boyut adları Title Case (Session, Entry Model, Target, News Day).
- Yeni hesaplanan istatistikler (mevcut girdilerden): **Planlanan R:R** (TP ÷ Stop: < 1:1.5 … 1:4+), **Stop / Asia Range** (%), **Günün Kaçıncı İşlemi** (1. / 2. / 3.+, NY günü). Kurulum Karnesi, Edge Özeti, kombinasyon bulucu, Asia Edge Lab ve Excel Edge Raporu'nda.
- Yeni girdi: **İşlem Yönetimi** (Plana Göre / BE'ye Çekildi / Kısmi Kâr / Erken Kapatıldı, çoklu; "Plana Göre" tek başına) ve BE / erken kapanan / BE'ye çekilen işlemlerde **Çıkış Sonrası TP'ye Ulaştı mı?** (Evet / Hayır). Analiz: yönetim türüne göre edge, çıkış sonrası TP kıyası ve yönetimle kaçırılan R (planlanan R − gerçekleşen R). Detay, dışa aktarma, yedek ve Firestore kuralı güncellendi.
- Edge Özeti: giriş edge'i (işleme girmeden önce bilinen alanlar) ile **yönetim edge'i** (İşlem Yönetimi, Çıkış Sonrası TP, İşlem Süresi) ayrıldı; yönetim alanları artık "daha çok yap / bırak" önerisi üretmez, ayrı bölümde gösterilir. Çoklu karşılaştırma için olumlu bulgu eşiği yükseldi (kanıtlı değilse en az 2 × örneklem eşiği) ve taranan alan sayısıyla şans uyarısı eklendi. Excel Edge Raporu'na **Tür** sütunu (Giriş / Yönetim / Bağlam / Risk / Kurulum).
- **Edge'in zamanla değişimi:** Ana paneldeki Edge Durumu kartına son 20 işlem ↔ öncesi satırı (40 işlemden sonra açılır; farkın standart hatasıyla "Edge zayıflıyor / güçleniyor", az kanıtta "sinyal"). Kurulum Karnesi'nde 20+ işlemli kurulumlara "Son 10 ↑/↓" rozeti. Excel Edge Raporu'nda Zamanla Değişim satırları. Net R kartındaki tekrar eden Beklenti etiketi kaldırıldı (beklenti Edge Durumu kartında).
- **Birbirine bağlı alanlar:** Edge Özeti bulgusu başka bir alan değeriyle büyük ölçüde örtüşüyorsa (≥ %70 ve genel orandan belirgin yüksek) altında "%80'i Session: London" notu.
- Günün kaçıncı işlemi hesaplardan bağımsız, tüm işlemler üzerinden sayılır (hesap filtresi sırayı değiştirmez).
- Ana panel: Profit Factor kartı kaldırıldı (Detaylı Analiz'de var). **Edge Durumu** iki sütun genişliğinde: işlem başı beklenti, hüküm rozeti (Az Veri / Umut Verici / Kanıtlı Edge / Sızıntı …), kanıta ilerleme ve kısa açıklama; sağda gerçek beklentinin %95 aralığı (sıfır çizgisine göre görsel) ve son 20 ↔ önceki işlemler.
- **Kombinasyonlar:** Edge Özeti tüm giriş alanı çiftlerini otomatik tarar (≈190 çift); en az 10 işlemli ve tek başına alanlara göre en az 0,25R/işlem iyi ya da kötü olan birleşimlerden en iyi 3 / en kötü 3'ü gösterir (alanlardan biriyle aynı işlemleri kapsayan birleşimler atlanır). Excel Edge Raporu'nda Tür = Kombinasyon satırları.
- **Zorunlu alanlar:** Tanımlamalar > Zorunlu Alanlar sekmesi. Önerilen varsayılan: Asia Range, Sweep Time, Session, Entry Model, PD Array, Stop / TP / Asia Range pip, Setup Kalitesi, İşlem Yönetimi. Tam kayıtta eksikse kayıt durur ve eksikler listelenir; Hızlı Kayıt muaf. Ayar cihazda saklanır.
- **Prop risk önerisi:** Prop kartındaki Monte Carlo, aynı tohumla %0,25 … %2 risk seviyelerinde de çalışır; drawdown (statik / trailing) ve hedef hesabın kendi kurallarından. Değerlendirmede hesabı yakma olasılığı ≤ %15 iken geçme olasılığı en yüksek seviye, funded'da sonraki 20 işlemde ayakta kalma ≥ %90 olan en yüksek seviye önerilir.
- **Kurallarım:** Edge Özeti'nde kesinleşmiş bulgular (kanıtlı kurulum / alan / kombinasyon → AL, kesin sızıntı → ALMA); ALMA kurallarında son 7 günün ihlal sayısı ve R'ı.
- **Hedefe ulaşma süresi:** Edge Özeti'nde kazananların girişten çıkışa medyan ve %90 süresi (genel + en çok kazananı olan 5 kurulum), kaybedenlerin medyanıyla; en az 3 kazanan gerekir.
- **Prop günlük kayıp limiti:** Hesap formunda "Günlük Kayıp %" (isteğe bağlı). Simülasyon ve risk önerisi bunu uygular (gün başı bakiyeden; günlük işlem sayısı geçmişindeki medyandan).
- **Haftalık özet:** Disiplin bölümünde Kurallarım'daki ALMA kurallarının ihlalleri ("Kural: … alma"), yalnızca haftadan önceki işlemlerle kesinleşmiş kurallar.
- **Excel Edge Raporu:** Kurallar (AL / ALMA, son 7 gün ihlalleri) ve hedefe ulaşma süresi satırları.
- **Zorunlu alan ayarı buluta eşitlenir** (ayarlar belgesinde `requiredFields`; kural güncellendi).
- **Kural sonrası performans:** Her kuralın oluştuğu an cihazda saklanır; Kurallarım'da kural sonrası işlem sayısı ve R'ı gösterilir.
- Kontrol turu: sayı biçimi proje genelinde tek tip (ondalık nokta; R, %, PF), güven aralıkları her yerde "alt – üst" biçiminde; Edge Özeti'nde olumlu bulgu eşiği metni düzeltildi; prop risk önerisi, yakma ≤ %15 ve geçme olasılığı en yükseğe yakın seviyeler içinde hedefe en hızlı ulaşanı seçer (seviyelerin medyan işlem sayısı ipucunda); Zorunlu Alanlar açıklaması bulut eşitlemesine göre güncellendi.
- İşlem Yönetimi: "BE'ye Çekildi" → "BE Çekildi" (eski kayıtlar okunurken çevrilir); "Sonra TP'ye Gitti mi?" sorusu başlık satırında, kart uzamaz. İşlem detayı: İşlem Bağlamı tamamen ikili ızgara (Hesap da yarım genişlik; Çıkış Sonrası TP ayrı satır; MAE / MFE birlikte).
- Global filtre: Sweep Saati, Sweep → Giriş, Planlanan R:R, Stop / Asia Range, Günün İşlemi, İşlem Yönetimi (seçilenlerden herhangi biri), Çıkış Sonrası TP ve İşlem Süresi; değerler kurulum karnesiyle aynı tanımdan, doğal sıralarıyla. Kıyaslama sekmesi kurulum karnesinin tüm boyutlarını iki eksende de sunar (çoklu alanlar tek tek değerlere ayrılır).
- İşlem dışa aktarımına analizdeki türetilmiş değerler eklendi: Planlanan R:R, Stop / Asia Range (%), Sweep Saati (30 dk), Sweep → Giriş (dk), Günün İşlemi, Kaçırılan R.
- İşlem dışa aktarımı (Excel ve CSV): sütunlar mantıksal gruplarda (kimlik ve zaman → sonuç ve hesap → kurulum (form sırası) → pip ölçümleri → türetilmiş analiz değerleri → notlar); tüm girdiler ve türetilmiş değerler test ile güvence altında.
- Edge Özeti taraması ve ikili kombinasyonlara News Day eklendi (ör. "Swept + News Day: Yok"); örtüşme hesabında genel oranlar önbelleğe alındı (çok işlemde hız).
- Tutarlılık: vurgu rengi proje genelinde tek mavi (sky tonları ana mavi palete çekildi); etkileşim geçişleri 150–200 ms'de birleştirildi.
