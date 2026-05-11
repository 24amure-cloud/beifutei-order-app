const fs = require('fs');
const path = require('path');

// 1. Update App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf-8');

const newCafeMenu = `// === CAFE PAGE COMPONENT ===
function CafeMenu({ addToCart }) {
  const [opts, setOpts] = useState({
    americano: { temp: 'hot', size: 'M', price: 420 },
    latte: { temp: 'hot', size: 'M', price: 540 },
    strawberry: { size: 'M', price: 580 },
    chocolata: { temp: 'hot', size: 'M', price: 580 },
  });

  const updateOpt = (id, field, val) => {
    setOpts(prev => {
      const next = { ...prev[id], [field]: val };
      if (id === 'americano') next.price = next.size === 'M' ? 420 : 540;
      if (id === 'latte') next.price = next.size === 'M' ? 540 : 640;
      if (id === 'strawberry') next.price = next.size === 'M' ? 580 : 680;
      if (id === 'chocolata') next.price = next.size === 'M' ? 580 : 680;
      return { ...prev, [id]: next };
    });
  };

  return (
    <main className="main-content" style={{ background: '#FAF6ED' }}>
      <div className="cafe-wrapper">
        
        {/* Header */}
        <div className="cafe-header">
          <div className="cafe-header-top">
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>当店の牛乳は</span>
            <h2 className="cafe-header-title">北海道産ジャージーミルク！</h2>
          </div>
          <p className="cafe-header-subtitle">
            コクがありながらスッキリとした味わいの<br />
            濃厚なジャージーミルクを使用しています。
          </p>
          <div className="cafe-hokkaido-icon">
            HOKKAIDO
          </div>
        </div>

        {/* Americano */}
        <div className="cafe-card cafe-card-bg-beige">
          <div className="cafe-card-top">
            <div className="cafe-img-area" style={{ width: '180px' }}>
              <div className="cafe-img-placeholder" style={{backgroundImage: 'url("https://via.placeholder.com/150x200/A08060/fff?text=Americano")', backgroundSize: 'cover', backgroundPosition: 'center', height: '180px', width: '150px'}}></div>
              <div className="cafe-badge badge-green">エスプレッソの<br/>香り豊かな<br/>本格派コーヒー</div>
            </div>
            <div className="cafe-card-content">
              <h3 className="cafe-title">アメリカーノ</h3>
              <p className="cafe-subtitle">Americano</p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <p className="cafe-desc" style={{ flex: 1 }}>
                  グァテマラ産<br />中深入り豆<br />ホット or アイス
                </p>
                <div className="cafe-price-info" style={{ flex: 1, fontSize: '16px' }}>
                  <div style={{ marginBottom: '5px' }}>M 420yen</div>
                  <div>L 540yen</div>
                </div>
              </div>
            </div>
          </div>

          <div className="cafe-actions-row">
            <div className="cafe-toggles">
              <div className="cafe-toggle-group">
                <button className={\`cafe-toggle-btn hot \${opts.americano.temp === 'hot' ? 'active' : ''}\`} onClick={() => updateOpt('americano', 'temp', 'hot')}>HOT</button>
                <button className={\`cafe-toggle-btn ice \${opts.americano.temp === 'ice' ? 'active' : ''}\`} onClick={() => updateOpt('americano', 'temp', 'ice')}>ICE</button>
              </div>
              <div className="cafe-toggle-group">
                <button className={\`cafe-size-btn \${opts.americano.size === 'M' ? 'active' : ''}\`} onClick={() => updateOpt('americano', 'size', 'M')}>M</button>
                <button className={\`cafe-size-btn \${opts.americano.size === 'L' ? 'active' : ''}\`} onClick={() => updateOpt('americano', 'size', 'L')}>L</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="cafe-price-display">{opts.americano.price}<span>yen〜</span></div>
              <button className="cafe-order-btn" onClick={() => addToCart({ id: \`cafe-ameri-\${opts.americano.temp}-\${opts.americano.size}\`, name: \`アメリカーノ (\${opts.americano.temp.toUpperCase()}/\${opts.americano.size})\`, price: opts.americano.price })}>
                ＋ 注文する
              </button>
            </div>
          </div>
        </div>

        <div className="cafe-grid-2">
          {/* Cafe Latte */}
          <div className="cafe-card cafe-card-bg-blue">
            <div className="cafe-card-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">カフェラテ</h3>
                <p className="cafe-subtitle">Cafe Latte</p>
                <p className="cafe-desc">エスプレッソに<br/>北海道産の<br/>濃厚ジャージーミルク<br/>ホット or アイス</p>
              </div>
              <div className="cafe-img-area">
                <div className="cafe-img-placeholder" style={{backgroundImage: 'url("https://via.placeholder.com/120x150/789BA0/fff?text=Latte")', backgroundSize: 'cover', height: '140px'}}></div>
                <div className="cafe-badge badge-green" style={{ bottom: '-15px', right: '-5px' }}>ミルクの<br/>コクとエスプレッソの<br/>風味がマッチ！</div>
              </div>
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <div className="cafe-toggle-group">
                  <button className={\`cafe-toggle-btn hot \${opts.latte.temp === 'hot' ? 'active' : ''}\`} onClick={() => updateOpt('latte', 'temp', 'hot')}>HOT</button>
                  <button className={\`cafe-toggle-btn ice \${opts.latte.temp === 'ice' ? 'active' : ''}\`} onClick={() => updateOpt('latte', 'temp', 'ice')}>ICE</button>
                </div>
                <div className="cafe-toggle-group">
                  <button className={\`cafe-size-btn \${opts.latte.size === 'M' ? 'active' : ''}\`} onClick={() => updateOpt('latte', 'size', 'M')}>M</button>
                  <button className={\`cafe-size-btn \${opts.latte.size === 'L' ? 'active' : ''}\`} onClick={() => updateOpt('latte', 'size', 'L')}>L</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="cafe-price-display">{opts.latte.price}<span>yen〜</span></div>
                <button className="cafe-order-btn" onClick={() => addToCart({ id: \`cafe-latte-\${opts.latte.temp}-\${opts.latte.size}\`, name: \`カフェラテ (\${opts.latte.temp.toUpperCase()}/\${opts.latte.size})\`, price: opts.latte.price })}>＋ 注文する</button>
              </div>
            </div>
          </div>

          {/* Strawberry Milk */}
          <div className="cafe-card cafe-card-bg-pink">
            <div className="cafe-card-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title">生いちごミルク</h3>
                <p className="cafe-subtitle">Fresh Strawberry Milk</p>
                <p className="cafe-desc">自家製いちごソース使用<br/>リッチな苺みるく</p>
                <p className="cafe-price-info" style={{ marginTop: '10px' }}>M or L<br/>580yen / 680yen</p>
              </div>
              <div className="cafe-img-area">
                <div className="cafe-img-placeholder" style={{backgroundImage: 'url("https://via.placeholder.com/120x150/D65A6E/fff?text=Strawberry")', backgroundSize: 'cover', height: '140px'}}></div>
                <div className="cafe-badge badge-pink" style={{ width: '80px', height: '80px', bottom: '-10px', right: '0px' }}>いちごの甘酸っぱさと<br/>ミルクのまろやかさが<br/>絶妙！</div>
              </div>
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <div className="cafe-toggle-group">
                  <button className={\`cafe-size-btn \${opts.strawberry.size === 'M' ? 'active' : ''}\`} onClick={() => updateOpt('strawberry', 'size', 'M')}>M</button>
                  <button className={\`cafe-size-btn \${opts.strawberry.size === 'L' ? 'active' : ''}\`} onClick={() => updateOpt('strawberry', 'size', 'L')}>L</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="cafe-price-display">{opts.strawberry.price}<span>yen〜</span></div>
                <button className="cafe-order-btn" onClick={() => addToCart({ id: \`cafe-straw-\${opts.strawberry.size}\`, name: \`生いちごミルク (\${opts.strawberry.size})\`, price: opts.strawberry.price })}>＋ 注文する</button>
              </div>
            </div>
          </div>

          {/* Latte Chocolata */}
          <div className="cafe-card cafe-card-bg-beige">
            <div className="cafe-card-top">
              <div className="cafe-card-content">
                <h3 className="cafe-title" style={{ fontSize: '20px' }}>ラテチョコラータ</h3>
                <p className="cafe-subtitle" style={{ fontSize: '14px' }}>Latte Chocolata</p>
                <p className="cafe-desc">濃厚チョコソースと<br/>ジャージーミルク使用</p>
                <p className="cafe-price-info" style={{ marginTop: '10px' }}>M or L<br/>580yen / 680yen</p>
              </div>
              <div className="cafe-img-area">
                <div className="cafe-img-placeholder" style={{backgroundImage: 'url("https://via.placeholder.com/120x150/7D5B41/fff?text=Choco")', backgroundSize: 'cover', height: '140px'}}></div>
                <div className="cafe-badge badge-brown" style={{ bottom: '-15px', right: '-15px' }}>濃厚チョコと<br/>ミルクのまろやかさ<br/>がクセになる！</div>
              </div>
            </div>
            <div className="cafe-actions-row">
              <div className="cafe-toggles">
                <div className="cafe-toggle-group">
                  <button className={\`cafe-toggle-btn hot \${opts.chocolata.temp === 'hot' ? 'active' : ''}\`} onClick={() => updateOpt('chocolata', 'temp', 'hot')}>HOT</button>
                  <button className={\`cafe-toggle-btn ice \${opts.chocolata.temp === 'ice' ? 'active' : ''}\`} onClick={() => updateOpt('chocolata', 'temp', 'ice')}>ICE</button>
                </div>
                <div className="cafe-toggle-group">
                  <button className={\`cafe-size-btn \${opts.chocolata.size === 'M' ? 'active' : ''}\`} onClick={() => updateOpt('chocolata', 'size', 'M')}>M</button>
                  <button className={\`cafe-size-btn \${opts.chocolata.size === 'L' ? 'active' : ''}\`} onClick={() => updateOpt('chocolata', 'size', 'L')}>L</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="cafe-price-display">{opts.chocolata.price}<span>yen〜</span></div>
                <button className="cafe-order-btn" onClick={() => addToCart({ id: \`cafe-choco-\${opts.chocolata.temp}-\${opts.chocolata.size}\`, name: \`ラテチョコラータ (\${opts.chocolata.temp.toUpperCase()}/\${opts.chocolata.size})\`, price: opts.chocolata.price })}>＋ 注文する</button>
              </div>
            </div>
          </div>

          {/* More Recommendations */}
          <div className="cafe-card cafe-card-bg-white cafe-more-card">
            <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>他にもおすすめがたくさん！</p>
            <hr style={{ border: 'none', borderTop: '1px dashed #ccc' }} />
            <div className="cafe-more-icons">
              <div className="cafe-icon-item">
                <div className="cafe-icon-circle">🌿</div>
                <span>季節限定ドリンク</span>
              </div>
              <div className="cafe-icon-item">
                <div className="cafe-icon-circle">🍰</div>
                <span>フード・スイーツ</span>
              </div>
              <div className="cafe-icon-item">
                <div className="cafe-icon-circle">＋</div>
                <span>カスタマイズ</span>
              </div>
            </div>
            <button className="cafe-see-all-btn">すべてのメニューを見る ＞</button>
          </div>
        </div>
      </div>
    </main>
  );
}

// === MAIN APP COMPONENT ===
function App() {`;

