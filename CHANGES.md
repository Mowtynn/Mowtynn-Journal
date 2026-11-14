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
- Satır satır analiz denetimi: **Veri Eksiği Panosu** artık formdaki her girdiyi form sırasıyla gösterir (Setup Kalitesi, Trend, Session, HTF, Entry TF, Target, Confirmations, İşlem Yönetimi, Çıkış Saati, Risk % eklendi). Yalnızca belirli işlemlerde sorulan alanlar kendi paydasıyla ölçülür (Çıkış Sonrası TP: BE / Erken Kapatıldı / BE Çekildi işlemleri; Risk %: hesaplı işlemler).
- **Asia Edge Lab kombinasyon bulucu** yalnızca girişten önce bilinen alanları birleştirir (İşlem Süresi ve İşlem Yönetimi çıkarıldı; Session, Trend, HTF, PD Array, Entry TF, Entry Model, Target, Confirmations, Asia Range FVG eklendi). Çoklu seçimli alanlar birleşik değer olarak sayılır; alanlardan birinin tüm işlemleriyle aynı olan birleşimler (ör. tek parite süzülmüşken "Parite + X") listelenmez.
- Yeni analiz boyutları: **Asia Range Büyüklüğü** (paritenin kendi medyanına göre Dar / Normal / Geniş), **Gün** ve **Giriş Saati (NY)**. Kurulum Karnesi, Kıyaslama, Edge Özeti taraması ve kombinasyonları, global filtre ve Excel Edge Raporu'nda.
- Günün İşlemi / Asia Range Büyüklüğü indeksi global filtreden önce kurulur (yeni eklenen işlem filtrede hemen doğru görünür).
- Strateji laboratuvarı: **MFE Yakalama** ve **Masada Kalan Kâr** aynı işlem kümesinden (MFE ve TP'si girilmiş kazananlar) hesaplanır; önceden tüm işlemlerin TP ortalaması kazananların MFE ortalamasına bölünüyordu. En İyi Kombinasyon açıklamasında eski "strateji" ifadesi Asia Range oldu; güven aralığı "alt – üst" biçiminde.
- **Kural Simülatörü** (Strateji laboratuvarı sekmesi): girişten önce bilinen alanlardan koşul seti kurulur (her koşul "Yalnızca" ya da "Hariç", çoklu değer). Kurala uyan işlemlerin beklentisi ve %95 aralığı, net R, kazanma oranı, maks. DD, vazgeçilen işlemlerin R'ı, tüm işlemlerle karşılaştırmalı sermaye eğrisi ve iki yarı testi. Koşullar cihazda hatırlanır.
- **Tesadüf Testi** (Edge Özeti): bulgular işlemlerin ilk yarısında aranır, görülmemiş ikinci yarıda sınanır (en az 40 işlem); Tuttu / Tutmadı / Az Veri ve genel tutma oranı. Kurallarım'daki her kurala "İki Yarıda Tutarlı" / "Şans Olabilir" rozeti. Excel Edge Raporu'nda Tesadüf Testi satırları ve kurallarda yarı sonucu.
- **Asia Range katı cinsinden hedef** (Asia Edge Lab): MFE ÷ Asia Range dağılımı, 0.5× … 2× range'e ulaşma oranları, medyan range katı ve TP'yi range'in k katına koyma simülasyonu (en yüksek beklentili kat vurgulanır).
- **Gün İçi Önceki İşlem** boyutu (Günün İlk İşlemi / Önceki Kazandı / Önceki Kaybetti / Önceki BE; NY günü, hesaplardan bağımsız): Asia Edge Lab tablosu, Kurulum Karnesi, Kıyaslama, Edge Özeti taraması ve kombinasyonları, global filtre, Excel raporu.
- Yazım: girdi ve özel isimler proje genelinde baş harfleri büyük (Entry Model, Stop Pip, TP Pip, MAE Pip, MFE Pip, News Day, Bank Holiday, Setup Kalitesi, İşlem Yönetimi, Çıkış Sonrası TP, Hesap Aşaması, Asia Range); Sistem Bütünlüğü eksik veri etiketleri dahil.
- Matematik denetimi: %95 güven aralığında t-değeri 30 üstü serbestlik derecesinde gerçek t dağılımıyla (önceden 31–60 arası sabit 2.0, 60 üstü 1.96: aralıklar olduğundan dar çıkıyordu ve bazı bulgular erken 'kanıtlı' sayılabiliyordu); Stop Tamponu aynı işlemler üzerinden (MAE ve stop'u girilmiş kazananlar); 'Kâr Faktörü çok yüksek' veri uyarısı yalnızca 20+ işlemde (kayıpsız ilk işlemlerde yanlış alarm veriyordu); Detaylı Analiz haftalık sermaye eğrisi ISO haftası (Pazartesi–Pazar, NY) ile, diğer haftalık hesaplarla aynı.
- Tasarım bütünlüğü: dekoratif vurgu renkleri (indigo, cyan, teal, violet, pembe, turuncu ikonlar) tek mavi vurguya çekildi; Strateji laboratuvarı sekmelerinin seçili hali tek tip. Anlam taşıyan renkler korundu (kazanç / kayıp, MAE turuncu / MFE camgöbeği, seans renkleri).
- **Performans (1000 işlemle ölçüldü):** Edge Özeti 520 → ~85 ms, Tesadüf Testi 200 → ~55 ms, Asia Edge Lab 220 → ~65 ms, Excel Edge Raporu 1.5 s → ~0.3 s, Detaylı Analiz metrikleri 160 → 3 ms, işlem sırası indeksi 126 → ~50 ms. Yöntem: NY saati ABD yaz saati kuralıyla aritmetik dönüşüm (Intl ile birebir aynı, 20.000+ anla test edildi); boyut değerleri işlem başına bir kez hesaplanır; ikili birleşim taraması sayısal kodlarla ve önce sayım; eşiğin altındaki birleşimlerin tam istatistiği hesaplanmaz; kombinasyon sıralaması toplamlar üzerinden, tam istatistik yalnızca gösterilen 12 için; saat × parite tek geçiş; News Day etiketi önbellekte; tarih etiketleri hazır biçimleyicilerle. Hesap sonuçları değişmedi (tüm testler aynı).
- İstatistik: P(Edge > 0) t dağılımıyla (küçük örneklemde normal dağılım fazla iyimserdi).
- Geçişler: kalan farklı süreler 150 / 300 ms standardına çekildi.
- **Bağımsız matematik doğrulaması** (tests/mathVerification.test.ts): temel formüller elle hesaplanmış örnekle (beklenti, örneklem std, t-tabanlı %95 aralık, Wilson aralığı, PF, drawdown, SQN); 'kanıt için gereken işlem' sayısının tam sınırda doğru olduğu; aynı ölçünün (net R, kazanma oranı, beklenti, PF, DD, SQN) ana panel, Detaylı Analiz, Asia Edge Lab, Strateji laboratuvarı ve Excel özetinde birebir aynı çıktığı; rastgele 7 / 60 / 250 işlemlik veride grupların toplamları koruduğu, aralıkların sıralı olduğu, ikili birleşim sayımlarının doğrudan sayımla aynı olduğu; zamanla değişim z değeri, disiplin toplamları, strateji alt tabloları ve prop simülasyonunun uç durumları. Uygulamada yeni hata çıkmadı.
- İşlem ekleme formu kaydırmasız: sıkı yerleşim artık 1080 piksele kadar olan pencere yüksekliklerinde devrede (önceden 860), çok kısa ekranlar (≤ 820 px) için çipler ve boşluklar biraz daha küçülür. 1366×768, 1440×900, 1920×950 / 1010 / 1080'de ve BE + BE Çekildi seçiliyken (ek soru açıkken) form tek ekrana sığıyor; yüksek ekranlarda görünüm değişmedi, telefonda yatay taşma yok.
- İşlem ekleme: Çıkış alanının yanındaki 'isteğe bağlı' yazısı kaldırıldı. İşlem detayı penceresi işlem ekleme penceresiyle aynı boyutta (aynı genişlik basamakları: 6xl / 7xl / 1440 px, ekranın %96'sı yükseklik, aynı kenar boşluğu); telefonda detay içeriği tek parça kayar (önceden sağ bölüm birkaç satıra sıkışıyordu).
- Gereksiz araç ipuçları kaldırıldı: ne işe yaradığı görünen düğmelerin (Hızlı Kayıt, Kapat, Düzenle, Sil, İndir, Önceki / Sonraki, Filtrele, hesap ve trend çipleri vb.) üzerine gelince çıkan açıklamalar ve başlığı tekrar eden etiket ipuçları silindi. Yalnızca simgeden oluşan düğmelerde açıklama ekran okuyucu için görünmez etikete taşındı. Bilgi taşıyan ipuçları korundu (güven aralığı açıklaması, kural ve yarı testi ayrıntıları, prop risk seviyesi olasılıkları, kısaltılan metnin tamamı).
- Strateji laboratuvarı sadeleşti (15 → 8 sekme): yeni araçlarla aynı soruyu güven aralığı olmadan cevaplayan Genel Bakış, Günlük Edge, Target & Confirmations, Likidite & Modeller, HTF / Entry TF & Saatler, A+ Kalite & Disiplin ve Parite & Hesap Türü kaldırıldı (karşılıkları: Edge Özeti, Kurulum Karnesi, Asia Edge Lab, Kıyaslama, Kural Simülatörü, Disiplin). Başka yerde olmayan 'Lehine 1R gidip kârsız kapanan işlemler' bulgusu MAE, MFE & Stop sekmesine taşındı (tıklanınca işlemler açılır). Laboratuvar artık Edge Özeti ile açılıyor.
- Detaylı Analiz sadeleşti: aynı sayfada iki kez gösterilen Setup Kalitesi bloğunun ikincisi (Setup Kalitesi Performansı) ve Haftalık İdeal İşlem Frekansı penceresi kaldırıldı (günlük işlem sınırı Disiplin'de ölçülüyor).
- **Ölü kod temizliği:** Kaldırılan laboratuvar sekmelerinin arka planda hâlâ çalışan hesapları silindi (strategyAnalytics 1143 → ~400 satır: giriş saati, trend, zaman dilimi matrisi, Target / Confirmations / PD Array sıralamaları, kalite, seans × yön, gün, parite, hesap türü, Altın Setup, Kırmızı Bayraklar, öneriler). Detaylı Analiz'de hiçbir yerde gösterilmeyen hesaplar (en büyük kazanç / kayıp, kalite sıralaması, parite × PD Array ısı matrisi, yön istatistikleri) ve haftalık işlem frekansı metriği kaldırıldı. Derleyici kullanılmayan değişken / import bulmuyor; kaynak dosyalarının hepsi kullanımda.
- **Az Veri uyarısı:** Detaylı Analiz'deki Session Performansı, Net Kazanç Gün Dağılımı ve Parite İstatistikleri satırlarında en az 5 işlemin altındaki gruplara "Az Veri" rozeti (laboratuvardaki örneklem eşiğiyle aynı).
- Kaldırıldı: Strateji laboratuvarındaki **Kıyaslama** sekmesi (Kurulum Karnesi'nde aynı iki alan seçilerek aynı gruplar güven aralığı ve hükümle görülüyor) ve Detaylı Analiz'deki **Performans Geçmişi** mum grafiği (Kümülatif R Eğrisi ve Takvim aynı bilgiyi veriyor) ile ona ait hesaplar, durumlar ve işlem penceresi. Laboratuvar 7 sekme. Bağımlılıkların hepsi kullanımda; derleyici kullanılmayan kod bulmuyor.
- Asia Edge Lab: Kombinasyon Bulucu ve üstteki Edge Özeti kartı kaldırıldı (Edge Özeti sekmesindeki doğrulamalı tarama ve ana paneldeki Edge kartı aynı işi yapıyor). Artık hiçbir yerde gösterilmeyen P(Edge > 0) ve Şu Anki DD alanları da hesaplamadan çıkarıldı.
- Tekrar eden tablolar kaldırıldı: Metrikler'deki Çok Boyutlu İşlem Matrisi (Kurulum Karnesi'nin güven aralıksız tekrarı), Asia Lab'deki Süpürülen Taraf (Long/Short ile aynı), Parite Bazında Edge ve Gün tabloları (Metrikler sayfasında zaten var).
- Fazlalık metrikler kaldırıldı: Asia Lab'deki 17 tek alanlı tablo (Kurulum Karnesi ve Edge Özeti aynı alanları güven aralığıyla gösteriyor; Yönetimle Kaçırılan R ayrı kart olarak kaldı), Detaylı Analiz'de SQN ve İşlem Başı Beklenti (Edge Durumu'nun tekrarı), Son 10 İşlem ortalaması ve Son 10 PF (gürültülü; Edge Kayması ve Kayan Beklenti kapsıyor).
- Laboratuvar başlığındaki WR / PF / Beklenti / Net R şeridi (aynı sayfanın üstünde var), Session Kör Nokta Matrisi (Saat × Parite ısı tablosu daha ince aynı bilgi) ve Maks. Kazanç / Maks. Kayıp kartları (sabit riskte bilgi taşımıyor) kaldırıldı; lib/advancedMetrics.ts silindi, nyIsoWeekKey tradingTime'a taşındı.
- Laboratuvar sekmeleri iş akışı sırasıyla (Edge Özeti → Kurulum Karnesi → Asia Edge Lab → MAE/MFE → Kural Simülatörü → Disiplin → Psikoloji) kart ızgarasında, kısa açıklamalı listelenir; seçilen sekme hatırlanır. Hedefe Ulaşma, TP ve Stop Daraltma simülatörleri MAE, MFE & Stop sekmesine taşındı. Psikoloji'de Maks. Win Serisi yerine Maks. Kayıp Serisi.
- Sekmeler artık açılıştan kısa süre sonra arka planda, gizli olarak sırayla hazırlanıyor (Detaylı Analiz → Günlük → Prop → Notlar); Detaylı Analiz'in iç parçaları (metrikler, laboratuvar) da önden indiriliyor. İlk geçişte 'Yükleniyor' görünmez.
- Risk yüzdeleri Tanımlamalar > Risk'ten ayarlanır (en fazla 5, 0–10 arası); işlem formundaki çipler bu listeden gelir, buluta ve yedeğe dahildir. Geçmiş işlemlerin riski değişmez.
- Stabilite: Strateji Laboratuvarı'nın her sekmesi ve pencereler (işlem formu, işlem detayı, filtre, tanımlamalar, giriş, yedekleme) ayrı hata sınırıyla korunuyor; birinde hata olursa uygulamanın geri kalanı çalışmaya devam eder. Kullanılmayan CSS kuralları silindi.
- Sağlamlık testi: bütün analiz motorları eksik/bozuk alanlı (NaN R, geçersiz saat, negatif stop vb.) 0–400 işlemle çalıştırılıyor; çökme ya da NaN yok.
- MAE ve MFE projeden tamamen kaldırıldı: işlem formu, işlem detayı (fiyat yolu), filtreler, Strateji Laboratuvarı (MAE/MFE kartları, TP / Stop Daraltma simülatörleri, Hedefe Ulaşma, Asia Range katı hedef), veri eksiği panosu, zorunlu alanlar ve Excel / CSV çıktıları. Eski kayıtlardaki MAE/MFE değerleri yüklenirken yok sayılır. 'MAE, MFE & Stop' sekmesi 'Stop & Range' oldu (stop mesafesi ve Asia Range genişliğine göre sonuçlar). Asia Range Pip formda Stop/TP ile aynı satıra taşındı.
- 'Asia Range FVG' başlığı her yerde 'Asia Range FVG (1H)' (form, filtre, tanımlamalar, karne, veri eksiği, zorunlu alanlar, Excel). Eski varsayılan başlık otomatik güncellenir; başlıklardaki zaman dilimi eki (1H, 15M…) artık silinmez.
- Akıcılık: Strateji Laboratuvarı'nda sekme değişimi çıkış animasyonunu beklemiyor (içerik anında değişir); sekmelerde iç içe çift giriş animasyonu kaldırıldı.
- Detaylı Analiz: Setup Kalitesi satır görünümüne geçti (etiket · kazanma oranı çubuğu · % · işlem sayısı); işlem sayısı arttıkça sıkışıp okunmaz hale gelmiyor. Ort. Kazanç / Ort. Kayıp kartları, R eğrisinin yüksekliğine uzayan sütundan alt metrik satırına taşındı; R eğrisi tam genişlik.
- Detaylı Analiz düzeni: üstte 3 özet kart (Kümülatif R · Long/Short · Sonuç Dağılımı); ortada R eğrisi (2/3) ve Setup Kalitesi (1/3) yan yana; R eğrisi sabit, dengeli yükseklikte.
- Detaylı Analiz yeniden sıralandı: (1) performans özeti 4 kart (Kümülatif R · Profit Factor · Ort. Kazanç · Ort. Kayıp), (2) R eğrisi + yanında risk kartları (Max Drawdown · Recovery Factor · DD Toparlanma), (3) dağılımlar (Sonuç · Long/Short · Setup Kalitesi), (4) takvim.
- Yerleşim: Detaylı Analiz dört odaklı bölüme ayrıldı (Genel Bakış · Takvim · Kırılımlar · Strateji Lab; seçim hatırlanır), sayfa tek uzun akış değil. Kırılımlar'da Session listesi ve parite kartları arasındaki zorunlu boşluklar kaldırıldı. 'Veritabanı ve Yedekleme' bloğu her sayfanın altından ayarlar menüsündeki 'Veri & Yedekleme' penceresine taşındı; sayfa altındaki tekrar eden 'Tanımlamaları Yönet' düğmesi kaldırıldı (ayarlar menüsünde var).

- Detaylı Analiz: alt sekme açıklamaları kaldırıldı, sekme etiketleri ortalandı; "Kırılımlar" → "Performans Dağılımı".
- Detaylı Analiz alt sekmeleri: ana sekme çubuğuyla aynı tasarım (kayan mavi gösterge, ok tuşlarıyla geçiş); açılan görünümler bağlı kalır, geri dönüş anında ve aynı giriş geçişiyle.
- Günlük (mobil): kayıt listesi 0 px yüksekliğe sıkışıp görünmüyordu; liste artık tüm alanı kullanır, açık kayıt varken yalnızca kayıt gösterilir.
- Strateji Lab: tekrarlayan başlık kaldırıldı; 7 sekme Detaylı Analiz sekme çubuğuyla aynı tasarımda (kayan gösterge, ok tuşları, açıklama ipucu olarak).
- Ana Panel: "Yeni Pozisyon Girişi Yap" tek buton (iç içe buton kaldırıldı), daha kompakt; mobilde tek satır.
- Strateji Lab: iç içe üçüncü kart çerçevesi kaldırıldı (mobilde içeriğe daha çok genişlik); Edge Özeti başlığındaki beklenti satırı dar ekranda taşmıyor.
- Üst başlık (mobil): "Trading Journal" tek satır, "by Mowtynn" yalnızca geniş ekranda; hesap seçicisine yer açıldı.
- Edge Özeti: Kurallarım / Tesadüf Testi / Kombinasyonlar / Yönetim Edge'i / Hedefe Ulaşma Süresi geniş ekranda ikişerli (sayfa ~%25 kısa).
- Asia Edge Lab: Kayan Beklenti ve Yönetimle Kaçırılan R yan yana en üstte, ardından Saat × Parite; Veri Eksiği Panosu (bakım aracı) en sona.
- Edge Özeti · Hedefe Ulaşma Süresi: satırlar dar ekranda alt satıra geçiyor (telefonda sayfa yana taşıyordu).
- Hesap düzeltmeleri (stratejiye uygun):
  - Stop & Range · Stop grupları: sabit 10/25 pip eşiği yerine her paritenin kendi medyan stop'una oran (Sıkı < 0.8×, Normal, Geniş > 1.25×); paritelerin medyan stop'u kartta yazılı. Paritesinde 5 stop birikmeyen işlem sınıflanmaz.
  - Psikoloji & Tilt: "kazanç/kayıp sonrası" artık yalnızca aynı NY günündeki sonraki işlem (eskiden ertesi günün işlemi de sayılıyordu); kazanma oranına ek olarak işlem başı R ve günün ilk işlemi kıyası. Seri metrikleri değişmedi.
  - Asia Range büyüklüğü: paritede 5 işlem birikmeden tüm paritelerin ortak medyanına düşülmüyor (yeni paritenin işlemleri yanlış "Geniş/Dar" sayılıyordu).
  - Veri Eksiği Panosu: kaldırılmış özelliklere (stop simülatörü, hedef tamamlama) yapılan atıflar düzeltildi.
- Denetim düzeltmeleri:
  - Güven aralığı: tüm sonuçları aynı olan küçük gruplarda (ör. 5 × −1R) sapma 0 çıkıp aralık tek noktaya çöküyordu; birkaç ardışık kayıp "kesin sızıntı / Alma kuralı" oluyordu. Aralık için 1R'lik temkinli sapma (≈7+ aynı sonuçta kesinleşir).
  - Disiplin · Normalden yüksek risk: eşik artık her hesabın kendi en sık riski (Phase 1 %1, Funded %0.5 gibi farklı riskler ihlal sayılmaz).
  - Prop: günlük kayıp limiti tanımlı hesaplarda geçmiş aşım tespit edilir (eskiden yalnızca max DD bakılıyordu); kartta uyarı, olasılık simülasyonu durur.
  - Asia Edge Lab veri seti adı: hesaba bağlı olmayan işlemler "Hesapsız / Demo" (eskiden "Live-Test / Demo").
- İkinci denetim:
  - Disiplin · Günlük işlem hakkı: sabit "günde en fazla 2 işlem" yerine kullanıcının kuralı — 1. işlem stop/BE → 2. hak, ilk iki işlem BE → 3. hak, kazanç günü kapatır (kazançtan sonra açılan işlem ihlal); üst sınır 3. Haftalık değerlendirme ve işlem detayı aynı kuralı kullanır.
  - Excel · "Süpürülen Asia Tarafı": her işleme yönden High/Low yazılıyordu; artık yalnızca Asia Range "Swept" işlemlerinde, diğerlerinde "-".
  - Excel · "Süpürülen Asia Tarafı": yalnızca Trend Yapısı Reversal olan işlemlerde yönden (short → High, long → Low); Continuation ve diğerlerinde "-" (Asia Range "Swept" alanından türetilmez).
- Sabit kurallar kaldırıldı (kullanıcı isteği: kurallar değişebilir, projede sabit kural olmayacak):
  - Strateji Lab · Disiplin sekmesi ("kurallara uysaydın" simülasyonu, işlem hakkı, günlük stop, düşük kalite, haber günü, yüksek risk ihlalleri) ve lib/discipline.ts tamamen silindi.
  - İşlem detayındaki Disiplin rozetleri kaldırıldı.
  - Haftalık değerlendirme: sabit kural ihlalleri kaldırıldı; yalnızca verinden çıkan Kurallarım (ALMA) eşleşmeleri gösterilir.
  - Setup Kalitesi renk kademesi lib/setupQuality.ts'e taşındı. Kurallarım (veriden) ve Kural Simülatörü (kullanıcının seçtiği koşullar) duruyor.
- Strateji uyumu:
  - Varsayılan kurulum tanımı: Asia Range · Trend (Continuation / Reversal) · Entry Model (eskiden Session; işlemler tek seansta alındığı için kurulumu ayırt etmiyordu). Edge Özeti, Kurallarım, Tesadüf Testi, haftalık değerlendirme ve işlem detayındaki kurulum geçmişi bu tanımı kullanır; Kurulum Karnesi'nde boyutlar yine seçilebilir.
  - Haftalık değerlendirme · Kurallarım: "kural yok" ile "kural var, uydun" ayrı yazılır; kurallar başlıklarıyla listelenir.
- Üçüncü denetim (alt sınırlar ve açıklamalar):
  - Ana Panel · Parite Başarı Analizi: en verimli / verimsiz parite yalnızca en az 5 işlemli pariteler arasından (1 işlemlik +3R parite "en verimli" olmuyor).
  - Ana Panel · Kazanma Oranı: "başabaş %" eklendi (Ort. Kayıp ÷ (Ort. Kazanç + Ort. Kayıp)); WR bunun üstündeyse yeşil. Edge Durumu kartında hükmün açıklaması görünür; aralık ve son 20 işlem başlıklarına açıklama. Tıklanmayan kartlardaki tıklanır imleç kaldırıldı.
  - Detaylı Analiz · Long/Short: net R ve R/işlem eklendi, 5 işlemden azı "Az Veri". Setup Kalitesi satırları: R/işlem sütunu, 5 işlemden azı soluk.
  - Metrik açıklamaları R tabanlı sisteme göre yeniden yazıldı (WR'de BE paydada, başabaş WR; Kümülatif R adı; Long/Short); kullanılmayan iki açıklama silindi.
  - Performans Dağılımı: gün satırlarında işlem sayısı ve WR; bölüm açıklamaları.
  - Edge Özeti: Risk %, News Day satırları 5 işlemden azsa soluk; işlemde kalma süresi en az 5 işlemle; Hedefe Ulaşma Süresi en az 10 kazananla (3 kazananda %90 = en uzun süre oluyordu); bölüm açıklamaları.
  - Stop & Range ve Psikoloji: 5 işlemden az gruplarda "Az Veri", bölüm açıklamaları.
  - Prop · Canlı R özeti: kartların açıklamaları artık görünüyor (önceden hiç gösterilmiyordu); 5 işlemden azsa "Az veri".
  - Isı haritası: en iyi / en kötü hücre yalnızca 5+ işlemli hücrelerden, sabit %40 WR şartı kaldırıldı; az veri hücreleri soluk.
  - PDF raporu: kazanma oranı rengi sabit %50 yerine başabaş kazanma oranına göre.
- Dördüncü denetim (bağımsız gözden geçirme bulgularıyla):
  - Başabaş kazanma oranı BE işlemleri hesaba katıyor (×(kazanç+kayıp)/tüm işlemler); önceden BE'li sistemlerde kârlı hesap "başabaşın altında" kırmızı görünebiliyordu. Ana Panel, PDF raporu ve açıklama.
  - Güven aralığı: 30 işlemin altındaki gruplarda sapma en az 1R alınır (−1, −1, −1, −1, −0.95R gibi neredeyse aynı 5 sonuç "kesin sızıntı / ALMA" olmuyor).
  - Edge Özeti: "Daha çok yap" ve AL kuralları artık geri kalan işlemlerden iyi olmayı şart koşar (kârlı sistemde ortalamanın altındaki büyük grup "AL" olmuyordu); satırlarda "geri kalandan ±R/işlem". Kombinasyon kuralının yönü fark yönüyle aynı olmalı. Tesadüf Testi'nde AL bulgusu ikinci yarıda geri kalandan iyi olmalı.
  - Asia Range büyüklüğü girişten önce bilinen haliyle: her işlem aynı veri setindeki aynı paritenin ÖNCEKİ range'lerinin medyanına göre (ilk 5 sınıflanmaz; sonraki işlemler eski etiketi değiştirmez). Gün içi sıra ve önceki işlem veri seti içinde (backtest / hesapsız prop'a karışmaz). Stop & Range ve Psikoloji, Kurulum Karnesi / Edge Özeti ile aynı etiketleri kullanır.
  - Prop: hesap kartı ve Canlı R özeti aynı 1R birimi (işlemlerdeki risk medyanı); simülasyonda günlük işlem sayısı hesap bazında; olasılık için en az 20 işlem.
  - Takvim: −0.0R gibi kayan nokta artıkları sıfır sayılır. Edge raporu: kayıpsız grupta PF ∞. Kurulum Karnesi "Son 10" erken sinyali "sinyal" etiketli ve soluk.
  - Detaylı Analiz kartlarında işlem sayıları; PF / Recovery 5 işlemden azsa "az veri"; DD Toparlanma düşüş sayısıyla. Asia Edge Lab min. örneklem 5'ten başlar.
  - Kurallarım · AL: kanıtlı kârlı olmanın yanında geri kalan işlemlerden %95 güvenle daha iyi olmayı şart koşar (işlemlerin çoğunu kapsayan, ortalamaya eşit gruplar — ör. "News Day: Yok" — AL kuralı olmuyor).
- Yeniden denetim düzeltmeleri:
  - Tesadüf Testi: ALMA bulgusu da ikinci yarıda hem kaybettirmeli hem geri kalandan kötü olmalı (zararlı tabanda kendiliğinden "Tuttu" olmuyordu).
  - Kurulum Karnesi · Önceliklendir: Edge Özeti ile aynı tanım (kârlı ve geri kalandan iyi); bölüm açıklamaları.
  - Edge Özeti · Daha çok yap: kurulumlar için de "fark henüz kesin değil" notu; "Kanıtlı" rozeti burada geri kalandan iyi olmanın kesinliğine göre.
  - Prop: kart başlığındaki R "≈ bakiye ÷ 1R" olarak işaretli; Canlı R özetindeki Net R "işlemlerin R toplamı" açıklamalı.
  - Asia Range büyüklüğü etiketleri "önceki medyan" olarak düzeltildi.
- Performans: Asia Range sınıflamasında her işlemde yeniden sıralama kaldırıldı (önceki değerler sıralı tutulup medyan doğrudan okunuyor; 5000 işlemde indeksleme 66 ms → 23 ms). Dayanıklılık testleri prop hesapları ve hedefe ulaşma süresini de kapsıyor.
- Tutarlılık turu (görünüm, hareket, dil):
  - Renk dili tek: vurgu mavi; yeşil/kırmızı yalnızca kazanç/kayıp ve yön; amber yalnızca uyarı / zayıf / hızlı kayıt / hesapsız. Dekoratif mor, turuncu, sarı ve rastgele renkli simgeler maviye çekildi (işlem detayı, filtre penceresi, analiz başlıkları, Asia Range pip alanı, prop kartları). Session etiketleri nötr; parite WR nötr, Net R yeşil/kırmızı. PDF raporu kartları uygulamadaki kartlarla aynı (nötr çerçeve, değer işarete göre renkli); BE her yerde gri.
  - Hesap rozeti tek kaynaktan: Challenge mavi, Funded yeşil, Hesapsız amber — işlem listesi, işlem geçmişi, işlem detayı ve formda aynı. Platform adı olmayan prop işlemi artık "Hesapsız" yazmıyor; detayda "Hesapsız HESAPSIZ" tekrarı kalktı.
  - Pencereler: tüm kapatma düğmeleri aynı (btn-icon, 16px simge); İşlem Geçmişi başlığı diğer pencerelerle aynı düzende; Veri & Yedekleme penceresi de diğerleri gibi açılıp kapanırken canlanıyor ve aynı katmanda. Satır içi vazgeç düğmelerinin erişilebilir adı "Vazgeç".
  - Detaylı Analiz başlıkları (Kümülatif R, Performans Dağılımı bölümleri) aynı simge kutusu + başlık stilinde; Strateji Lab'daki iç içe giriş animasyonu kaldırıldı. Gün çubuğundaki tanımsız renk düzeltildi.
  - Dil: arayüz metinleri, bildirimler ve onaylar tek hitapla ("sen"); "Trade" yerine "işlem". Günlük boş ekranı Notlar ile aynı (ilk günlüğü yaz düğmesi).
- Metrik denetimi (hesaplama ve analiz):
  - Ana Panel "Son 7 / 30 gün" ve tarih filtresi ("Son 1 hafta" …) uygulama günlerce açık kalınca donup kalıyordu; artık saat başı ilerliyor.
  - Kurallarım · "son 7 gün N ihlal" son işleme göre sayılıyordu (uzun aradan sonra haftalar önceki ihlaller "son 7 gün" görünüyordu); artık bugüne göre. Edge raporu da aynı.
  - Isı haritası: seans girilmemiş işlemler, başka işlemlerde seans varsa haritadan düşüyordu; artık "Belirtilmemiş" sütununda. Session Performansı'nda da aynı ad.
  - Prop: payout hesaptan çekilir ama girilen tutar net olduğu için hesaplanan bakiye ve max drawdown'a kalan payout'tan sonra olduğundan yüksek görünebiliyordu. Payout eklenince bakiye girme alanı açılır; payout'tan sonra bakiye girilmediyse kartta uyarı çıkar (fark yoksa da kontrol kaydedilir, uyarı kalkar).
  - Başabaş kazanma oranı Ana Panel ve PDF raporunda tek fonksiyondan (PDF'de 0R'lik WIN işlemlerde sonuç biraz farklı çıkabiliyordu).
  - İşlem Geçmişi penceresi: Net R eklendi; Long / Short WR yön rengiyle (yeşil / kırmızı) değil nötr gösteriliyor (düşük WR yeşil görünmesin).
  - 0R sonuçlar (seans, gün, günlük) yeşil "+0.00" yerine nötr "0.00"; işlem satırlarında R iki basamağa yuvarlanıyor; günlükte BE sayısı da görünüyor.
  - Tesadüf Testi açıklaması koddaki ölçütle aynı (ALMA bulgusu ikinci yarıda kaybettirmeli VE geri kalandan kötü olmalı).
- Zorlama testi (tests/fuzz.test.ts): tüm analiz fonksiyonları 0–140 işlemlik rastgele ve bozuk değerli (NaN, ∞, metin sayı, eksik alan) verilerle, birçok tohumla çalıştırılıyor; NaN / ∞ / hata üretmemeli, parçalar toplama eşit olmalı (karne satırları, kural simülatörü alınan + atlanan, haftalık günler, stop kovaları).
  - Bulunan hata: bozuk giriş zamanı (NaN) olan bir kayıt sermaye eğrisini, gün gruplamasını ve sıralamayı NaN ile bozuyordu; artık çıkış zamanı varsa ondan onarılıyor; yoksa kayıt analizlere ve gün sayacına girmiyor (Yedek Kurtarma'da görünür, buluta bozuk yazılmaz).
- Sınır testi (tests/stress.test.ts): 20.000 işlemde tüm analizler ~0.4 sn (Strateji Lab ~1 sn, prop simülasyonu ~25 ms); aynı kimlikli işlemler, yaz saati geçişleri, bozuk yedek ve bozuk prop hesapları çökme / NaN üretmiyor.
  - Bulunan hata: bozuk / elle düzenlenmiş kayıtta %100'ü aşan drawdown / hedef / risk yüzdesi drawdown tabanını eksiye itebiliyordu; artık 0–100 aralığına sıkıştırılıyor.
- Tek ekrana sığma ve küçük düzeltmeler:
  - İşlem detayı: teknik analiz görseli sağ sütunda notlardan kalan tüm alanı kaplıyor; notlar metin kadar (2–3 cümle) yer tutuyor, uzunsa kendi içinde kayıyor; Kurulum Geçmişi sol sütunun altına taşındı. Masaüstünde pencere kaydırma gerektirmiyor.
  - İşlem detayı · Çıkış Sonrası TP: soru sorulmayan işlemlerde (plana göre TP / stop; yönetim girilmişse) tire yerine "Erken Çıkılmadı" yazıyor. Soru BE, Erken Kapatıldı ve BE Çekildi işlemlerinde soruluyor; cevap girilmemişse tire kalır.
  - Detaylı Analiz · Genel Bakış: bölüm iç boşlukları biraz sıkılaştı, Kümülatif R eğrisi ekran yüksekliğine uyuyor (190–240px), risk kartları sütunu eşit paylaşıyor. ~875px ve üstü ekran yüksekliğinde sayfa kaydırmadan sığıyor.
  - Üst çubuktaki işlem sayısı rozeti: sayı her zaman tam ortada (sabit yükseklik, yazı tipi diğer metinlerle aynı).
- Bağımsız doğrulama turu (tests/properties.test.ts + canlı uygulamada ekran-hesap karşılaştırması):
  - Her temel metrik kütüphaneden bağımsız yazılmış ikinci bir hesapla karşılaştırılıyor: net R, WR, PF, ortalamalar, beklenti, başabaş WR, max drawdown (her zirve-dip çifti), kârlı / zararlı gün, t ve Wilson aralıkları, prop bakiyesi (statik / trailing taban, günlük limit), haftalık değerlendirme, NY gün / saat dönüşümü (Intl ile, yaz saati geçişleri dahil). Ayrıca: işlemler hangi sırayla saklanırsa saklansın tüm analizler aynı çıkmalı; R iki katına çıkınca / BE eklenince metrikler beklendiği gibi değişmeli.
  - Bulunan hata: aynı dakikaya girilmiş iki işlemde sıra, işlemlerin saklandığı (buluttan geldiği) sıraya bağlıydı; eğri, max drawdown, "günün kaçıncı işlemi" ve "önceki işlemin sonucu" yeniden yüklemede değişebiliyordu. Artık tek ortak sıralama var (giriş zamanı, eşitse kayıt sırası).
  - Seriler (Psikoloji & Tilt): BE artık nötr — seriyi bozmaz, seriye sayılmaz; kayıp serisi ancak kazançla biter (L L BE L L → 4). Eskiden aradaki BE seriyi kesip en kötü seriyi küçük gösteriyordu. Açıklama metnine eklendi.
  - İşlem detayı penceresi masaüstünde alanından 16px uzundu (arka katman hafifçe kayıyor, alt kenar ekrana yapışıyordu); yükseklik artık üst çubuğun altındaki alana tam oturuyor. Sol sütundaki satırlar biraz sıkılaştı: tam doldurulmuş işlemde de kaydırma yok.
  - Stop & Range kartlarında R değerleri diğer ekranlarla aynı biçimde (işaret + 2 basamak); Psikoloji kartlarındaki farklı yazı tipi düzeltildi.
  - Canlı kontrol: 80 işlemlik veriyle Ana Panel, Genel Bakış, Performans Dağılımı, Takvim, Isı Haritası, Kurulum Karnesi, Stop & Range, Psikoloji, Haftalık Değerlendirme, hesap kapsamları ve Prop kartındaki sayılar bağımsız hesapla birebir aynı. 5.000 işlemde sekme geçişleri < 150 ms (Edge Özeti ilk açılış ~0,5 sn, geliştirme derlemesinde); aşırı değerlerde (±6 haneli R, 3.000 karakter not, çok uzun adlar, 1970 / gelecek tarih) hiçbir ekranda NaN, taşma ya da hata yok.
- Görsel tutarlılık turu (80 işlemlik veriyle ekran ekran tarama):
  - Edge Durumu · Son 20 İşlem: hüküm ("Edge Güçleniyor" vb.) artık başlığın yanında kendi satırında, karşılaştırılan iki beklenti altında; hiçbir genişlikte kesilmiyor. Beklenti rengi sıfırda nötr.
  - Haftalık Değerlendirme: En İyi / En Kötü kurulumda ad kendi satırında tam yazıyor (R ve işlem sayısı üstte); Net R kutusunda geçen haftaya göre fark değerin yanında. Telefonda başlık alt satıra iniyor, gün şeridi tek ondalık; dar ekranda kesilen iki etiket artık kesilmiyor. Günlük sayfası kısa ekranlarda (768px) sayfayı 3px kaydırmıyor.
  - Tek ortak sayı biçimi (src/lib/format.ts): R her ekranda "+1.85R" (işaretli, iki ondalık, birim bitişik; "-0.00" yok), yüzde "%55.4", dolar "$55,517.50". Eskiden aynı değer ekrana göre "+1.85 R", "1.9R", "+1.9R" diye değişiyordu. Sıfır net R her yerde nötr renk.
  - Etiketler: "Başarı Oranı" → "Kazanma Oranı" (tek terim); yazdırma raporunda "NET R KAZANIMI" → "NET R", "55.4%" → "%55.4"; Kural Simülatörü'nde "Maks. DD" → "Max Drawdown" (eksi işaretli); "%80'i / %92'si / %100'ü" ekleri sayıya göre doğru.
  - Edge Özeti: uzun başlıklar kesilmek yerine alt satıra iniyor; kombinasyon satırları tek sütun. Kümülatif R grafiğinde eksen tarihleri genişliğe göre seçiliyor (baştaki tarihler artık görünüyor, yarım etiket yok).
  - Ortalama kazanç / kayıp kartı veri yokken "+0.00R" yerine "—".
- Ana panel üst satır + son tarama:
  - Net R ve Kazanma Oranı kartları: yandaki Edge Durumu kartı uzadığında başlığın altında tek büyük boşluk oluşuyordu. Artık başlık / değer / alt satır üç ayrı satır; fazla yükseklik aralarında eşit dağılıyor. Edge kartının kendisi de kısaldı: "30/30 işlem" sayacı ilerleme çubuğunun yanında, üst satır ikinci satıra taşmıyor.
  - Profit factor: aynı işlemler farklı sırayla toplandığında son basamaktaki kayan nokta farkı yüzünden tam sınırdaki değer (6.375) bazen 6.37, bazen 6.38 yuvarlanabiliyordu. Toplamlar bölmeden önce temizleniyor; sonuç sıradan bağımsız.
  - Rastgele veri testleri 22 yeni tohumla koşuldu; yukarıdaki dışında bulgu yok (bir test toleransı düzeltildi: ayrı ayrı yuvarlanan iki parçanın toplamı 0.01 oynayabilir).
- Dayanıklılık turu (olası hata senaryoları):
  - Giriş ekranı: tarayıcı depolamayı engellediğinde (gizli mod, çerez engeli) ya da kota dolduğunda doğru parola girilse bile giriş "bağlantı hatası"na düşebiliyor, depolama tamamen kapalıysa uygulama açılışta çökebiliyordu. Depolama erişimi artık hata fırlatmıyor; yazılamazsa anahtar oturum boyunca bellekte tutuluyor.
  - Veri & Yedek penceresindeki depolama ölçeri de aynı durumda pencereyi çökertmiyor.
  - Tüm testler beş farklı bilgisayar saat diliminde (İstanbul, Los Angeles, Tokyo, Kiritimati, New York) koşuldu: sonuçlar aynı; New York saati hesapları bilgisayarın saat dilimine bağlı değil. Bileşenlerdeki tarih kodu tarandı: hepsi NY duvar saatini kullanıyor.
  - Depolama / JSON okuma noktaları tarandı: korumasız okuma ya da yazma kalmadı.
- Görsel konfor turu (ekran görüntüsüyle, masaüstü 1348×863 ve telefon 375×812):
  - Genel Bakış: 863px yükseklikte 21px kaydırıyordu; risk sütunu sıkılaştı, eğrinin alt sınırı 160px. ~855px ve üstünde kaydırmadan sığıyor.
  - Stop & Range: başlık ile uzun yorum cümlesi aynı satıra sıkışıyordu. Başlık kendi satırında (iki bölümde de ikon), yorum kartların altında not kutusu; kartlarda net R üstte, "%56.3 WR · ort. +0.74R" altta.
  - Asia Edge Lab: "Yönetimle Kaçırılan R" kartı yandaki grafikle aynı boyda, rakam büyük ve önde, işlem başı ortalama eklendi; tarih "2026-11-11" yerine "11 Kas 2026"; değerler R birimiyle.
  - Psikoloji & Tilt: "1 Mağlubiyet / Galibiyet" → "1 Kayıp / Kazanç" (diğer ekranlardaki terim); seri yokken "0 -" yerine "—"; yorum cümlelerinin dili düzeltildi.
  - İşlem detayı · Hesap: "FUNDEDNEXT 50K · FUN…" + "FUNDED" rozeti yerine "FUNDEDNEXT 50K" + rozet (aşama iki kez yazılmıyor, ad kesilmiyor). İşlem listesinde hesap etiketi 1348px genişlikte kesilmiyor.
  - Kurulum Karnesi öncelik listesi: "+1.85R · 5" → "+1.85R · 5 işlem".
  - Telefon: üst çubukta başlık hesap seçiciye yapışıyordu (400px altında logo kutusu gizlenir); Prop kartında bakiye bloğu sağa yaslı; "payout − ücret" etiketi ve Canlı R açıklaması kesilmiyor; ana panelde "Negatif parite yok" kesilmiyor.
- Form sadeleştirme (kullanıcı isteği): projeden kaldırılan girdiler
  - Giriş / çıkış saati: formda yalnızca tarih (NY günü). Günün içindeki sıra kayıt anından gelir. İşlem listesi, işlem detayı ve yazdırma raporunda saat yazmıyor; işlem süresi ve "hedefe ulaşma süresi" analizleri kalktı.
  - Timeframe, Entry Timeframe, PD Array: form, filtre menüsü, Tanımlamalar, işlem detayı, Kurulum Karnesi / Edge Özeti / Kural Simülatörü boyutları ve Excel sütunları kaldırıldı. Depoda kalmış eski filtre seçimleri sıfırlanır.
  - İşlem Yönetimi: kaldırıldı. "Sonra TP'ye gitti mi?" sorusu artık yalnızca BREAKEVEN işlemde ("BE Sonrası TP'ye Gitti mi?"). Edge Özeti ve Asia Edge Lab'de "kaçırılan R" yerine BE işlemlerin sonradan TP'ye gitme oranı.
  - Stop Pip, TP Pip ve Planlanan R:R: kaldırıldı (Sonuç kartında yalnızca Asia Range Pip). Stop & Range ekranı "Asia Range" oldu (yalnızca range genişliği); Planlanan R:R, Stop / Asia Range karne boyutları ve işlem detayındaki Plan R:R kalktı.
  - Asia Range: formda yalnızca Range ve Trend. "Swept" eski kayıtlarda korunur, filtrede yalnızca öyle bir kayıt varsa görünür, eski kayıt düzenlenirken seçili gösterilir.
  - Saat × Parite ısı tablosu artık Sweep Saati × Parite (giriş saati tutulmadığı için).
  - Zorunlu alan listesinden kaldırılan alanlar çıktı. Eski işlemlerdeki değerler silinmedi; yalnızca formda ve analizlerde kullanılmıyor.
- Form sadeleştirme 2 + ölü kod temizliği:
  - Durum (Win / Loss / Breakeven) seçimi kalktı: Sonuç R'ye artı yazınca kazanç, eksi kayıp, 0 başabaş. Telefonda eksi tuşu olmayabileceği için alanın yanında tek dokunuşla işaret çeviren "±" düğmesi var. Sonuç R artık zorunlu (boş bırakılınca sessizce BE sayılmıyor). Kayıt 2 ondalıkla tutulur, durum yuvarlanmış değerden gelir.
  - "BE sonrası TP'ye gitti mi?" sorusu ve buna bağlı her şey kalktı (Edge Özeti ve Asia Edge Lab'deki oran, işlem detayı satırı, Karne / filtre boyutu, Excel sütunu, veri eksiği panosu).
  - Asia Range Pip kalktı: form, işlem detayı, zorunlu alan / eksik alan listeleri, filtre penceresindeki pip aralığı, Karne'deki Asia Range Büyüklüğü boyutu, Strateji Lab'deki "Asia Range" (genişlik) sekmesi ve Excel sütunu.
  - Ölü kod: önceki turda kaldırılan Timeframe, Entry Timeframe ve PD Array'in tanım listeleri (durum, bulut senkronu, yedek, Tanımlamalar), filtre durumu ve filtre mantığı tamamen silindi (filtre deposu v8: eski seçimler temizlenir). Kullanılmayan sabitler ve yardımcılar (varsayılan timeframe / PD Array listeleri, süre biçimi, giriş saati dilimi, işaretsiz R biçimi, eski kurulum etiketi, İşlem Yönetimi seçenek listesi) kaldırıldı; tarama sonunda hiç kullanılmayan dışa aktarım ya da dosya kalmadı.
  - Eski işlemlerdeki kaldırılmış alan değerleri silinmedi; yalnızca bozuk değer temizliği onları tanır (bulut kuralı uyumu için).


- İşlem ekleme ve işlem detayı yeniden tasarlandı
  - Form: Sonuç kartı Temel Bilgiler'in hemen altında; tek dokunuşla −1R / BE / +1R / +2R / +3R seçilebiliyor, hesaplı işlemde sonucun dolar karşılığı yanında görünüyor. Grafik linki ve notlar sağ sütunda birlikte. Alt çubukta kaydetmeden önce varlık · yön · R · dolar özeti.
  - İşlem detayı: üstte büyük sonuç kartı (R, Kazanç/Kayıp/Başabaş, hesap ve aşama, risk %, dolar etkisi); alanlar "Kurulum" ve "Giriş" diye iki gruba ayrıldı.

- R yuvarlama, Kurulum sütunu ve ölü kod
  - İşlem R'si tek ondalığa yuvarlanır (2.08 → 2.1, 2.04 → 2). Formda alandan çıkınca yuvarlanır, kaydedilecek değer kartta yazar; eski kayıtlar da yüklenirken aynı kuralla yuvarlanır (0'a inen küçük sonuç başabaş sayılır).
  - R her yerde gereksiz sıfırsız görünür: +2R, +2.1R, -1R, 0R (ortalamalar en çok iki ondalık).
  - Form: Sonuç kartı sütunun boyunu doldurur, altında boşluk kalmaz.
  - İşlem listesi ve işlem geçmişi: Sonuç (WIN/LOSS) sütunu R ile aynı bilgiyi verdiği için yerine Kurulum sütunu geldi (Setup Kalitesi rozeti + giriş modeli); başabaş R rozeti "BE".
  - İşlem detayı: başlıktaki WIN/LOSS rozeti kalktı (sonuç kartında var).
  - Performans Dağılımı: Session panelinin altına Entry Model ve Target sıralaması eklendi.
  - Ölü kod: dağılım sayfasındaki R'nin kopyası olan pnl alanı, detaydaki kullanılmayan durum değişkenleri ve ikonlar kaldırıldı; tarama sonunda kullanılmayan dosya, dışa aktarım ya da yerel değişken kalmadı.

- Sonuç girişi, Trend sütunu, geçişler ve POI Sweep Time
  - Sonuç R: büyük ve ortalı sayı alanı; solda Kazanç (+) / Kayıp (−) anahtarı, üstte durum (Kazanç / Kayıp / Başabaş / Girilmedi), altta kısa açıklama ve hesaplı işlemde dolar etkisi. "-" ya da "+" yazarak da yön seçilebilir.
  - İşlem listesi ve işlem geçmişi: Kurulum sütunu yerine Trend Yapısı (Continuation / Reversal).
  - Hızlı Kayıt aç / kapa: içerik kısa solup yeni düzende belirir, pencere yeni boyutuna tek hareketle oturur (eski 300 ms genişlik animasyonu ve her karede yeniden dizilme kalktı).
  - İşlem detayı: işlemler arası geçiş tek parça ve hızlı (~0.2 sn, kademesiz), renk geçişi kısaldı; dokunmatik ekranda yatay kaydırmayla önceki / sonraki işleme geçilir.
  - Sweep Time girdisinin adı POI Sweep Time oldu (kayıtlı eski varsayılan ad da yenilenir; özel ad verdiysen korunur).

- İşlem formu konfor turu
  - Kurulum: Confirmations, Entry Model'in yanına geçti; Target en altta tam genişlikte, seçenekler yan yana uzanır.
  - Sonuç R: giriş kutusu küçüldü (daha ince alan, daha küçük sayı); açıklama satırı yalnızca bilgi kattığında görünür. Renk geçişleri (kayıp ↔ kazanç ↔ breakeven) yumuşak ve yavaş. 0R "Breakeven" yazar (işlem detayında da).
  - Hızlı Kayıt: Sonuç kartı Temel Bilgiler'in boyunu doldurur, altta boşluk kalmaz.
  - Hesap seçimi: yatay kaydırmalı şerit yerine iki sütunlu, kendi içinde kayan ızgara (ad, bakiye, aşama); Hesapsız başlığın yanında. Kullanılmayan ScrollStrip bileşeni silindi.
  - Parite önerileri: form açılırken alan kendiliğinden odaklandığında açılmaz (açılış animasyonuyla çakışıp takılıyordu); tıklayınca, yazınca ya da ok tuşuyla açılır.
  - POI Sweep Time: saat seçmek dakikayı kendiliğinden seçmez; değer dakika da seçilince kaydedilir.
  - İşlem geçmişi: Trend rozetleri ikisi de mavi; Continuation'ın da ikonu var.

- Formda sabit pencere boyu ve Strateji Lab sekmeleri
  - Hesap seçimi sabit yükseklikte (iki satırlık alan, fazlası içinde kayar; hesap yoksa aynı boyda bilgi kutusu): hesap sayısı ya da seçim pencere boyunu değiştirmez.
  - Sonuç R: Girilmedi / Kazanç / Kayıp / Breakeven yazısı kaldırıldı; açıklama satırı hep yerinde ve tek satır, içerik değişince kart boyu oynamaz.
  - Strateji Lab: beş sekme satırı tam dolduruyor (eskiden altı sütunluk ızgarada sağda boşluk kalıyordu); telefonda tek kalan son sekme iki sütuna yayılır.

- Hesap alanı sadeleşti, Target altı boşluk
  - "Hesap" başlığı kaldırıldı; Hesapsız, prop hesaplarıyla aynı ızgarada ilk seçenek (alan yüksekliği yine sabit).
  - Kurulum kartı komşu sütunlardan kısa kaldığında boşluk bölümler arasına eşit dağılır; Target altında tek büyük boşluk kalmaz.

- Son düzenlemeler ve POI Sweep bütünlüğü
  - Hesap seçimi: Hesapsız prop hesaplarından sonra, en sonda.
  - Sonuç R: boşken açıklama metni yok (satırın yeri korunur, pencere boyu oynamaz).
  - Kurulum kartı: Setup Kalitesi / News Day / Asia Range bölümleri yeniden sıkı; artan boşluk yalnızca alttaki kurulum ızgarasının satırlarına dağılır.
  - POI Sweep adı her yerde: Detaylı Analiz (Asia Edge Lab ısı tablosu ve başlıkları, Kurulum Karnesi ve Edge Özeti boyutu, filtre), işlem detayı, Tanımlamalar ve Excel sütunu ("POI Sweep Saati (30 dk)").
  - Edge Özeti kural zamanları: eski "Sweep Saati" kayıtları yeni adla taşınır (ilk görülme zamanı korunur), kaldırılan girdilere (Entry TF, PD Array, Yönetim, Sweep→Giriş …) ait artık kayıtlar depodan silinir.
