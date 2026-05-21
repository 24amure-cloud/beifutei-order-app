/**
 * デプロイ後に PWA が古い JS を参照して真っ白になるのを防ぐ（1セッション1回まで）。
 */
const RECOVERY_KEY = 'beifutei-sw-cleared-v3';

export function recoverStaleServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('clearsw') === '1') {
    void clearAllServiceWorkersAndReload();
    return;
  }

  window.setTimeout(() => {
    const root = document.getElementById('root');
    if (!root || root.childElementCount > 0) return;
    if (sessionStorage.getItem(RECOVERY_KEY)) return;
    void clearAllServiceWorkersAndReload();
  }, 4000);
}

async function clearAllServiceWorkersAndReload() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (!regs.length) return;
    await Promise.all(regs.map((r) => r.unregister()));
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    /* ignore */
  }
}
