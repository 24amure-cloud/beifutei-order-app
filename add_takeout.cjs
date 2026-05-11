const fs = require('fs');
const path = require('path');

// 1. Update App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf-8');

const newTakeoutMenu = `// === TAKEOUT SWEETS PAGE COMPONENT ===
function TakeoutSweetsMenu({ addToCart }) {
  const sandwiches = [
    { id: 'ts-straw', name: 'いちごサンド', price: 680, rank: 1, color: '#F48FB1' },
    { id: 'ts-mix', name: 'ミックスサンド', price: 680, rank: 2, color: '#81D4FA' },
    { id: 'ts-mikan', name: 'みかんサンド', price: 630, rank: 3, color: '#FFB74D' },
  ];
  
  const cookieSand = [
    { id: 'ts-cs-choco', name: 'チョコチップ\\nクッキーサンド', price: 450 },
    { id: 'ts-cs-matcha', name: '抹茶ホワイトチョコ\\nクッキーサンド', price: 450 },
    { id: 'ts-cs-straw', name: 'いちごミルク\\nクッキーサンド', price: 450 },
  ];

  const scones = [
    { id: 'ts-sc-plain', name: 'プレーンスコーン', price: 350 },
    { id: 'ts-sc-choco', name: 'チョコスコーン', price: 380 },
    { id: 'ts-sc-tea', name: '紅茶スコーン', price: 380 },
  ];

  const cookies = [
    { id: 'ts-ck-butter', name: '発酵バタークッキー', price: 200 },
    { id: 'ts-ck-cocoa', name: 'ココアクッキー', price: 220 },
    { id: 'ts-ck-nuts', name: 'ナッツクッキー', price: 250 },
  ];

  const renderCard = (item, isRanked = false) => (
    <div className="ts-card" key={item.id}>
      {isRanked && (
        <div className="ts-rank-badge" style={{ color: item.color }}>
          人気<br/>No.{item.rank}
        </div>
      )}
      <div className="ts-img" style={{backgroundImage: \`url("https://via.placeholder.com/150x150/transparent/333?text=\${item.id}")\`}}></div>
      <div className="ts-name">{item.name.split('\\n').map((line, i) => <div key={i}>{line}</div>)}</div>
      <div className="ts-price">￥{item.price}</div>
      <button className="ts-heart-btn" onClick={() => addToCart({ id: item.id, name: item.name.replace('\\n',''), price: item.price })}>♥</button>
    </div>
  );

  return (
    <main className="main-content" style={{ background: 'linear-gradient(135deg, #FFE4E1 0%, #FFF0F5 50%, #F0F8FF 100%)' }}>
      <div className="ts-wrapper">
        <div className="ts-header">
          <h2 className="ts-header-title">♡ お好きな商品を選んでください ♡</h2>
          <p className="ts-header-sub">すべてテイクアウト専用です</p>
        </div>

        <div className="ts-section">
          <div className="ts-section-title"><span>♡</span> おすすめ <span>♡</span></div>
          <div className="ts-grid">
            {sandwiches.map(item => renderCard(item, true))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{background: '#E6E6FA'}}><span>♡</span> クッキーサンド <span>♡</span></div>
          <div className="ts-grid">
            {cookieSand.map(item => renderCard(item))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{background: '#FFE4B5'}}><span>♡</span> スコーン <span>♡</span></div>
          <div className="ts-grid">
            {scones.map(item => renderCard(item))}
          </div>
        </div>

        <div className="ts-section">
          <div className="ts-section-title" style={{background: '#E0FFFF'}}><span>♡</span> クッキー <span>♡</span></div>
          <div className="ts-grid">
            {cookies.map(item => renderCard(item))}
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: '20px'}}>
          <button className="ts-view-all">すべての商品を見る ∨</button>
        </div>
      </div>
    </main>
  );
}

// === MAIN APP COMPONENT ===`;

if (!appCode.includes('TakeoutSweetsMenu')) {
  appCode = appCode.replace('// === MAIN APP COMPONENT ===', newTakeoutMenu);
}

appCode = appCode.replace(
  "fruit: '#D32F2F'      // Red for Fruit Studio",
  "fruit: '#D32F2F',     // Red for Fruit Studio\n    takeout: '#FFA6C9'    // Soft Pink for Takeout Sweets"
);

appCode = appCode.replace(
  "{activeTab === 'fruit' && <FruitStudioMenu addToCart={addToCart} />}",
  "{activeTab === 'fruit' && <FruitStudioMenu addToCart={addToCart} />}\n          {activeTab === 'takeout' && <TakeoutSweetsMenu addToCart={addToCart} />}"
);

const newTabLink = `
          <div className={\`nav-item \${activeTab === 'takeout' ? 'active' : ''}\`} onClick={() => setActiveTab('takeout')} style={{ borderLeftColor: activeTab === 'takeout' ? '#FFA6C9' : 'transparent', backgroundColor: activeTab === 'takeout' ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
            🎁 テイクアウトスイーツ
          </div>
        </nav>`;

appCode = appCode.replace('</nav>', newTabLink);

fs.writeFileSync(appPath, appCode, 'utf-8');

// 2. Update CSS
const cssPath = path.join(__dirname, 'src', 'index.css');
let cssCode = fs.readFileSync(cssPath, 'utf-8');

const newTakeoutCss = `/* --- TAKEOUT SWEETS PAGE STYLES --- */
.ts-wrapper {
  padding: 20px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  color: #7D6B6B;
}

.ts-header {
  text-align: center;
  margin-bottom: 40px;
}
.ts-header-title {
  font-size: 28px;
  font-weight: bold;
  color: #A08080;
  margin-bottom: 10px;
  letter-spacing: 2px;
}
.ts-header-sub {
  font-size: 14px;
  color: #B09C9C;
  letter-spacing: 1px;
}

.ts-section {
  background: rgba(255, 255, 255, 0.4);
  border: 2px solid white;
  border-radius: 24px;
  padding: 40px 20px 20px;
  margin-bottom: 40px;
  position: relative;
  box-shadow: 0 4px 20px rgba(255,192,203,0.3);
}

.ts-section-title {
  position: absolute;
  top: -20px;
  left: 30px;
  background: #FFE4E1;
  color: #8D7272;
  padding: 10px 30px;
  border-radius: 30px;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.ts-section-title span { color: #FFA6C9; }

.ts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.ts-card {
  background: white;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.04);
  transition: 0.2s;
}
.ts-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
}

.ts-rank-badge {
  position: absolute;
  top: 15px;
  left: 15px;
  font-size: 11px;
  font-weight: bold;
  text-align: center;
  line-height: 1.3;
}

.ts-img {
  width: 140px;
  height: 140px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  margin-bottom: 15px;
}

.ts-name {
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 10px;
  height: 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ts-price {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
}

.ts-heart-btn {
  position: absolute;
  bottom: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #FFF0F5;
  color: #FFA6C9;
  border: none;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: 0.2s;
}
.ts-heart-btn:hover {
  background: #FFA6C9;
  color: white;
}

.ts-view-all {
  background: white;
  border: none;
  color: #A08080;
  padding: 15px 40px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: 0.2s;
}
.ts-view-all:hover {
  transform: scale(1.02);
}
`;

if (!cssCode.includes('/* --- TAKEOUT SWEETS PAGE STYLES --- */')) {
  cssCode += '\n\n' + newTakeoutCss;
  fs.writeFileSync(cssPath, cssCode, 'utf-8');
}

console.log('Takeout Sweets Added successfully.');
