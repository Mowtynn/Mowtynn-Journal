# Trading Journal

React + Vite + Express + Firebase işlem günlüğü (Asia Range edge analizi dahil).

## Yerel çalıştırma
1. `npm install` (package-lock.json güncellenir; yeni halini commit et)
2. `.env.example` dosyasını `.env.local` (veya `.env`) olarak kopyala; `SITE_PASSWORD` doldur. Sunucu bu dosyayı otomatik yükler.
3. `npm run dev` (http://localhost:3000)

## Testler
- `npm test`: hesaplama testleri (istatistikler, prop bakiyesi/drawdown, filtreler, veri modeli, bütünlük kuralları). Node 22+ gerekir; ek paket yok (`node:test` + `tsx`).
- `npm run lint`: tip denetimi + testler. Bir hesaplama formülü değişirse burada kırmızıya döner.

## Yayına alma
1. Firebase kuralları ve indeksler: `firebase deploy --only firestore:rules,firestore:indexes,storage`
2. Storage CORS (yedeğe prop fotoğraflarının gömülebilmesi için, bir kez): `gsutil cors set storage.cors.json gs://gen-lang-client-0855080637.firebasestorage.app`
3. Render: repo'yu bağla, `render.yaml` otomatik algılanır. Ortam değişkenleri: `SITE_PASSWORD` (zorunlu), `TOKEN_SECRET` (isteğe bağlı). Başka değişken gerekmez.
4. Firebase Console > Authentication > Settings > Authorized domains listesine yayın alan adını ekle (Google ile giriş için).
5. Kontrol: `npm run lint && npm run build` (lint testleri de çalıştırır), ardından `/api/health` 200 dönmeli.

## Notlar
- `firebase-applet-config.json` içindeki web apiKey gizli değildir; koruma Firestore/Storage kurallarıdır.
- Sunucu sırları (SITE_PASSWORD, TOKEN_SECRET) asla repoya girmez (`.env*` gitignore'da).

## Veri ve senkron davranışı
- Giriş yapılmamışken (misafir) veriler yalnızca bu tarayıcıda durur; ilk girişte o hesaba aktarılır.
- Cihazdaki veri, sahibi olan hesapla işaretlenir. Çıkış yapmadan başka hesapla girilirse eski hesabın verisi yeni hesaba aktarılmaz, cihazdan temizlenir.
- Çıkışta buluta henüz ulaşmamış değişiklikler için kısa süre beklenir; çevrimdışıysa aynı hesapla tekrar girince gönderilir.
- Yeni sürüm yayınlandığında açık sekme eksik kod parçasıyla karşılaşırsa kendini bir kez yeniler.
