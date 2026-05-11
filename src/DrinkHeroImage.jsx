import React, { useState } from 'react';
import { publicAssetUrl } from './publicAssetUrl.js';

/**
 * public に無い候補は onError でスキップ（日本語ファイル名の書き出し漏れに強い）
 */
export default function DrinkHeroImage({ candidates, className, imgClassName }) {
  const list = (candidates || []).filter(Boolean);
  const [ix, setIx] = useState(0);

  if (!list.length || ix >= list.length) return null;

  return (
    <div className={className}>
      <img
        src={publicAssetUrl(list[ix])}
        alt=""
        decoding="async"
        loading="lazy"
        className={imgClassName}
        onError={() => setIx((n) => n + 1)}
      />
    </div>
  );
}
