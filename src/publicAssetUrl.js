const ASSET_BASE = import.meta.env.BASE_URL;

/** public 直下のパス（日本語ファイル名はセグメントごとに encodeURIComponent） */
export function publicAssetUrl(path) {
  const normalized = String(path).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return ASSET_BASE || '/';
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const base = ASSET_BASE || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${encoded}`;
}
