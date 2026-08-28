import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

async function startServer() {
  const handleGeminiError = (err: any) => {
    let errMsg = "";
    if (typeof err === "string") {
      errMsg = err;
    } else if (err instanceof Error) {
      errMsg = err.message;
    } else if (err && typeof err === "object") {
      try {
        errMsg = JSON.stringify(err);
      } catch (e) {
        errMsg = String(err);
      }
    } else {
      errMsg = String(err);
    }
    
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
      return "Gemini AI sunucuları şu anda yoğun. Lütfen kısa bir süre sonra tekrar deneyin.";
    }
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      return "AI günlük işlem limiti aşıldı. Lütfen daha sonra tekrar deneyin veya Ayarlar > Secrets panelinden yeni bir API anahtarı ekleyin.";
    }
    if (errMsg.includes('401') || errMsg.includes('UNAUTHENTICATED') || errMsg.includes('invalid authentication credentials')) {
      return "Geçersiz Gemini API anahtarı. Lütfen Ayarlar > Secrets panelinden geçerli bir Google AI Studio API anahtarı ekleyin.";
    }
    return errMsg;
  };
  const app = express();
  
  app.use(compression({
    threshold: 1024, // only compress responses above 1KB
  }));

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }));
  
  const httpServer = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Extract all configured Gemini API keys (supports GEMINI_API_KEY, GEMINI_API_KEY_1..10, GEMINI_API_KEYS)
  const getGeminiKeys = (): string[] => {
    const keys: string[] = [];
    const addKey = (raw?: string) => {
      if (!raw) return;
      const parts = raw.split(",").map((k) => k.trim()).filter(Boolean);
      for (const p of parts) {
        if (p && !keys.includes(p)) {
          keys.push(p);
        }
      }
    };
    addKey(process.env.GEMINI_API_KEY);
    addKey(process.env.GEMINI_API_KEY_1);
    addKey(process.env.GEMINI_API_KEY_2);
    addKey(process.env.GEMINI_API_KEY_3);
    addKey(process.env.GEMINI_API_KEY_4);
    addKey(process.env.GEMINI_API_KEY_5);
    addKey(process.env.GEMINI_API_KEYS);
    for (let i = 6; i <= 10; i++) {
      addKey(process.env[`GEMINI_API_KEY_${i}`]);
    }
    return keys;
  };

  // Get active Gemini model from env (Render / process.env) or default to 'gemini-3.7-flash'
  const getGeminiModelName = (): string => {
    const customModel = process.env.GEMINI_MODEL_NAME?.trim();
    return customModel || "gemini-3.7-flash";
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Multi-API Gemini Executor (Tek Model, Çoklu API Key Rotasyonu, Yedek Model Yok)
  const callAiWithFallback = async (
    geminiFn: (ai: GoogleGenAI, modelName: string) => Promise<any>
  ): Promise<{ text: string }> => {
    const geminiKeys = getGeminiKeys();
    const keysToTry = geminiKeys.length > 0 ? geminiKeys : [process.env.GEMINI_API_KEY || ""];
    const modelName = getGeminiModelName();

    let lastError: any = null;

    for (let i = 0; i < keysToTry.length; i++) {
      const apiKey = keysToTry[i];

      try {
        const clientConfig: any = {
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        };
        if (apiKey && apiKey.trim()) {
          clientConfig.apiKey = apiKey.trim();
        }

        console.log(`[Gemini API] Kullanılan Model: ${modelName} | Key #${i + 1} deneniyor...`);
        const ai = new GoogleGenAI(clientConfig);
        const result = await geminiFn(ai, modelName);
        const outputText = typeof result?.text === "string" ? result.text : (result?.text?.() || "");

        if (outputText && outputText.trim().length > 0) {
          console.log(`[Gemini API] Kullanılan Model: ${modelName} | Key #${i + 1} ile BAŞARILI yanıt alındı!`);
          return { text: outputText };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini API] Kullanılan Model: ${modelName} | Key #${i + 1} başarısız:`, errMsg);

        if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          await sleep(250);
        }
      }
    }

    throw lastError || new Error("Tanımlı tüm API anahtarları denendi fakat yanıt alınamadı. Lütfen daha sonra tekrar deneyin.");
  };

  // Password Verification Rate Limiter
  const passwordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Çok fazla başarısız deneme yapıldı. Güvenlik nedeniyle 15 dakika bekleyin." },
  });

  // Strict Site Authentication Middleware for all sensitive APIs
  const requireSiteAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sitePassword = process.env.SITE_PASSWORD;
    if (!sitePassword) {
      return res.status(500).json({ error: "Sistem parolası yapılandırılmamış (SITE_PASSWORD)." });
    }
    const expectedToken = crypto.createHash('sha256').update(sitePassword).digest('hex');
    const headerToken = req.headers['x-site-token'] || 
      (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '') ||
      (req.query.site_token as string) ||
      (req.query.token as string);

    if (!headerToken || headerToken !== expectedToken) {
      return res.status(401).json({ error: "Erişim Engellendi: Geçerli site erişim jetonu gereklidir." });
    }
    next();
  };

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", geminiConfigured: getGeminiKeys().length > 0 });
  });

  // Password Verification Endpoint
  app.post("/api/verify-password", passwordRateLimiter, express.json(), (req, res) => {
    try {
      const { password } = req.body;
      
      const sitePassword = process.env.SITE_PASSWORD;
      
      if (!sitePassword) {
         return res.status(500).json({ success: false, error: "Sistem parolası yapılandırılmamış. Lütfen ayarlardan SITE_PASSWORD değişkenini ekleyin." });
      }
      
      if (password === sitePassword) {
        // Return a dynamic token based on the current site password
        const dynamicToken = crypto.createHash('sha256').update(sitePassword).digest('hex');
        res.json({ 
          success: true, 
          token: dynamicToken
        });
      } else {
        res.status(401).json({ success: false, error: "Invalid password" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // Token Verification Endpoint (for dynamic session invalidation)
  app.post("/api/verify-token", express.json(), (req, res) => {
    try {
      const { token } = req.body;
      const sitePassword = process.env.SITE_PASSWORD;
      
      if (!sitePassword) {
         return res.json({ success: false });
      }
      
      const expectedToken = crypto.createHash('sha256').update(sitePassword).digest('hex');
      
      if (token === expectedToken) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });

  // Live Stock Prices Proxy Endpoint (BİST & US Stocks)
  app.get("/api/stock-prices", requireSiteAuth, async (req, res) => {
    try {
      const rawSymbols = String(req.query.symbols || "").trim();
      if (!rawSymbols) {
        return res.json({ prices: {} });
      }
      const symbolsList = rawSymbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
      const prices: Record<string, number> = {};

      await Promise.all(symbolsList.map(async (sym) => {
        let candidates = [sym];

        if (['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'BNB', 'DOGE', 'ADA', 'DOT', 'MATIC'].includes(sym)) {
          candidates = [`${sym}-USD`];
        } else if (['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'].includes(sym)) {
          candidates = [`${sym}TRY=X`, `${sym}=X`];
        } else if (sym === 'USD') {
          candidates = [`TRY=X`];
        } else if (['GRAMALTIN', 'XAU', 'ONS', 'CEYREK', 'YARIM', 'TAM', 'ZIYNET'].includes(sym)) {
          candidates = ['GC=F'];
        } else if (sym === 'XAG' || sym === 'GUMUS') {
          candidates = ['SI=F'];
        } else {
          if (!sym.includes(".")) {
             candidates = [`${sym}.IS`, sym];
          }
        }
        
        for (const candidate of candidates) {
          try {
            const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?interval=1d&range=1d`, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            });
            if (yRes.ok) {
              const data = await yRes.json();
              const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
              if (typeof price === "number" && price > 0) {
                prices[sym] = price;
                break;
              }
            }
          } catch(e) {
            // continue
          }
        }
      }));

      // Post-process Gold and Silver to convert from USD Ounce to TRY Gram
      const goldAndSilver = ['GRAMALTIN', 'CEYREK', 'YARIM', 'TAM', 'ZIYNET', 'GUMUS'];
      const presentMetals = symbolsList.filter(s => goldAndSilver.includes(s) && prices[s]);

      if (presentMetals.length > 0) {
          try {
             const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/TRY=X?interval=1d&range=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
             const data = await yRes.json();
             const usdTry = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
             
             if (usdTry) {
                 presentMetals.forEach(sym => {
                     const usdOunce = prices[sym];
                     const tryGram = (usdOunce / 31.1034768) * usdTry;
                     
                     if (sym === 'GRAMALTIN') prices[sym] = tryGram;
                     else if (sym === 'CEYREK') prices[sym] = tryGram * 1.64;
                     else if (sym === 'YARIM') prices[sym] = tryGram * 3.28;
                     else if (sym === 'TAM' || sym === 'ZIYNET') prices[sym] = tryGram * 6.56;
                     else if (sym === 'GUMUS') prices[sym] = tryGram;
                 });
             }
          } catch(e) {}
      }

      res.json({ prices });
    } catch(err: any) {
      console.error("Stock Prices Endpoint Error:", err);
      res.status(500).json({ error: "Fiyatlar çekilemedi" });
    }
  });

  // Text-To-Speech Audio Proxy Endpoint (High-reliability voice streaming)
  app.get("/api/tts", requireSiteAuth, async (req, res) => {
    try {
      const text = String(req.query.text || "").trim();
      if (!text) {
        return res.status(400).send("Text parameter required");
      }
      // Limit chunk length to 200 chars for Google Translate TTS
      const truncatedText = text.slice(0, 200);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncatedText)}&tl=tr&client=tw-ob`;

      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        return res.status(502).send("TTS upstream error");
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err: any) {
      console.error("TTS Proxy Error:", err);
      res.status(500).send("TTS Error");
    }
  });

  // AI Co-Pilot & Mentor API Route
  app.post("/api/copilot", requireSiteAuth, async (req, res) => {
    try {
      const { prompt, mode, tradesData, statsData, chatHistory, imageData, persona, preTradeData, healthMetrics, certificatesData, notesData, journalsData, behavioralTraps, journalSentimentStats } = req.body;

      if (getGeminiKeys().length === 0 && !process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY tanımlanmamış. Lütfen API anahtarınızı Secrets panelinden tanımlayın.",
        });
      }


      let personaInstruction = "";
      if (persona === "disciplined_risk") {
        personaInstruction = `Karakterin: Disiplinli Risk Yöneticisi (Strict Risk Manager).
Ses tonun: Ciddi, rasyonel, analitik ve son derece net.
Sermaye korumayı her şeyin önünde tutarsın. Pozisyon büyüklüğü, stop loss disiplini ve gerçekçi Risk/Ödül (R/R) oranlarına inanılmaz derecede odaklanırsın. Risk kurallarını ihlal eden (örn. yüksek kaldıraç, kontrolsüz risk, stop taşımama) her hareketi disiplinli ve sert ama yapıcı bir şekilde eleştirirsin.`;
      } else if (persona === "zen_psychologist") {
        personaInstruction = `Karakterin: Zen Trading Psikoloğu (Zen Psychology Coach).
Ses tonun: Sakin, bilge, anlayışlı, meditatif ve felsefi.
Teknik seviyelerden ziyade tüccarın zihinsel durumuna, duygusal kontrolüne, açgözlülük, kaybetme korkusu, FOMO (fırsatı kaçırma korkusu), intikam ticareti (revenge trading) ve aşırı işlem yapma (overtrading) eğilimlerine odaklanırsın. Meditasyon, nefes kontrolü ve sabır tavsiye edersin.`;
      } else if (persona === "technical_analyst") {
        personaInstruction = `Karakterin: Teknik Strateji Uzmanı (Technical Specialist).
Ses tonun: Profesyonel, son derece teknik, mantıklı ve terminolojiye (jargona) hakim.
Fiyat hareketleri (Price Action), Market Yapısı (MS/MSS), Adil Değer Boşlukları (FVG), Sipariş Blokları (Order Block), Likidite seviyeleri ve Yüksek Zaman Dilimi (HTF) hizalanmalarına aşırı odaklanırsın. Grafik yapılarını kusursuz analiz eder ve teknik argümanlarla konuşursun.`;
      } else if (persona === "prop_firm") {
        personaInstruction = `Karakterin: Fon Şirketi Değerlendiricisi (Prop Firm Evaluator).
Ses tonun: Son derece profesyonel, talepkar, mesafeli ve profesyonel standartlara bağlı.
Kullanıcının profesyonel bir portföy yöneticisi veya fon trader'ı olup olamayacağını test edersin. Günlük maksimum kayıp limitleri, tutarlılık kuralları, drawdown yönetimi ve istikrarlı getiri hedefleri konularında acımasız ve gerçekçisindir. Standartların çok yüksektir.`;
      } else {
        personaInstruction = `Karakterin: Dengeli AI Co-Pilot & Mentör.
Ses tonun: Sempatik, yapıcı, objektif ve deneyimli.
Hem teknik analiz, hem risk yönetimi hem de trading psikolojisi konularını dengeli bir şekilde harmanlayarak rehberlik edersin.`;
      }

      const systemInstruction = `Sen dünya çapında deneyimli, disiplinli, objektif ve sempatik bir 'Trading Psikolojisi, Risk Yönetimi ve Grafik Desen Analisti Co-Pilot / Mentörü'sün.
Kullanıcının dilinde (Türkçe) konuşacaksın.
Senin amacın tüccarın (trader) duygusal hatalar yapmasını engellemek, istatistiklerini objektif analiz etmek, grafik ekran görüntülerini incelemek ve ona somut, uygulanabilir tavsiyeler sunmaktır.

[MENTÖRÜN AKTİF KARAKTERİ / ROLÜ]
${personaInstruction}

Aşağıda kullanıcının güncel işlem geçmişi özet istatistikleri ve ham verileri bulunuyor:
[SAĞLIK & DİSİPLİN METRİKLERİ]
Skor: ${healthMetrics?.score || 0}/100 (${healthMetrics?.label || 'Bilinmiyor'})
Arka Arkaya Maks. Kayıp (Max Loss Streak): ${healthMetrics?.maxLossStreak || 0}
Sıcaklık Haritası (Davranışsal Tuzaklar): ${JSON.stringify(behavioralTraps || {})}
Günlük Duygu Durumu İstatistikleri: ${JSON.stringify(journalSentimentStats || {})}

[ÖZET İSTATİSTİKLER]
- Toplam İşlem Sayısı: ${statsData?.totalTrades || 0}
- Kazanan İşlem Sayısı: ${statsData?.winningTrades || 0}
- Kaybeden İşlem Sayısı: ${statsData?.losingTrades || 0}
- Başarı Oranı (Win Rate): %${Number(statsData?.winRate || 0).toFixed(1)}
- Net Kâr/Zarar (PnL): ${statsData?.netPnl || 0}
- Net Risk/Ödül (R): ${statsData?.netR || 0}
- Kar Faktörü (Profit Factor): ${statsData?.profitFactor || 0}
- Ortalama Kazanç R: ${statsData?.averageWinRR || 0} R
- Ortalama Kayıp R: ${statsData?.averageLossRR || 0} R
- En Büyük Kazanç: ${statsData?.largestWin || 0}
- En Büyük Kayıp: ${statsData?.largestLoss || 0}

[İŞLEM ÖRNEKLERİ / DETAYLARI]
${JSON.stringify(tradesData || [], null, 2).slice(0, 50000)}

[GÜNLÜK YAZILARI (JOURNAL)]
${JSON.stringify(journalsData || [], null, 2).slice(0, 10000)}

[SERTİFİKALAR VE PAYOUTLAR (CERTIFICATES)]
${JSON.stringify(certificatesData || [], null, 2).slice(0, 5000)}

[NOTLAR (NOTES)]
${JSON.stringify(notesData || [], null, 2).slice(0, 10000)}

Kurallar ve Tarz:
1. Eğer kullanıcı bir grafik/ekran görüntüsü gönderdiyse:
   - Grafik üzerindeki yapıyı (Destek/Direnç, Trend, Order Block, Likidite, FVG, Formasyonlar vb.) incele.
   - Giriş (Entry), Stop Loss (SL) ve Take Profit (TP) seviyelerinin mantıklı olup olmadığını değerlendir.
   - Risk/Ödül oranını ve olası tuzakları belirt.
2. Yanıtlarını net, göz alıcı ve okunabilir biçimde ver. Başlıklar (Markdown), maddeler ve öne çıkan ipuçları kullan.
3. Kesinlikle boş ya da jenerik yatırım tavsiyesi yapma. Verilere ve grafiklere dayanarak konuş.
4. Eğer üst üste kayıp varsa veya kayıp miktarı büyükse disiplin/psikoloji uyarısı yap (örn: FOMO, intikam ticareti, stop taşımama).
5. Yapıcı ve cesaretlendirici ol, ama disiplinsizliği net bir dille uyar.
6. Sorulan sorulara net, doğru ve doğrudan yanıt ver. Yanıtlarında gereksiz laf kalabalığı yapma, boşluk dolduran cümleler (filler text) kullanma.
7. Türkçe yazım kurallarına (noktalama, büyük-küçük harf, kelime yazılışları) kesinlikle dikkat et, metinde yazım hatası yapma.
8. DİKKAT: Metinlerinde KESİNLİKLE Markdown tablosu kullanma (örn. | Metrik | Değer | formatı YASAKTIR). Tablolar arayüzde bozuk görünmektedir. Metrikleri ve verileri her zaman kalın yazılmış başlıklar ve madde işaretli listeler (bullet points) halinde alt alta ver.`;

      let userPrompt = prompt || "İşlem geçmişimi ve gönderdiğim verileri incele ve bana mentör tavsiyesi ver.";

      if (mode === "quick_analysis") {
        userPrompt = "Mevcut işlem verilerimi genel olarak değerlendir. Win Rate, Kar/Zarar oranı ve işlem sıklığıma göre en önemli tespitlerini ve mentör tavsiyelerini sun.";
      } else if (mode === "risk_check") {
        userPrompt = "İşlemlerimdeki risk yönetimi, R-faktör uyumu ve olası arka arkaya kayıp (drawdown) risklerini tara. Disiplin ve risk kontrolü açısından kritik uyarılarda bulun.";
      } else if (mode === "psikoloji") {
        userPrompt = "İşlemlerimde tespit edebildiğin psikolojik kalıpları (örneğin overtrading, intikam ticareti, erken çıkış, hırs) analiz et ve psikolojimi korumak için mentör tavsiyesi ver.";
      } else if (mode === "session_asset") {
        userPrompt = "İşlem yaptığım en kârlı ve en zararlı pariteleri/varlıkları, seanslar ve zaman dilimlerine göre karşılaştır. Nerede odaklanmalıyım, nerede freni basmalıyım?";
      } else if (mode === "image_analysis") {
        userPrompt = prompt || "Bu grafik ekran görüntüsünü teknik analiz, teknik seviyeler (destek/direnç/likidite), R/R oranı ve potansiyel tuzaklar açısından detaylıca incele ve mentör yorumunu yap.";
      } else if (mode === "mistake_pattern") {
        userPrompt = "Sadece zararla (Loss) kapanan işlemlerimi gönderiyorum. Bu kullanıcının kayıplarındaki ortak örüntü ne? (Örn: Hep belli bir seans, belli bir parite veya stratejide mi kaybediyor? Notlardan çıkardığın psikolojik hatalar var mı?). Lütfen '3 Temel Hatan' başlığı altında tokat gibi gerçekleri ve çözüm önerilerini sırala.";
      } else if (mode === "pre_trade_score") {
        userPrompt = `Bir işlem kurulumunu (Pre-Trade Setup) analiz etmeni ve objektif bir "İşlem Skoru" (100 üzerinden) vermeni istiyorum.
        
[KURULUM BİLGİLERİ]
- Varlık: ${preTradeData?.asset || "Belirtilmemiş"}
- İşlem Tipi (Yönü): ${preTradeData?.type || "Belirtilmemiş"}
- Hedeflenen R/R: ${preTradeData?.rr || "Belirtilmemiş"} R
- Kullanılan Strateji: ${preTradeData?.strategy || "Belirtilmemiş"}
- Kullanılan Konseptler: ${preTradeData?.concepts?.join(", ") || "Belirtilmemiş"}
- Platform: ${preTradeData?.platform || "Belirtilmemiş"}
- Zaman Dilimi: ${preTradeData?.timeframe || "Belirtilmemiş"}
- Seans: ${preTradeData?.session || "Belirtilmemiş"}
- Plan / Notlar: ${preTradeData?.notes || "Not eklenmemiş."}

Lütfen yanıtını tamamen Türkçe olarak ve şu şekilde yapılandırılmış olarak ver:

# 🎯 AI KURULUM ANALİZİ

### 📊 Kurulum Skoru: **[SKOR]/100**
*(Not: Bu skor; planın zenginliği, R/R oranı, seans/zaman dilimi uyumu ve strateji netliğine göre hesaplanmıştır.)*

---

### ✅ Güçlü Yönler (Pros)
- [En az 2 güçlü teknik veya mantıksal yönü listeleyin]

### ⚠️ Riskler & Zayıf Yönler (Cons)
- [En az 2 olası risk veya dikkat edilmesi gereken zayıf noktayı listeleyin]

---

### 🎙️ Mentörün Tavsiyesi
> "[İşleme girmeden önce uygulanacak tek cümlelik, vurucu ve pratik bir mentör tavsiyesi yazın]"`;
      }

      // Build contents incorporating chat history if provided
      let contents: any[] = [];
      if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
        contents = chatHistory.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        const lastUserParts: any[] = [{ text: userPrompt }];
        if (imageData) {
          const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
          if (matches) {
            lastUserParts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2],
              },
            });
          }
        }

        contents.push({
          role: "user",
          parts: lastUserParts,
        });
      } else {
        const userParts: any[] = [{ text: userPrompt }];
        if (imageData) {
          const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
          if (matches) {
            userParts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2],
              },
            });
          }
        }
        contents = [{ role: "user", parts: userParts }];
      }

      const response = await callAiWithFallback(
        (ai, model) => ai.models.generateContent({
          model: model,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        })
      );

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("AI Copilot Endpoint Error:", err);
      res.status(500).json({ error: handleGeminiError(err) || "AI Co-Pilot yanıtı oluşturulurken bir hata oluştu." });
    }
  });


  app.post("/api/voice-to-trade", requireSiteAuth, express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { audioBase64, options } = req.body;
      const { platforms, sessions, strategies, concepts, timeframes, htfTimeframes } = options || {};

      const prompt = `
Aşağıdaki ses kaydı bir tüccarın (trader) yaptığı bir işlemi (trade) sesli anlatımıdır.
GÖREVİN: Ses kaydındaki Türkçe ve İngilizce finansal konuşmayı hassas biçimde çözümle, fonetik hataları düzelt ve aşağıdaki JSON formatında DÖN.
SADECE GEÇERLİ BİR JSON DÖN, BAŞKA METİN VEYA AÇIKLAMA YAZMA.

[FONETİK VE SÖZLÜ TERİM DÜZELTME REHBERİ]
1. Varlık / Asset:
   - "Be te ce", "Bitece", "Bitcoin", "Bitkoyun" -> BTC veya BTCUSDT
   - "Eter", "Etaryum", "Eteryum" -> ETH veya ETHUSDT
   - "Euro dolar", "Evro dolar", "Yuro dolar" -> EURUSD
   - "Ons altın", "Altın", "Gold", "Golds" -> XAUUSD
   - "Dolar yen", "Usd jpy" -> USDJPY
   - Söylenen diğer varlıkları standart borsa sembolüne çevir (örn: Solana -> SOLUSDT, Nasdaq -> NQ).
2. İşlem Tipi / Type:
   - "Long", "Longladım", "Long girdim", "Yükseliş", "Alım", "Alış" -> LONG
   - "Short", "Shortladım", "Short girdim", "Düşüş", "Satış", "Satım" -> SHORT
3. Durum / Status:
   - "Kâr", "Kârla kapandı", "Win", "Kazandı", "Hedef geldi", "TP oldu" -> WIN
   - "Stop oldum", "Loss", "Zarar", "Kaybettim", "Stop yedi", "SL oldu" -> LOSS
   - "Kafa kafaya", "Giriş yerinde kapandı", "Break even", "BE", "Maliyet" -> BE
4. Sayısal Değerler (RR & PnL):
   - "İki R", "2 RR", "2 re", "İki buçuk R" -> rr: 2.0 veya 2.5
   - "Yüz dolar kâr", "100 dolar pnl", "eksi 50 dolar" -> pnl: 100 veya -50
5. Parazit Temizliği:
   - Öksürük, nefes alma sesleri, "ııı", "şey", "yani", "hmm" gibi duraksamaları ve anlamsız sesleri tamamen yoksay.

JSON Şeması:
{
  "asset": "Kripto, hisse veya parite adı (örn: EURUSD, BTCUSDT)",
  "type": "LONG veya SHORT",
  "platform": "Kullanılan platform. Seçenekler: ${platforms?.join(', ')}",
  "timeframe": "Zaman dilimi. Seçenekler: ${timeframes?.join(', ')}",
  "htfTimeframe": "Yüksek zaman dilimi. Seçenekler: ${htfTimeframes?.join(', ')}",
  "session": "Seans. Seçenekler: ${sessions?.join(', ')}",
  "strategy": "Strateji. Seçenekler: ${strategies?.join(', ')}",
  "concepts": ["Konsept 1", "Konsept 2"], // Mümkünse listedekilerden seç: ${concepts?.join(', ')}
  "status": "WIN, LOSS veya BE",
  "rr": Sayısal değer (örn: 2.5),
  "pnl": Sayısal değer (örn: 150 veya -50),
  "notes": "Kullanıcının anlattığı giriş nedeni, psikolojisi ve işlem detaylarının düzenli özeti"
}
`;

      const response = await callAiWithFallback(
        (ai, model) => ai.models.generateContent({
          model: model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "audio/webm",
                    data: audioBase64
                  }
                }
              ]
            }
          ],
          config: { temperature: 0.1 }
        })
      );

      const text = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Voice-to-Trade Error:", err);
      res.status(500).json({ error: handleGeminiError(err) });
    }
  });


  app.post("/api/voice-to-journal", requireSiteAuth, express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { audioBase64, options } = req.body;
      const { moods } = options || {};

      const prompt = `
Sen profesyonel bir sesli günlük (trading journal) transkripsiyon ve analiz uzmanısın.
Aşağıdaki ses kaydı bir tüccarın günlüğüne eklemek istediği notları ve duygusal durumunu içermektedir.

GÖREVİN:
1. Konuşmadaki duraksamaları, parazit sesleri ("ııı", "şey", "yani", nefes sesleri) tamamen temizle.
2. Anlatılanları dilbilgisi kurallarına uygun, son derece akıcı, anlaşılır ve profesyonel bir günlük metnine dönüştür.
3. Konuya en uygun, kısa ve vurucu bir başlık oluştur.
4. Tüccarın ruh halini listedeki seçenekler arasından belirle.

JSON Şeması (SADECE GEÇERLİ JSON DÖN):
{
  "title": "Metinden çıkarılan kısa, vurucu başlık",
  "content": "Kullanıcının anlattıklarının temizlenmiş, düzenli ve akıcı metni",
  "mood": "Mümkünse şu listeden en uygun olanı seç: ${moods?.join(', ')}. Uymuyorsa listedeki en mantıklı seçeneği seç."
}
`;

      const response = await callAiWithFallback(
        (ai, model) => ai.models.generateContent({
          model: model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "audio/webm",
                    data: audioBase64
                  }
                }
              ]
            }
          ],
          config: { temperature: 0.2 }
        })
      );

      const text = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Voice-to-Journal Error:", err);
      res.status(500).json({ error: handleGeminiError(err) });
    }
  });


  app.post("/api/voice-to-note", requireSiteAuth, express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { audioBase64 } = req.body;

      const prompt = `
Sen profesyonel bir sesli not transkripsiyon ve düzenleme uzmanısın.
Aşağıdaki ses kaydı bir tüccarın not defterine eklemek istediği stratejileri, fikirleri veya gözlemleri içermektedir.

GÖREVİN:
1. Konuşmadaki duraksamaları ("ııı", "şey", "hmm", nefes) tamamen temizle.
2. Finans ve Price Action terimlerini (FVG, Order Block, Breakout, Liquidity, Stop Loss vb.) doğru formatta yazarak temiz, anlaşılır ve düzenli bir nota dönüştür.
3. Anlatılan konuyu özetleyen kısa ve net bir başlık belirle.

JSON Şeması (SADECE GEÇERLİ JSON DÖN):
{
  "title": "Konuya uygun kısa, net başlık",
  "content": "Kullanıcının anlattıklarının temizlenmiş ve düzenlenmiş metni"
}
`;

      const response = await callAiWithFallback(
        (ai, model) => ai.models.generateContent({
          model: model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "audio/webm",
                    data: audioBase64
                  }
                }
              ]
            }
          ],
          config: { temperature: 0.2 }
        })
      );

      const text = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Voice-to-Note Error:", err);
      res.status(500).json({ error: handleGeminiError(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer, clientPort: 443 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      etag: true,
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();