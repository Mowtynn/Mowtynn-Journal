import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import crypto from "crypto";
import dns from "node:dns/promises";
import net from "node:net";

// Yerel çalıştırmada .env.local / .env dosyalarını yükle (README bunu söylüyordu ama sunucu hiç okumuyordu;
// SITE_PASSWORD tanımsız kalıyor ve giriş "parola yapılandırılmamış" hatası veriyordu).
// Ortamda zaten tanımlı değişkenler (Render paneli) ezilmez.
for (const envFile of [".env.local", ".env"]) {
  try {
    (process as any).loadEnvFile?.(envFile);
  } catch {
    /* dosya yok: sorun değil */
  }
}

// ---------------------------------------------------------------------------
// SSRF protection for the image proxy / TradingView resolver
// ---------------------------------------------------------------------------
const isPrivateAddress = (ip: string): boolean => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe8") || l.startsWith("fe9") || l.startsWith("fea") || l.startsWith("feb")) return true;
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
};

const assertPublicHttpUrl = async (raw: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Geçersiz URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Yalnızca http(s) desteklenir");
  if (url.username || url.password) throw new Error("Kimlik bilgili URL desteklenmez");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Özel ağ adresine erişim engellendi");
    return url;
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0 || records.some((r) => isPrivateAddress(r.address))) {
    throw new Error("Özel ağ adresine erişim engellendi");
  }
  return url;
};

// fetch that re-validates every redirect hop instead of blindly following it
const safeFetch = async (raw: string, init: RequestInit, maxRedirects = 3): Promise<Response> => {
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    const url = await assertPublicHttpUrl(current);
    const res = await fetch(url.toString(), { ...init, redirect: "manual", signal: AbortSignal.timeout(10000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location") as string, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("Çok fazla yönlendirme");
};

const isTradingViewShareUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    return (u.hostname === "tradingview.com" || u.hostname.endsWith(".tradingview.com")) && u.pathname.startsWith("/x/");
  } catch {
    return false;
  }
};

const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// Site erişim jetonu: "<bitiş_ms>.<HMAC>" biçiminde, süreli ve imzalı. Parola (veya TOKEN_SECRET) değişince eski jetonlar geçersiz olur.
// Eski sürümdeki sha256(parola) jetonu hem süresizdi hem de çalınırsa parolayı çevrimdışı kırmaya yarıyordu.
const TOKEN_TTL_SESSION_MS = 12 * 60 * 60 * 1000;
const TOKEN_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const tokenKey = (): Buffer | null => {
  const base = process.env.TOKEN_SECRET || process.env.SITE_PASSWORD;
  if (!base) return null;
  return crypto.createHmac("sha256", "tj-site-token-v4").update(base).digest();
};
const signSiteToken = (ttlMs: number): { token: string; expiresAt: number } | null => {
  const key = tokenKey();
  if (!key) return null;
  const expiresAt = Date.now() + ttlMs;
  const sig = crypto.createHmac("sha256", key).update(String(expiresAt)).digest("hex");
  return { token: `${expiresAt}.${sig}`, expiresAt };
};
const isValidSiteToken = (token: unknown): boolean => {
  const key = tokenKey();
  if (!key || typeof token !== "string" || token.length > 200) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d{10,16}$/.test(parts[0])) return false;
  if (Number(parts[0]) < Date.now()) return false;
  const expected = crypto.createHmac("sha256", key).update(parts[0]).digest("hex");
  return safeEqual(parts[1], expected);
};

