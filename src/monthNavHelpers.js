export function parseMonthKey(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function monthKeyFromParts(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function shiftMonthKey(key, delta) {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKeyFromParts(d.getFullYear(), d.getMonth() + 1);
}

export function monthLabel(key) {
  const { year, month } = parseMonthKey(key);
  return `${year}年${month}月`;
}
