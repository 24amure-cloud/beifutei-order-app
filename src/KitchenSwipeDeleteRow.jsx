import React, { useRef, useState } from 'react';

const DELETE_WIDTH = 76;

/**
 * 左スワイプで削除ボタンを表示（伝票行・口頭注文リスト向け）
 */
export default function KitchenSwipeDeleteRow({
  children,
  onDelete,
  deleteLabel = '削除',
  className = '',
  surfaceClassName = '',
}) {
  const [offset, setOffset] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);

  const clamp = (v) => Math.max(-DELETE_WIDTH, Math.min(0, v));

  const snap = (value) => (value < -DELETE_WIDTH * 0.35 ? -DELETE_WIDTH : 0);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging.current = true;
    startX.current = e.clientX;
    startOffset.current = offset;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    setOffset(clamp(startOffset.current + dx));
  };

  const endDrag = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    setOffset((cur) => snap(cur));
  };

  const handleDelete = () => {
    onDelete?.();
    setOffset(0);
  };

  return (
    <div className={`kitchen-swipe-row${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="kitchen-swipe-row__delete"
        onClick={handleDelete}
        tabIndex={offset < 0 ? 0 : -1}
        aria-hidden={offset >= 0}
      >
        {deleteLabel}
      </button>
      <div
        className={`kitchen-swipe-row__surface${surfaceClassName ? ` ${surfaceClassName}` : ''}${dragging.current ? ' kitchen-swipe-row__surface--drag' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}
