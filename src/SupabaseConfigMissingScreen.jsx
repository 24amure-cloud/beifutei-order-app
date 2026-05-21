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
        このアプリはビルド時に Supabase の <strong>URL</strong> と <strong>公開キー</strong>（anon または publishable）が必要です。
        変数名は次の<strong>どれか一組</strong>なら Vercel 側でそのまま使えます（ビルドで <code>import.meta.env.VITE_*</code> に流れます）。
      </p>
      <ul style={{ margin: '0 0 12px', paddingLeft: 22, fontSize: 14 }}>
        <li>
          <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code>（おすすめ）
        </li>
        <li>
          <code>SUPABASE_URL</code> + <code>SUPABASE_ANON_KEY</code> または <code>SUPABASE_PUBLISHABLE_KEY</code>
        </li>
        <li>
          <code>SUPABASE_URL</code> + <code>SUPABASE_KEY</code>（ドキュメントの旧例向け。値は公開キーのみ）
        </li>
      </ul>
      <p style={{ marginBottom: 12, fontSize: 14, opacity: 0.92 }}>
        <strong>Vercel</strong> の Environment Variables は、開いている URLが <strong>Preview</strong> なら
        <strong>Preview</strong> にも、<strong>Production</strong> なら <strong>Production</strong> にも同じ変数を付けてください（片方だけだと
        Preview のスタッフページが真っ白になります）。
      </p>
      <p style={{ marginBottom: 12, fontSize: 14, opacity: 0.92 }}>
        スタッフ（厨房）は <code>/kitchen.html</code>（または <code>/kitchen</code>）です。<code>/</code> だけは客席用です。
      </p>
      <ol style={{ paddingLeft: 22, margin: '0 0 16px' }}>
        <li style={{ marginBottom: 8 }}>
          <strong>Vercel</strong> → このプロジェクト → <strong>Settings → Environment Variables</strong>
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Key（変数名）</strong>は英字・数字・<code>_</code> だけ（ハイフン不可）。上のどれかと<strong>完全一致</strong>で2行追加。
          <strong>Value</strong> だけに URL／キーを貼る（名前欄に <code>=</code> や URL を書かない）。
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>URL の値</strong>は <code>https://xxxx.supabase.co</code> まで。<strong>/rest/v1 は付けない</strong>
          （付けると厨房ログに <code>PGRST125 Invalid path</code> が出ます）。
        </li>
        <li style={{ marginBottom: 8 }}>
          各変数の <strong>Environment</strong> に <strong>Production</strong> にチェック
        </li>
        <li>
          <strong>Deployments → Redeploy</strong>（できれば「Use existing Build Cache」をオフ）
        </li>
      </ol>
      <p style={{ marginBottom: 12, fontSize: 14, color: '#8b2500' }}>
        <strong>注文が送れない・厨房が「DB未設定」のとき：</strong>
        ビルドに埋め込まれた Supabase が、マイグレーション済みのプロジェクトと<strong>違う</strong>ことがあります。ローカルの{' '}
        <code>.env</code> の URL（例: <code>…bzzblbub…supabase.co</code>）と、Vercel の変数が<strong>同じホスト名</strong>
        か確認してから Redeploy してください。
      </p>
      <p style={{ fontSize: 14, color: '#555' }}>
        ローカルではリポジトリ直下の <code>.env</code> に同じ名前で保存します（Git には含めません）。
      </p>
    </div>
  );
}
