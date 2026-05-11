import { useCallback } from 'react';
import { useMenuMaster } from './MenuMasterContext.jsx';
import { useNomihodaiCatalog } from './NomihodaiCatalogContext.jsx';

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

/** ドリンク／飲み放題メニューマスターの編集ロジック（オーナーページ・厨房ハブ共通） */
export function useMasterMenuEditor() {
  const { drinkSections, setDrinkSections, resetDrinkMenuToDefault } = useMenuMaster();
  const { nomihodaiCatalog, setNomihodaiCatalog, resetNomihodaiCatalogToDefault } = useNomihodaiCatalog();

  const updateSection = useCallback(
    (sectionId, patch) => {
      setDrinkSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
    },
    [setDrinkSections]
  );

  const removeSection = useCallback(
    (sectionId) => {
      if (!window.confirm('このカテゴリと中の品目をすべて削除しますか？')) return;
      setDrinkSections((prev) => prev.filter((s) => s.id !== sectionId));
    },
    [setDrinkSections]
  );

  const addSection = useCallback(() => {
    const id = newMasterSectionId();
    setDrinkSections((prev) => [
      ...prev,
      {
        id,
        titleEn: 'NEW CATEGORY',
        titleJa: '新規カテゴリ',
        items: [{ id: newMasterItemId(), name: '品名', price: 500 }],
      },
    ]);
  }, [setDrinkSections]);

  const updateItem = useCallback(
    (sectionId, itemId, patch) => {
      setDrinkSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          };
        })
      );
    },
    [setDrinkSections]
  );

  const removeItem = useCallback(
    (sectionId, itemId) => {
      setDrinkSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return { ...s, items: s.items.filter((it) => it.id !== itemId) };
        })
      );
    },
    [setDrinkSections]
  );

  const addItem = useCallback(
    (sectionId) => {
      setDrinkSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, items: [...s.items, { id: newMasterItemId(), name: '品名', price: 500 }] }
            : s
        )
      );
    },
    [setDrinkSections]
  );

  const onResetDrinkDefaults = useCallback(() => {
    if (!window.confirm('ドリンクメニューを初期データに戻しますか？（現在の編集は失われます）')) return;
    resetDrinkMenuToDefault();
  }, [resetDrinkMenuToDefault]);

  const updateNhSection = useCallback(
    (sectionId, patch) => {
      setNomihodaiCatalog((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
    },
    [setNomihodaiCatalog]
  );

  const removeNhSection = useCallback(
    (sectionId) => {
      if (!window.confirm('この飲み放題カテゴリと中の品目をすべて削除しますか？')) return;
      setNomihodaiCatalog((prev) => prev.filter((s) => s.id !== sectionId));
    },
    [setNomihodaiCatalog]
  );

  const addNhSection = useCallback(() => {
    const id = newMasterNhSectionId();
    setNomihodaiCatalog((prev) => [
      ...prev,
      {
        id,
        titleEn: 'NEW CATEGORY',
        titleJa: '新規カテゴリ',
        items: [{ id: newMasterNhItemId(), name: '品名' }],
      },
    ]);
  }, [setNomihodaiCatalog]);

  const updateNhItem = useCallback(
    (sectionId, itemId, patch) => {
      setNomihodaiCatalog((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          };
        })
      );
    },
    [setNomihodaiCatalog]
  );

  const removeNhItem = useCallback(
    (sectionId, itemId) => {
      setNomihodaiCatalog((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return { ...s, items: s.items.filter((it) => it.id !== itemId) };
        })
      );
    },
    [setNomihodaiCatalog]
  );

  const addNhItem = useCallback(
    (sectionId) => {
      setNomihodaiCatalog((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, items: [...s.items, { id: newMasterNhItemId(), name: '品名' }] } : s
        )
      );
    },
    [setNomihodaiCatalog]
  );

  const onResetNhDefaults = useCallback(() => {
    if (!window.confirm('飲み放題メニューを初期データに戻しますか？（現在の編集は失われます）')) return;
    resetNomihodaiCatalogToDefault();
  }, [resetNomihodaiCatalogToDefault]);

  return {
    drinkSections,
    nomihodaiCatalog,
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
