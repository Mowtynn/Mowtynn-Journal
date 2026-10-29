import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Yayın duman testi: derlenmiş sunucuyu (dist/server.cjs) production kipinde başlatır ve
 * sağlık, SPA, statik dosya, 404 ve site parolası uçlarını gerçek HTTP ile dener.
 * dist yoksa (henüz build alınmadıysa) atlanır.
 */
const SERVER = path.resolve('dist', 'server.cjs');
const hasBuild = fs.existsSync(SERVER) && fs.existsSync(path.resolve('dist', 'index.html'));
const PASSWORD = 'smoke-test-parola';

async function startServer(port: number): Promise<ChildProcess> {
  const child = spawn(process.execPath, [SERVER], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', SITE_PASSWORD: PASSWORD, TOKEN_SECRET: 'smoke-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sunucu 15 sn içinde başlamadı')), 15000);
    child.stdout?.on('data', (d) => {
      if (String(d).includes('Server running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Sunucu kapandı (kod ${code})`));
    });
  });
  return child;
}

test('production sunucusu: sağlık, SPA, 404 ve parola uçları', { skip: !hasBuild && 'dist yok (önce npm run build)' }, async () => {
  const port = 40000 + Math.floor(Math.random() * 10000);
  const base = `http://127.0.0.1:${port}`;
  const child = await startServer(port);
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type') || '', /text\/html/);
    assert.match(await home.text(), /id="root"/);
    assert.match(home.headers.get('cache-control') || '', /no-cache/);

    // İstemci tarafı rota: index.html döner
    const deep = await fetch(`${base}/herhangi/bir/sayfa`);
    assert.equal(deep.status, 200);

    // Olmayan API ve dosya: HTML değil gerçek 404
    const api404 = await fetch(`${base}/api/yok`);
    assert.equal(api404.status, 404);
    const file404 = await fetch(`${base}/yok.js`);
    assert.equal(file404.status, 404);

    // Güvenlik başlıkları (helmet) ve sunucu imzası gizli
    assert.equal(home.headers.get('x-powered-by'), null);
    assert.ok(home.headers.get('x-content-type-options'));

    // Site parolası: yanlış → 401, doğru → süreli jeton, jeton doğrulanır
    const wrong = await fetch(`${base}/api/verify-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'yanlis' }) });
    assert.equal(wrong.status, 401);
    const ok = await fetch(`${base}/api/verify-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
    assert.equal(ok.status, 200);
    const { token } = (await ok.json()) as { token: string };
    assert.match(token, /^\d+\.[0-9a-f]{64}$/);
    const verify = await fetch(`${base}/api/verify-token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
    assert.deepEqual(await verify.json(), { success: true });

    // Korunan uç jetonsuz reddedilir
    const guarded = await fetch(`${base}/api/resolve-tv?url=https://example.com`);
    assert.equal(guarded.status, 401);

    // Bozuk JSON: yığın izi değil, kısa hata
    const bad = await fetch(`${base}/api/verify-token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bozuk' });
    assert.equal(bad.status, 400);
  } finally {
    child.kill();
  }
});
