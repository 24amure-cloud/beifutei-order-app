import { DEFAULT_TAKEOUT_SWEETS_SECTIONS } from './data/defaultTakeoutSweetsMenu.js';

export const TAKEOUT_SWEETS_MENU_STORAGE_KEY = 'beifutei-takeout-sweets-menu-v1';
const KUKKI_COOKIE_IMAGE_FIX_KEY = 'beifutei-takeout-kukki-image-fix-v1';
const TAKEOUT_MENU_LABEL_FIX_KEY = 'beifutei-takeout-menu-label-fix-v2';
const TAKEOUT_KUKKI_LABEL_FIX_KEY = 'beifutei-takeout-kukki-label-fix-v3';
const TAKEOUT_KUKKI_NUTS_RESTORE_KEY = 'beifutei-takeout-kukki-nuts-restore-v4';
const TAKEOUT_KUKKI_CHOCO_NUTS_KEY = 'beifutei-takeout-kukki-choco-nuts-v5';
const TAKEOUT_MISSING_IMAGES_KEY = 'beifutei-takeout-missing-images-v6';

const TAKEOUT_ITEM_IMAGE_PATCHES = {
  'ts-kk-hasukappu': 'kukki-hasukappu.png',
  'ts-fr-kiui-mix': 'furusan-kiui-mix.jpg',
  'ts-fr-orange': 'furusan-orange.jpg',
};

const KUKKI_CHOCO_ITEM = {
  id: 'ts-kk-choco-sand',
  name: 'チョコレート\nクッキーサンド',
  price: 460,
  image: 'kukkisanndo-choko.png',
};

const KUKKI_NUTS_ITEM = {
  id: 'ts-kk-nuts-choco',
  name: 'ナッツチョコ\nクッキーサンド',
  price: 460,
  image: 'kukkisanndo-choko.png',
};

function isChocoCookieSandName(name) {
  return name === 'チョコレートクッキーサンド' || name === 'チョコレート\nクッキーサンド';
}

function insertKukkiItem(items, item, afterId) {
  const idx = items.findIndex((it) => it.id === afterId);
  const at = idx >= 0 ? idx + 1 : items.length;
  return [...items.slice(0, at), item, ...items.slice(at)];
}

function fixTakeoutItemName(name) {
  if (typeof name !== 'string') return name;
  return name
    .replace(/フレーツMIX/g, 'フルーツMIX')
    .replace(/リトルレアクッキー/g, 'リッチレアクッキー');
}

