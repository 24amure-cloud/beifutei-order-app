/** 日計・お会計済み伝票の削除・日時修正用 PIN（オーナー。環境変数で上書き可） */
export const DEFAULT_OWNER_LEDGER_DELETE_PIN = '1211';

export function getOwnerLedgerDeletePin() {
  const fromEnv = import.meta.env?.VITE_OWNER_LEDGER_DELETE_PIN;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return DEFAULT_OWNER_LEDGER_DELETE_PIN;
}

export function verifyOwnerLedgerDeletePin(input) {
  return String(input ?? '').trim() === getOwnerLedgerDeletePin();
}
