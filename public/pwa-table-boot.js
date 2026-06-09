/**
 * PWA ホーム画面起動時（manifest start_url には ?table= が無い）に、
 * 端末に保存した卓番へ即リダイレクトする。React より前に実行する。
 */
(function () {
  try {
    var u = new URL(window.location.href);
    if (u.searchParams.get('table')) return;

    var isKitchen = /kitchen(?:\.html)?/i.test(u.pathname);
    var table = '';

    if (isKitchen) {
      var rawK = localStorage.getItem('beifutei-kitchen-focus-table-v1');
      if (rawK) {
        var pk = JSON.parse(rawK);
        if (pk && pk.tableLabel != null) table = String(pk.tableLabel).trim();
      }
    } else {
      var TABLE_KEY = 'beifutei-pwa-guest-table-v1';
      var CONFIRMED_KEY = 'beifutei-pwa-guest-table-from-url-v1';
      table = String(localStorage.getItem(TABLE_KEY) || '').trim();
      var confirmed = localStorage.getItem(CONFIRMED_KEY) === '1';
      if (table && table === '3' && !confirmed) table = '';
      else if (table && !confirmed && table !== '3') {
        /* 旧バージョンで正しく保存された卓番（3以外）はそのまま信頼 */
      } else if (!table) {
        return;
      }
    }

    if (!table) return;

    u.searchParams.set('table', table);
    window.location.replace(u.toString());
  } catch (e) {
    /* ignore */
  }
})();
