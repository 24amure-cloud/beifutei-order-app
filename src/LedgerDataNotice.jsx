import React, { useEffect, useState } from 'react';
import { loadDailyLedger } from './dailyLedger.js';
import { isSupabaseConfigured } from './supabaseClient.js';

export default function LedgerDataNotice() {
  const [count, setCount] = useState(() => loadDailyLedger().entries.length);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const refresh = () => setCount(loadDailyLedger().entries.length);
    const onSync = (e) => {
      refresh();
      const d = e?.detail;
      if (d?.ok && d.added > 0) {
        setSyncMsg(`クラウドから ${d.added} 件の会計を復元しました。`);
      }
    };
    window.addEventListener('beifutei-daily-ledger-updated', refresh);
    window.addEventListener('beifutei-daily-ledger-synced', onSync);
    return () => {
      window.removeEventListener('beifutei-daily-ledger-updated', refresh);
      window.removeEventListener('beifutei-daily-ledger-synced', onSync);
    };
  }, []);

  if (count === 0 && !syncMsg) {
    return (
      <p className="master-ledger-data-notice master-ledger-data-notice--quiet" role="status">
        会計データは厨房で確定すると記録されます。
      </p>
    );
  }

  return (
    <p className="master-ledger-data-notice master-ledger-data-notice--quiet" role="status">
      会計 {count} 件を保存しています。
      {syncMsg ? ` ${syncMsg}` : ''}
      {!isSupabaseConfigured && count > 0 ? '（この端末に保存）' : ''}
    </p>
  );
}
