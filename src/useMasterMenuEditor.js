import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { notifyMenuPublished } from './menuMasterBroadcast.js';

export function newMasterItemId() {
  return `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterSectionId() {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterNhSectionId() {
  return `nh-cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterNhItemId() {
  return `nh-it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function catalogEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** ドリンク／飲み放題メニューマスターの編集ロジック（オーナーページ） */
export function useMasterMenuEditor() {
  const { drinkSections: publishedDrink, setDrinkSections, resetDrinkMenuToDefault } = useMenuMaster();
  const { nomihodaiCatalog: publishedNh, setNomihodaiCatalog, resetNomihodaiCatalogToDefault } =
    useNomihodaiCatalog();

  const [draftDrink, setDraftDrink] = useState(() => structuredClone(publishedDrink));
  const [draftNh, setDraftNh] = useState(() => structuredClone(publishedNh));
  const [drinkApplyNotice, setDrinkApplyNotice] = useState(null);
  const [nhApplyNotice, setNhApplyNotice] = useState(null);

  useEffect(() => {
    setDraftDrink(structuredClone(publishedDrink));
  }, [publishedDrink]);

  useEffect(() => {
    setDraftNh(structuredClone(publishedNh));
  }, [publishedNh]);

  const drinkDirty = useMemo(() => !catalogEqual(draftDrink, publishedDrink), [draftDrink, publishedDrink]);
  const nhDirty = useMemo(() => !catalogEqual(draftNh, publishedNh), [draftNh, publishedNh]);

  const applyDrinkMenu = useCallback(() => {
    const next = structuredClone(draftDrink);
    setDrinkSections(next);
    notifyMenuPublished('drink');
    setDrinkApplyNotice('ok');
    window.setTimeout(() => setDrinkApplyNotice(null), 4000);
  }, [draftDrink, setDrinkSections]);

  const discardDrinkDraft = useCallback(() => {
    if (drinkDirty && !window.confirm('未反映のドリンク編集を破棄しますか？')) return;
    setDraftDrink(structuredClone(publishedDrink));
    setDrinkApplyNotice(null);
  }, [drinkDirty, publishedDrink]);

  const applyNomihodaiMenu = useCallback(() => {
    const next = structuredClone(draftNh);
    setNomihodaiCatalog(next);
    notifyMenuPublished('nomihodai');
    setNhApplyNotice('ok');
    window.setTimeout(() => setNhApplyNotice(null), 4000);
  }, [draftNh, setNomihodaiCatalog]);

  const discardNomihodaiDraft = useCallback(() => {
    if (nhDirty && !window.confirm('未反映の飲み放題編集を破棄しますか？')) return;
    setDraftNh(structuredClone(publishedNh));
    setNhApplyNotice(null);
  }, [nhDirty, publishedNh]);

  const updateSection = useCallback((sectionId, patch) => {
    setDraftDrink((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }, []);

  const removeSection = useCallback((sectionId) => {
    if (!window.confirm('このカテゴリと中の品目をすべて削除しますか？')) return;
    setDraftDrink((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const addSection = useCallback(() => {
    const id = newMasterSectionId();
    setDraftDrink((prev) => [
      ...prev,
      {
        id,
        titleEn: 'NEW CATEGORY',
        titleJa: '新規カテゴリ',
        items: [{ id: newMasterItemId(), name: '品名', nameEn: '', price: 500 }],
      },
    ]);
  }, []);

  const updateItem = useCallback((sectionId, itemId, patch) => {
    setDraftDrink((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      })
    );
  }, []);

  const removeItem = useCallback((sectionId, itemId) => {
    setDraftDrink((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.filter((it) => it.id !== itemId) };
      })
    );
  }, []);

  const addItem = useCallback((sectionId) => {
    setDraftDrink((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, { id: newMasterItemId(), name: '品名', nameEn: '', price: 500 }] }
          : s
      )
    );
  }, []);

  const onResetDrinkDefaults = useCallback(() => {
    if (!window.confirm('ドリンクメニューを初期データに戻しますか？（現在の編集は失われます）')) return;
    resetDrinkMenuToDefault();
    notifyMenuPublished('drink');
    setDrinkApplyNotice('ok');
    window.setTimeout(() => setDrinkApplyNotice(null), 4000);
  }, [resetDrinkMenuToDefault]);

  const updateNhSection = useCallback((sectionId, patch) => {
    setDraftNh((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }, []);

  const removeNhSection = useCallback((sectionId) => {
    if (!window.confirm('この飲み放題カテゴリと中の品目をすべて削除しますか？')) return;
    setDraftNh((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const addNhSection = useCallback(() => {
    const id = newMasterNhSectionId();
    setDraftNh((prev) => [
      ...prev,
      {
        id,
        titleEn: 'NEW CATEGORY',
        titleJa: '新規カテゴリ',
        items: [{ id: newMasterNhItemId(), name: '品名', nameEn: '' }],
      },
    ]);
  }, []);

  const updateNhItem = useCallback((sectionId, itemId, patch) => {
    setDraftNh((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      })
    );
  }, []);

  const removeNhItem = useCallback((sectionId, itemId) => {
    setDraftNh((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.filter((it) => it.id !== itemId) };
      })
    );
  }, []);

  const addNhItem = useCallback((sectionId) => {
    setDraftNh((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, { id: newMasterNhItemId(), name: '品名', nameEn: '' }] } : s
      )
    );
  }, []);

  const onResetNhDefaults = useCallback(() => {
    if (!window.confirm('飲み放題メニューを初期データに戻しますか？（現在の編集は失われます）')) return;
    resetNomihodaiCatalogToDefault();
    notifyMenuPublished('nomihodai');
    setNhApplyNotice('ok');
    window.setTimeout(() => setNhApplyNotice(null), 4000);
  }, [resetNomihodaiCatalogToDefault]);

  return {
    drinkSections: draftDrink,
    nomihodaiCatalog: draftNh,
    drinkDirty,
    nhDirty,
    drinkApplyNotice,
    nhApplyNotice,
    applyDrinkMenu,
    discardDrinkDraft,
    applyNomihodaiMenu,
    discardNomihodaiDraft,
    updateSection,
    removeSection,
    addSection,
    updateItem,
    removeItem,
    addItem,
    onResetDrinkDefaults,
    updateNhSection,
    removeNhSection,
    addNhSection,
    updateNhItem,
    removeNhItem,
    addNhItem,
    onResetNhDefaults,
  };
}
