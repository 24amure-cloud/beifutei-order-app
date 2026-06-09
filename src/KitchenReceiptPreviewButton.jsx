import React from 'react';
import { openReceiptHtmlPreview, receiptPreviewBlockedMessageJa } from './receiptPrint.js';

/**
 * レシート HTML を別タブでプレビュー（iPad / PC どちらでも可）
 */
export default function KitchenReceiptPreviewButton({
  payload,
  className = '',
  label = 'レシート見本',
  compact = false,
}) {
  const onClick = () => {
    const res = openReceiptHtmlPreview(payload);
    if (!res.ok) window.alert(receiptPreviewBlockedMessageJa());
  };

  return (
    <button
      type="button"
      className={`kitchen-receipt-preview-btn${compact ? ' kitchen-receipt-preview-btn--compact' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
