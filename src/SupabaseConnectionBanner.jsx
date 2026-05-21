import React from 'react';
import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

/** 客席・厨房：DB 接続不良時の全幅バナー */
export default function SupabaseConnectionBanner({ variant = 'guest' }) {
  const { dbConnection } = useNomihodaiSession();
  if (!dbConnection || dbConnection.ok) return null;

  return (
    <div
      className={`supabase-conn-banner supabase-conn-banner--${variant}`}
      role="alert"
      aria-live="assertive"
    >
      <strong className="supabase-conn-banner__title">
        {variant === 'kitchen' ? '注文サーバーに接続できません' : 'ただいま注文を送れません'}
      </strong>
      <p className="supabase-conn-banner__body">{dbConnection.message}</p>
      {variant === 'guest' ? (
        <p className="supabase-conn-banner__hint">スタッフにお声がけください。厨房タブレットの接続表示もご確認ください。</p>
      ) : (
        <p className="supabase-conn-banner__hint">
          Vercel → Environment Variables で <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>{' '}
          を正しい Supabase プロジェクトに合わせ、Production と Preview 両方に設定してから Redeploy してください。
        </p>
      )}
    </div>
  );
}
