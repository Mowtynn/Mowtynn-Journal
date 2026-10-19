# Trading Journal

React + Vite + Express + Firebase işlem günlüğü (Asia Range edge analizi dahil).

## Yerel çalıştırma
1. `npm install` (package-lock.json güncellenir; yeni halini commit et)
2. `.env.example` dosyasını `.env.local` olarak kopyala; `SITE_PASSWORD` ve `GEMINI_API_KEY` doldur
3. `npm run dev` (http://localhost:3000)

## Yayına alma
1. Firebase kuralları: `firebase deploy --only firestore:rules,firestore:indexes,storage`
2. Render: repo'yu bağla, `render.yaml` otomatik algılanır. `SITE_PASSWORD` ve `GEMINI_API_KEY` değişkenlerini panelden gir.
3. Firebase Console > Authentication > Settings > Authorized domains listesine yayın alan adını ekle (Google ile giriş için).
4. Kontrol: `npm run lint && npm run build`, ardından `/api/health` 200 dönmeli.

## Notlar
- `firebase-applet-config.json` içindeki web apiKey gizli değildir; koruma Firestore/Storage kurallarıdır.
- Sunucu sırları (SITE_PASSWORD, GEMINI_API_KEY) asla repoya girmez (`.env*` gitignore'da).
