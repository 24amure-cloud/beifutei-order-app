/**
 * 飲み放題メニュー：客席表示用ラベル（厨房・注文行の `name` は日本語のまま）
 */

/** @param {Array<{ items?: Array<{ id?: string, name?: string, nameEn?: string }> }>} catalog */
export function buildNomihodaiGuestLabelIndex(catalog) {
  const m = new Map();
  if (!Array.isArray(catalog)) return m;
  for (const sec of catalog) {
    for (const it of sec.items || []) {
      if (it?.id) m.set(String(it.id), { name: it.name, nameEn: it.nameEn });
    }
  }
  return m;
}

/**
 * @param {Map<string, { name?: string, nameEn?: string }>} index
 * @param {string} [itemId]
 * @param {string} [fallbackJa]
 * @param {'ja'|'en'} locale
 */
export function nomihodaiGuestItemLabel(index, itemId, fallbackJa, locale) {
  const meta = itemId != null ? index?.get(String(itemId)) : null;
  const ja = meta?.name ?? fallbackJa ?? '';
  if (locale === 'en') {
    const en = meta?.nameEn != null ? String(meta.nameEn).trim() : '';
    if (en) return en;
  }
  return ja;
}

/**
 * @param {{ name?: string, nameEn?: string }} it
 * @param {'ja'|'en'} locale
 */
export function nomihodaiGuestItemLabelFromItem(it, locale) {
  const ja = it?.name ?? '';
  if (locale === 'en') {
    const en = it?.nameEn != null ? String(it.nameEn).trim() : '';
    if (en) return en;
  }
  return ja;
}

/** 別料金ショット行の短い表示名 */
export function nomihodaiExtraShotRowLabel(shot, locale) {
  if (locale === 'en' && shot?.labelEn != null && String(shot.labelEn).trim() !== '') {
    return String(shot.labelEn).trim();
  }
  return shot?.label ?? '';
}
