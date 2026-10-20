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