/** フルーツMIX・リッチレア等（既存端末を1回だけ更新） */
function migrateTakeoutMenuLabels(sections) {
  if (localStorage.getItem(TAKEOUT_MENU_LABEL_FIX_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    let titleJa = sec.titleJa;
    if (sec.id === 'ts-sec-rittire' && titleJa === 'リトルレアクッキー') {
      titleJa = 'リッチレアクッキー';
      changed = true;
    }
    const items = (sec.items || []).map((it) => {
      const name = fixTakeoutItemName(it.name);
      if (name !== it.name) {
        changed = true;
        return { ...it, name };
      }
      return it;
    });
    if (titleJa !== sec.titleJa) {
      return { ...sec, titleJa, items };
    }
    if (items !== sec.items) {
      return { ...sec, items };
    }
    return sec;
  });
  localStorage.setItem(TAKEOUT_MENU_LABEL_FIX_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

/** クッキーサンドカテゴリ名の巻き戻し（v2誤変換） */
function migrateTakeoutKukkiLabels(sections) {
  if (localStorage.getItem(TAKEOUT_KUKKI_LABEL_FIX_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    if (sec.id !== 'ts-sec-kukki') return sec;
    let titleJa = sec.titleJa;
    if (titleJa === 'チョコレート（クッキーサンド）') {
      titleJa = 'クッキーサンド';
      changed = true;
    }
    const items = (sec.items || []).map((it) => {
      if (typeof it.name === 'string' && /\nチョコレート$/.test(it.name)) {
        changed = true;
        return { ...it, name: it.name.replace(/\nチョコレート$/, '\nクッキーサンド') };
      }
      return it;
    });
    return titleJa !== sec.titleJa ? { ...sec, titleJa, items } : { ...sec, items };
  });
  localStorage.setItem(TAKEOUT_KUKKI_LABEL_FIX_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

/** ナッツチョコ復活＋チョコレートを別品目で追加（v4・旧マイグレーション用） */
function migrateTakeoutKukkiNutsAndChoco(sections) {
  if (localStorage.getItem(TAKEOUT_KUKKI_NUTS_RESTORE_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    if (sec.id !== 'ts-sec-kukki') return sec;
    let items = [...(sec.items || [])];
    items = items.map((it) => {
      if (it.id !== KUKKI_NUTS_ITEM.id) return it;
      if (it.name === KUKKI_NUTS_ITEM.name) return it;
      changed = true;
      return { ...it, name: KUKKI_NUTS_ITEM.name };
    });
    if (!items.some((it) => it.id === KUKKI_CHOCO_ITEM.id)) {
      items = insertKukkiItem(items, { ...KUKKI_CHOCO_ITEM, name: 'チョコレートクッキーサンド' }, KUKKI_NUTS_ITEM.id);
      changed = true;
    }
    return changed ? { ...sec, items } : sec;
  });
  localStorage.setItem(TAKEOUT_KUKKI_NUTS_RESTORE_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

/** チョコレート・ナッツチョコの2品を必ず揃える（差し替え防止） */
function migrateTakeoutKukkiChocoAndNuts(sections) {
  if (localStorage.getItem(TAKEOUT_KUKKI_CHOCO_NUTS_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    if (sec.id !== 'ts-sec-kukki') return sec;
    let items = [...(sec.items || [])];
    let titleJa = sec.titleJa;
    if (titleJa === 'チョコレート（クッキーサンド）') {
      titleJa = 'クッキーサンド';
      changed = true;
    }

    const nutsIdx = items.findIndex((it) => it.id === KUKKI_NUTS_ITEM.id);
    const chocoIdx = items.findIndex((it) => it.id === KUKKI_CHOCO_ITEM.id);

    if (nutsIdx >= 0 && chocoIdx < 0 && isChocoCookieSandName(items[nutsIdx].name)) {
      items[nutsIdx] = { ...items[nutsIdx], ...KUKKI_NUTS_ITEM };
      items = insertKukkiItem(items, KUKKI_CHOCO_ITEM, KUKKI_NUTS_ITEM.id);
      changed = true;
    } else {
      if (nutsIdx < 0) {
        items = insertKukkiItem(items, KUKKI_NUTS_ITEM, 'ts-kk-hasukappu');
        changed = true;
      } else if (items[nutsIdx].name !== KUKKI_NUTS_ITEM.name) {
        items[nutsIdx] = { ...items[nutsIdx], name: KUKKI_NUTS_ITEM.name };
        changed = true;
      }
      const chocoIdx2 = items.findIndex((it) => it.id === KUKKI_CHOCO_ITEM.id);
      if (chocoIdx2 < 0) {
        items = insertKukkiItem(items, KUKKI_CHOCO_ITEM, KUKKI_NUTS_ITEM.id);
        changed = true;
      } else if (items[chocoIdx2].name !== KUKKI_CHOCO_ITEM.name) {
        items[chocoIdx2] = { ...items[chocoIdx2], name: KUKKI_CHOCO_ITEM.name };
        changed = true;
      }
    }

    return changed ? { ...sec, titleJa, items } : sec;
  });
  localStorage.setItem(TAKEOUT_KUKKI_CHOCO_NUTS_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

/** ハスカップ・キウイMIX・オレンジの画像を反映（yum フォルダ分） */
function migrateTakeoutMissingImages(sections) {
  if (localStorage.getItem(TAKEOUT_MISSING_IMAGES_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).map((it) => {
      const target = TAKEOUT_ITEM_IMAGE_PATCHES[it.id];
      if (!target || it.image === target) return it;
      changed = true;
      return { ...it, image: target };
    }),
  }));
  localStorage.setItem(TAKEOUT_MISSING_IMAGES_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

/** ナッツチョコ→チョコ画像、ハスカップチョコ→画像なし（既存端末の localStorage を1回だけ更新） */
function migrateKukkiCookieImages(sections) {
  if (localStorage.getItem(KUKKI_COOKIE_IMAGE_FIX_KEY)) return sections;
  let changed = false;
  const next = (sections || []).map((sec) => {
    if (sec.id !== 'ts-sec-kukki') return sec;
    return {
      ...sec,
      items: (sec.items || []).map((it) => {
        if (it.id === 'ts-kk-nuts-choco' && it.image !== 'kukkisanndo-choko.png') {
          changed = true;
          return { ...it, image: 'kukkisanndo-choko.png' };
        }
        if (it.id === 'ts-kk-hasukappu' && it.image) {
          changed = true;
          return { ...it, image: '' };
        }
        return it;
      }),
    };
  });
  localStorage.setItem(KUKKI_COOKIE_IMAGE_FIX_KEY, '1');
  if (changed) saveTakeoutSweetsSections(next);
  return next;
}

function isValidItem(it) {
  return (
    it &&
    typeof it.id === 'string' &&
    it.id.startsWith('ts-') &&
    typeof it.name === 'string' &&
    typeof it.price === 'number' &&
    Number.isFinite(it.price)
  );
}

function isValidSection(s) {
  return s && typeof s.id === 'string' && Array.isArray(s.items) && s.items.every(isValidItem);
}

export function loadTakeoutSweetsSections() {
  try {
    const raw = localStorage.getItem(TAKEOUT_SWEETS_MENU_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    const cleaned = parsed.filter(isValidSection).map((sec) => ({
      ...sec,
      items: sec.items.filter(isValidItem),
    }));
    const loaded = cleaned.length ? cleaned : structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS);
    return migrateTakeoutMissingImages(
      migrateTakeoutKukkiChocoAndNuts(
        migrateTakeoutKukkiNutsAndChoco(
          migrateTakeoutKukkiLabels(migrateTakeoutMenuLabels(migrateKukkiCookieImages(loaded))),
        ),
      ),
    );
  } catch {
    return migrateTakeoutMissingImages(
      migrateTakeoutKukkiChocoAndNuts(
        migrateTakeoutKukkiNutsAndChoco(
          migrateTakeoutKukkiLabels(
            migrateTakeoutMenuLabels(
              migrateKukkiCookieImages(structuredClone(DEFAULT_TAKEOUT_SWEETS_SECTIONS)),
            ),
          ),
        ),
      ),
    );
  }
}

export function saveTakeoutSweetsSections(sections) {
  localStorage.setItem(TAKEOUT_SWEETS_MENU_STORAGE_KEY, JSON.stringify(sections));
}

/** 全セクションの品目をフラット配列で */
export function flattenTakeoutSections(sections) {
  return (sections || []).flatMap((sec) => sec.items || []);
}