async function startServer() {
  const app = express();
  // Render/Heroku gibi proxy arkasında gerçek istemci IP'si (rate limit için şart)
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  
  app.use(compression({
    threshold: 1024, // only compress responses above 1KB
  }));

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }));
  
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  // `node dist/server.cjs` must never start the Vite dev server, even when NODE_ENV is not set by the host
  const isProduction = process.env.NODE_ENV === "production" || (process.argv[1] || "").endsWith("server.cjs");

  // API istekleri yalnızca küçük JSON gövdeleri taşır (giriş / jeton doğrulama)
  app.use(express.json({ limit: "100kb" }));

  // Password Verification Rate Limiter
  const passwordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Aynı IP'den en fazla 10 BAŞARISIZ deneme
    skipSuccessfulRequests: true, // doğru girişler hakkı tüketmez
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Çok fazla başarısız deneme yapıldı. Güvenlik nedeniyle 15 dakika bekleyin." },
  });

  // Jeton doğrulama sayfa her yenilendiğinde çağrılır; parola limitinden ayrı ve daha geniştir
  // (aksi halde 10 sayfa yenilemesi kullanıcıyı sistemden atıyordu).
  const tokenRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Çok fazla istek. Biraz bekleyin." },
  });

  // Strict Site Authentication Middleware for all sensitive APIs
  const requireSiteAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sitePassword = process.env.SITE_PASSWORD;
    if (!sitePassword) {
      return res.status(500).json({ error: "Sistem parolası yapılandırılmamış (SITE_PASSWORD)." });
    }
    const headerToken = req.headers['x-site-token'] || 
      (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '') ||
      (req.query.site_token as string) ||
      (req.query.token as string);

    if (!headerToken || typeof headerToken !== 'string' || !isValidSiteToken(headerToken)) {
      return res.status(401).json({ error: "Erişim Engellendi: Geçerli site erişim jetonu gereklidir." });
    }
    next();
  };

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Password Verification Endpoint
  app.post("/api/verify-password", passwordRateLimiter, express.json({ limit: "10kb" }), (req, res) => {
    try {
      const { password, remember } = req.body || {};
      
      const sitePassword = process.env.SITE_PASSWORD;
      
      if (!sitePassword) {
         return res.status(500).json({ success: false, error: "Sistem parolası yapılandırılmamış. Lütfen ayarlardan SITE_PASSWORD değişkenini ekleyin." });
      }
      
      if (typeof password === 'string' && safeEqual(password, sitePassword)) {
        const signed = signSiteToken(remember === true ? TOKEN_TTL_REMEMBER_MS : TOKEN_TTL_SESSION_MS);
        if (!signed) return res.status(500).json({ success: false, error: "Sistem parolası yapılandırılmamış." });
        res.json({ success: true, token: signed.token, expiresAt: signed.expiresAt });
      } else {
        res.status(401).json({ success: false, error: "Invalid password" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // Token Verification Endpoint (for dynamic session invalidation)
  app.post("/api/verify-token", tokenRateLimiter, express.json({ limit: "10kb" }), (req, res) => {
    try {
      const { token } = req.body || {};
      if (isValidSiteToken(token)) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });

  // Helper route to resolve TradingView share links to direct image URLs
  app.get("/api/resolve-tv", requireSiteAuth, async (req, res) => {
    const urlParam = typeof req.query.url === 'string' ? req.query.url : '';
    try {
      if (!urlParam || !isTradingViewShareUrl(urlParam)) {
        return res.json({ url: urlParam });
      }
      
      const htmlRes = await safeFetch(urlParam, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (htmlRes.ok) {
        const htmlText = await htmlRes.text();
        const match = htmlText.match(/<meta property="og:image" content="([^"]+)"/);
        // Yalnızca https görsel adresi döner (sayfadan gelen değer doğrulanmadan istemciye verilmez)
        if (match && match[1] && /^https:\/\/[^\s"'<>]+$/i.test(match[1])) {
          return res.json({ url: match[1] });
        }
      }
      res.json({ url: urlParam });
    } catch {
      res.json({ url: urlParam });
    }
  });

  // Vite middleware for development
  if (!isProduction) {
    // Vite yalnızca geliştirmede yüklenir (production başlangıcı hafif kalır)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true"
          ? false
          : { server: httpServer, ...(process.env.HMR_CLIENT_PORT ? { clientPort: Number(process.env.HMR_CLIENT_PORT) } : {}) },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      etag: true,
      setHeaders: (res, filePath) => {
        const normalized = filePath.split(path.sep).join("/");
        if (normalized.includes("/dist/assets/")) {
          // Vite fingerprints these files, so they can be cached forever
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      }
    }));
    

  // Var olmayan API ve dosya istekleri HTML yerine gerçek 404 döndürsün
    app.use("/api", (_req, res) => {
      res.status(404).json({ error: "Bulunamadı" });
    });
    app.get("*", (req, res) => {
      if (path.extname(req.path)) {
        return res.status(404).type("text/plain").send("Not found");
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Son çare hata yakalayıcı: yığın izi sızdırmadan JSON döner (bozuk JSON, 413 vb.)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    const status = Number(err?.status || err?.statusCode) || 500;
    const message =
      status === 413 ? "İstek çok büyük." :
      status === 400 ? "Geçersiz istek." :
      "Sunucu hatası.";
    if (status >= 500) console.error("Unhandled server error:", err);
    res.status(status).json({ error: message });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Render yeniden başlatırken açık bağlantıları düzgünce kapat
  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Sunucu başlatılamadı:", err);
  process.exit(1);
});