import React from 'react';

const box = {
  padding: '32px 20px',
  maxWidth: 560,
  margin: '0 auto',
  fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif",
  lineHeight: 1.65,
  background: '#fff8f0',
  minHeight: '100vh',
  boxSizing: 'border-box',
  color: '#2a2419',
};

/**
 * Vercel 等で VITE_* がビルドに入っていないときの案内（真っ白画面の代替）
 */
export default function SupabaseConfigMissingScreen() {
  return (
    <div style={box}>
      <h1 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Supabase の接続設定がありません</h1>
      <p style={{ marginBottom: 12 }}>
        このアプリはビルド時に <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> が必要です。
      </p>
      <ol style={{ paddingLeft: 22, margin: '0 0 16px' }}>
        <li style={{ marginBottom: 8 }}>
          <strong>Vercel</strong> → このプロジェクト → <strong>Settings → Environment Variables</strong>
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Key</strong> は <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> のみ（先頭に{' '}
          <code>https://</code> を付けない）
        </li>
        <li style={{ marginBottom: 8 }}>
          各変数の <strong>Environment</strong> に <strong>Production</strong> にチェック
        </li>
        <li>
          <strong>Deployments → Redeploy</strong>（できれば「Use existing Build Cache」をオフ）
        </li>
      </ol>
      <p style={{ fontSize: 14, color: '#555' }}>
        ローカルではリポジトリ直下の <code>.env</code> に同じ名前で保存します（Git には含めません）。
      </p>
    </div>
  );
}
