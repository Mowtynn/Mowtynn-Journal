/**
 * Yeni sürüm yayınlandığında açık kalan eski sekme, sunucuda artık olmayan bir kod parçasını ister.
 * Bu durumda sayfa bir kez yenilenip yeni sürüm yüklenir (döngü olmasın diye 30 sn'de en fazla bir kez).
 */
const KEY = 'tj_chunk_reload_at';

export function isStaleChunkError(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Loading chunk \S+ failed|ChunkLoadError/i.test(msg);
}

/** Yenileme başlatıldıysa true döner */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
