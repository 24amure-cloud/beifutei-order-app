import React from 'react';

const shell = {
  padding: '24px 18px',
  maxWidth: 720,
  margin: '0 auto',
  fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif",
  lineHeight: 1.6,
  minHeight: '100vh',
  boxSizing: 'border-box',
  background: '#1a1210',
  color: '#f5ebe0',
};

/**
 * 本番ビルドでは React の赤いオーバーレイが出ないため、描画エラー時に真っ黒／背景のみに見えるのを防ぐ。
 */
export default class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[beifutei] RootErrorBoundary', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={shell}>
        <h1 style={{ fontSize: '1.15rem', marginBottom: 12 }}>画面の表示中にエラーが発生しました</h1>
        <p style={{ marginBottom: 10, opacity: 0.95 }}>
          再読み込みを試すか、ブラウザの開発者ツール（Console）の赤いメッセージを控えてください。
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 13,
            background: 'rgba(0,0,0,0.35)',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {String(error?.message || error)}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 18px',
            fontSize: 15,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: '#e8a598',
            color: '#2a1814',
            fontWeight: 600,
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }
}
