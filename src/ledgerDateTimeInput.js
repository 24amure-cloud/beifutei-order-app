/** datetime-local 用（端末のローカル時刻） */
export function ledgerRecordedAtToDatetimeLocal(ms) {
  const t = Number(ms);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToRecordedAt(value) {
  if (!value || typeof value !== 'string') return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}