const startIndex = appCode.indexOf('// === CAFE PAGE COMPONENT ===');
const endIndex = appCode.indexOf('// === MAIN APP COMPONENT ===\nfunction App() {');

if (startIndex !== -1 && endIndex !== -1) {
  appCode = appCode.substring(0, startIndex) + newCafeMenu + appCode.substring(endIndex + 30);
  fs.writeFileSync(appPath, appCode, 'utf-8');
  console.log('App.jsx updated successfully.');
} else {
  console.log('Could not find boundaries in App.jsx');
}

// 2. Update index.css
const cssPath = path.join(__dirname, 'src', 'index.css');
let cssCode = fs.readFileSync(cssPath, 'utf-8');

const newCafeCss = `/* --- CAFE PAGE STYLES --- */
.cafe-wrapper {
  background-color: #FAF6ED;
  padding: 30px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  color: #3D2B1F;
}

.cafe-header {
  text-align: center;
  margin-bottom: 25px;
  position: relative;
}

.cafe-header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 5px;
}

.cafe-header-title {
  color: #D35450;
  font-size: 32px;
  font-weight: bold;
}

.cafe-header-subtitle {
  font-size: 15px;
  color: #555;
  line-height: 1.6;
}

.cafe-hokkaido-icon {
  position: absolute;
  right: 10px;
  top: 0;
  width: 70px;
  height: 80px;
  background: #4A9B94;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 15px;
  font-size: 10px;
  font-weight: bold;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
}

.cafe-card {
  border-radius: 12px;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  position: relative;
  border: 2px solid white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
}

.cafe-card-bg-beige { background-color: #F3EBD9; }
.cafe-card-bg-blue { background-color: #E2F0ED; }
.cafe-card-bg-pink { background-color: #FBE6EA; }
.cafe-card-bg-white { background-color: #FFFFFF; }

.cafe-card-top {
  display: flex;
  gap: 20px;
}

.cafe-card-content {
  flex: 1;
}

.cafe-title {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 0px;
}

.cafe-subtitle {
  font-family: 'Brush Script MT', cursive;
  font-size: 18px;
  color: #A48D75;
  margin-bottom: 15px;
}

.cafe-desc {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 10px;
  color: #444;
}

.cafe-price-info {
  font-size: 16px;
  font-weight: bold;
}

.cafe-img-area {
  width: 140px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cafe-img-placeholder {
  width: 130px;
  height: 150px;
  background: transparent;
  border-radius: 10px;
}

.cafe-badge {
  position: absolute;
  width: 85px;
  height: 85px;
  border-radius: 50%;
  color: white;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  transform: rotate(-10deg);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  font-weight: bold;
  line-height: 1.3;
}

.badge-green { background-color: #6B9B88; }
.badge-pink { background-color: #D65A6E; }
.badge-brown { background-color: #7D5B41; }

.cafe-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
  background: white;
  padding: 8px 15px;
  border-radius: 30px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.cafe-toggles {
  display: flex;
  gap: 20px;
  align-items: center;
}

.cafe-toggle-group {
  display: flex;
  gap: 15px;
  align-items: center;
}

.cafe-toggle-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  color: #888;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cafe-toggle-btn::before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ddd;
}

.cafe-toggle-btn.hot.active::before { background: #D35450; }
.cafe-toggle-btn.ice.active::before { background: #5D9CEC; }

.cafe-toggle-btn.hot.active { color: #333; }
.cafe-toggle-btn.ice.active { color: #333; }

.cafe-size-btn {
  background: #EAE2D3;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}
.cafe-size-btn.active {
  background: #B69268;
}

.cafe-price-display {
  font-size: 20px;
  font-weight: bold;
}
.cafe-price-display span { font-size: 13px; font-weight: normal; }

.cafe-order-btn {
  border: 1px solid #C4B9A7;
  background: white;
  color: #3D2B1F;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
}

.cafe-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.cafe-more-card {
  text-align: center;
  padding: 25px 20px;
  border: 2px dashed #E8E2D2;
}

.cafe-more-icons {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
}
.cafe-icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  gap: 8px;
  font-weight: bold;
  color: #333;
}
.cafe-icon-circle {
  width: 45px;
  height: 45px;
  border: 2px solid #555;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #555;
}

.cafe-see-all-btn {
  border: 1px solid #DDD;
  background: white;
  padding: 12px 0;
  border-radius: 30px;
  width: 90%;
  margin: 0 auto;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  color: #777;
}
/* side-dish specific styles */`;

const cssStartIndex = cssCode.indexOf('/* --- CAFE PAGE STYLES --- */');
const cssEndIndex = cssCode.indexOf('/* side-dish specific styles */');

if (cssStartIndex !== -1 && cssEndIndex !== -1) {
  cssCode = cssCode.substring(0, cssStartIndex) + newCafeCss + cssCode.substring(cssEndIndex + 31);
  fs.writeFileSync(cssPath, cssCode, 'utf-8');
  console.log('index.css updated successfully.');
} else {
  console.log('Could not find boundaries in index.css');
}
