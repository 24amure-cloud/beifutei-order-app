import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';
import { useTakeoutSweetsMenu } from './TakeoutSweetsMenuContext.jsx';
import { useSideDishMenu } from './SideDishMenuContext.jsx';
import { inventoryMapFromSections } from './takeoutSweetsInventoryStorage.js';
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

export function newMasterTakeoutSectionId() {
  return `ts-sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterTakeoutItemId() {
  return `ts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterSideDishSectionId() {
  return `sd-sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMasterSideDishItemId() {
  return `sd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function attachStockToSections(sections, inventoryMap) {
  return (sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).map((it) => ({
      ...it,
      stock:
        typeof inventoryMap?.[it.id] === 'number' && Number.isFinite(inventoryMap[it.id])
          ? Math.floor(inventoryMap[it.id])
          : typeof it.stock === 'number'
            ? it.stock
            : 999,
    })),
  }));
}

function catalogEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** ドリンク／飲み放題メニューマスターの編集ロジック（オーナーページ） */
export function useMasterMenuEditor() {
  const { drinkSections: publishedDrink, setDrinkSections, resetDrinkMenuToDefault } = useMenuMaster();
  const { nomihodaiCatalog: publishedNh, setNomihodaiCatalog, resetNomihodaiCatalogToDefault } =
    useNomihodaiCatalog();
  const {
    takeoutSections: publishedTakeout,
    takeoutInventoryMap: publishedTakeoutInv,
    setTakeoutSections,
    setTakeoutInventoryMap,
    resetTakeoutMenuToDefault,
  } = useTakeoutSweetsMenu();
  const { sideDishSections: publishedSideDish, setSideDishSections, resetSideDishMenuToDefault } =
    useSideDishMenu();

  const [draftDrink, setDraftDrink] = useState(() => structuredClone(publishedDrink));
  const [draftNh, setDraftNh] = useState(() => structuredClone(publishedNh));
  const [draftTakeout, setDraftTakeout] = useState(() =>
    attachStockToSections(publishedTakeout, publishedTakeoutInv)
  );
  const [draftSideDish, setDraftSideDish] = useState(() => structuredClone(publishedSideDish));
  const [drinkApplyNotice, setDrinkApplyNotice] = useState(null);
  const [nhApplyNotice, setNhApplyNotice] = useState(null);
  const [takeoutApplyNotice, setTakeoutApplyNotice] = useState(null);
  const [sideDishApplyNotice, setSideDishApplyNotice] = useState(null);

  useEffect(() => {
    setDraftDrink(structuredClone(publishedDrink));
  }, [publishedDrink]);

  useEffect(() => {
    setDraftNh(structuredClone(publishedNh));
  }, [publishedNh]);

  useEffect(() => {
    setDraftTakeout(attachStockToSections(publishedTakeout, publishedTakeoutInv));
  }, [publishedTakeout, publishedTakeoutInv]);

  useEffect(() => {
    setDraftSideDish(structuredClone(publishedSideDish));
  }, [publishedSideDish]);

  const drinkDirty = useMemo(() => !catalogEqual(draftDrink, publishedDrink), [draftDrink, publishedDrink]);
  const nhDirty = useMemo(() => !catalogEqual(draftNh, publishedNh), [draftNh, publishedNh]);
  const takeoutDirty = useMemo(
    () =>
      !catalogEqual(draftTakeout, attachStockToSections(publishedTakeout, publishedTakeoutInv)) ||
      !catalogEqual(
        inventoryMapFromSections(draftTakeout),
        publishedTakeoutInv
      ),
    [draftTakeout, publishedTakeout, publishedTakeoutInv]
  );
  const sideDishDirty = useMemo(
    () => !catalogEqual(draftSideDish, publishedSideDish),
    [draftSideDish, publishedSideDish]
  );

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

  const applyTakeoutMenu = useCallback(() => {
    const nextSections = structuredClone(draftTakeout).map((sec) => ({
      ...sec,
      items: sec.items.map(({ stock, ...rest }) => rest),
    }));
    const nextInv = inventoryMapFromSections(draftTakeout);
    setTakeoutSections(nextSections);
    setTakeoutInventoryMap(nextInv);
    notifyMenuPublished('takeout');
    setTakeoutApplyNotice('ok');
    window.setTimeout(() => setTakeoutApplyNotice(null), 4000);
  }, [draftTakeout, setTakeoutSections, setTakeoutInventoryMap]);

  const discardTakeoutDraft = useCallback(() => {
    if (takeoutDirty && !window.confirm('未反映のテイクアウト編集を破棄しますか？')) return;
    setDraftTakeout(attachStockToSections(publishedTakeout, publishedTakeoutInv));
    setTakeoutApplyNotice(null);
  }, [takeoutDirty, publishedTakeout, publishedTakeoutInv]);

  const applySideDishMenu = useCallback(() => {
    const next = structuredClone(draftSideDish);
    setSideDishSections(next);
    notifyMenuPublished('sidedish');
    setSideDishApplyNotice('ok');
    window.setTimeout(() => setSideDishApplyNotice(null), 4000);
  }, [draftSideDish, setSideDishSections]);

  const discardSideDishDraft = useCallback(() => {
    if (sideDishDirty && !window.confirm('未反映のサイドメニュー編集を破棄しますか？')) return;
    setDraftSideDish(structuredClone(publishedSideDish));
    setSideDishApplyNotice(null);
  }, [sideDishDirty, publishedSideDish]);

  const updateTakeoutSection = useCallback((sectionId, patch) => {
    setDraftTakeout((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }, []);

  const removeTakeoutSection = useCallback((sectionId) => {
    if (!window.confirm('このカテゴリと中の品目をすべて削除しますか？')) return;
    setDraftTakeout((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const addTakeoutSection = useCallback(() => {
    setDraftTakeout((prev) => [
      ...prev,
      {
        id: newMasterTakeoutSectionId(),
        titleJa: '新規カテゴリ',
        titleKey: '',
        titleStyle: '',
        items: [{ id: newMasterTakeoutItemId(), name: '品名', price: 500, stock: 10, image: '' }],
      },
    ]);
  }, []);

  const updateTakeoutItem = useCallback((sectionId, itemId, patch) => {
    setDraftTakeout((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      })
    );
  }, []);

  const removeTakeoutItem = useCallback((sectionId, itemId) => {
    setDraftTakeout((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.filter((it) => it.id !== itemId) };
      })
    );
  }, []);

  const addTakeoutItem = useCallback((sectionId) => {
    setDraftTakeout((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: [...s.items, { id: newMasterTakeoutItemId(), name: '品名', price: 500, stock: 10, image: '' }],
            }
          : s
      )
    );
  }, []);

  const setTakeoutItemStock = useCallback((sectionId, itemId, stock) => {
    updateTakeoutItem(sectionId, itemId, { stock: Math.max(0, Math.floor(Number(stock) || 0)) });
  }, [updateTakeoutItem]);

  const markTakeoutSoldOut = useCallback((sectionId, itemId) => {
    updateTakeoutItem(sectionId, itemId, { stock: 0 });
  }, [updateTakeoutItem]);

  const onResetTakeoutDefaults = useCallback(() => {
    if (!window.confirm('テイクアウトメニューを初期データに戻しますか？')) return;
    resetTakeoutMenuToDefault();
    notifyMenuPublished('takeout');
    setTakeoutApplyNotice('ok');
    window.setTimeout(() => setTakeoutApplyNotice(null), 4000);
  }, [resetTakeoutMenuToDefault]);

  const updateSideDishSection = useCallback((sectionId, patch) => {
    setDraftSideDish((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }, []);

  const removeSideDishSection = useCallback((sectionId) => {
    if (!window.confirm('このブロックと中の品目をすべて削除しますか？')) return;
    setDraftSideDish((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const addSideDishSection = useCallback(() => {
    setDraftSideDish((prev) => [
      ...prev,
      {
        id: newMasterSideDishSectionId(),
        layout: 'list',
        titleJa: '新規ブロック',
        titleKey: '',
        items: [{ id: newMasterSideDishItemId(), name: '品名', price: 500, image: '' }],
      },
    ]);
  }, []);

  const updateSideDishItem = useCallback((sectionId, itemId, patch) => {
    setDraftSideDish((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      })
    );
  }, []);

  const removeSideDishItem = useCallback((sectionId, itemId) => {
    setDraftSideDish((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.filter((it) => it.id !== itemId) };
      })
    );
  }, []);

  const addSideDishItem = useCallback((sectionId) => {
    setDraftSideDish((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, { id: newMasterSideDishItemId(), name: '品名', price: 500, image: '' }] }
          : s
      )
    );
  }, []);

  const onResetSideDishDefaults = useCallback(() => {
    if (!window.confirm('サイドメニューを初期データに戻しますか？')) return;
    resetSideDishMenuToDefault();
    notifyMenuPublished('sidedish');
    setSideDishApplyNotice('ok');
    window.setTimeout(() => setSideDishApplyNotice(null), 4000);
  }, [resetSideDishMenuToDefault]);

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
    takeoutSections: draftTakeout,
    takeoutDirty,
    takeoutApplyNotice,
    applyTakeoutMenu,
    discardTakeoutDraft,
    updateTakeoutSection,
    removeTakeoutSection,
    addTakeoutSection,
    updateTakeoutItem,
    removeTakeoutItem,
    addTakeoutItem,
    setTakeoutItemStock,
    markTakeoutSoldOut,
    onResetTakeoutDefaults,
    sideDishSections: draftSideDish,
    sideDishDirty,
    sideDishApplyNotice,
    applySideDishMenu,
    discardSideDishDraft,
    updateSideDishSection,
    removeSideDishSection,
    addSideDishSection,
    updateSideDishItem,
    removeSideDishItem,
    addSideDishItem,
    onResetSideDishDefaults,
  };
}
