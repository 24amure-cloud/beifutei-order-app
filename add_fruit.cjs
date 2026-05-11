const fs = require('fs');
const path = require('path');

// 1. Update App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf-8');

const newFruitMenu = `// === FRUIT STUDIO PAGE COMPONENT ===
function FruitStudioMenu({ addToCart }) {
  const [opts, setOpts] = useState({
    soft: { type: 'コーン', price: 460 },
    fruit: { size: 'レギュラー', price: 880 }
  });

  return (
    <main className="main-content" style={{ background: '#F8F1E5', backgroundImage: 'radial-gradient(#E8DCC4 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="fruit-wrapper">
        
        {/* Hero */}
        <div className="fruit-hero">
          <div style={{ flex: 1, zIndex: 2 }}>
            <div className="fruit-ribbon-red">新鮮 フルーツを贅沢に！</div>
            <h2 className="fruit-hero-title">本日のフルーツソフト</h2>
            <p className="fruit-hero-desc">新鮮フルーツの上に<br/>ジェラ生ソフトを乗せました</p>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>ミニ or レギュラー</div>
            <div className="fruit-hero-price">660yen / 880yen</div>
            <p className="fruit-hero-note">ご提供できるフルーツは日替わりです。</p>
          </div>
          <div className="fruit-hero-img-area">
            <div className="fruit-hokkaido-badge">HOKKAIDO</div>
            <div className="fruit-hero-img" style={{ backgroundImage: 'url("https://via.placeholder.com/250x250/transparent/333?text=FruitSoft")' }}></div>
          </div>
        </div>

        {/* 3 Cards */}
        <div className="fruit-grid-3">
          
          {/* Card 1 */}
          <div className="fruit-card">
            <div className="fruit-ribbon-orange">北海道十勝ミルク使用</div>
            <div className="fruit-badge-round" style={{left: '5px', top: '25px'}}>TOKACHI<br/>MILK</div>
            <div className="fruit-card-img" style={{ backgroundImage: 'url("https://via.placeholder.com/150x150/transparent/333?text=SoftCream")', marginTop: '30px' }}></div>
            <h3 className="fruit-card-title">ジェラ生ソフト</h3>
            <p className="fruit-card-desc">北海道産十勝ミルクを原料とした<br/>ふわもこ自家製ソフトクリーム</p>
            <div className="fruit-card-price" style={{ marginTop: 'auto' }}>カップ or コーン<br/>460yen</div>
            <button className="fruit-btn-orange" onClick={() => addToCart({ id: 'fr-soft', name: 'ジェラ生ソフト', price: 460 })}>
              <span>注文する</span><span style={{background: 'rgba(255,255,255,0.3)', borderRadius:'50%', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px'}}>＞</span>
            </button>
          </div>

          {/* Card 2 */}
          <div className="fruit-card">
            <div className="fruit-card-img" style={{ backgroundImage: 'url("https://via.placeholder.com/150x150/transparent/333?text=Affogato")' }}></div>
            <h3 className="fruit-card-title">アフォガード</h3>
            <p className="fruit-card-desc">ジェラ生ソフトに<br/>ほろ苦いエスプレッソを注ぎます</p>
            <div className="fruit-card-price" style={{ marginTop: 'auto' }}>680yen</div>
            <button className="fruit-btn-teal" onClick={() => addToCart({ id: 'fr-affogato', name: 'アフォガード', price: 680 })}>
              <span>注文する</span><span style={{background: 'rgba(255,255,255,0.3)', borderRadius:'50%', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px'}}>＞</span>
            </button>
          </div>

          {/* Card 3 */}
          <div className="fruit-card">
            <div className="fruit-badge-pink">人気<br/>No.1</div>
            <h3 className="fruit-card-title" style={{ marginTop: '10px' }}>本日のフルーツソフト</h3>
            <p className="fruit-card-desc">新鮮フルーツの上に<br/>ジェラ生ソフトを乗せました</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', marginBottom: '15px' }}>
              <div className="fruit-card-img" style={{ backgroundImage: 'url("https://via.placeholder.com/150x150/transparent/333?text=FruitSoft")', flex: 1, margin: 0, height: '100px' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                <div className={\`fruit-toggle-btn \${opts.fruit.size === 'ミニ' ? 'active' : ''}\`} onClick={() => setOpts({...opts, fruit: {size: 'ミニ', price: 660}})}>
                  <span>ミニ</span><span>660yen</span>
                </div>
                <div className={\`fruit-toggle-btn \${opts.fruit.size === 'レギュラー' ? 'active' : ''}\`} onClick={() => setOpts({...opts, fruit: {size: 'レギュラー', price: 880}})}>
                  <span>レギュラー</span><span>880yen</span>
                </div>
              </div>
            </div>
            <button className="fruit-btn-pink" onClick={() => addToCart({ id: \`fr-fruit-\${opts.fruit.size}\`, name: \`本日のフルーツソフト (\${opts.fruit.size})\`, price: opts.fruit.price })}>
              <span>注文する</span><span style={{background: 'rgba(255,255,255,0.3)', borderRadius:'50%', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px'}}>＞</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="fruit-footer">
          <div className="fruit-footer-item">
            <div className="fruit-footer-icon">🍓</div>
            <div className="fruit-footer-text">
              <h4>新鮮フルーツ</h4>
              <p>毎朝仕入れた<br/>旬のフルーツを使用</p>
            </div>
          </div>
          <div className="fruit-footer-item">
            <div className="fruit-footer-icon">🥛</div>
            <div className="fruit-footer-text">
              <h4>北海道産ミルク</h4>
              <p>十勝ミルクの濃厚で<br/>やさしい味わい</p>
            </div>
          </div>
          <div className="fruit-footer-item">
            <div className="fruit-footer-icon">🌿</div>
            <div className="fruit-footer-text">
              <h4>自家製ソフト</h4>
              <p>ふわふわなめらかな<br/>ジェラ生ソフト</p>
            </div>
          </div>
          <div className="fruit-footer-item">
            <div className="fruit-footer-icon">👍</div>
            <div className="fruit-footer-text">
              <h4>当店人気No.1</h4>
              <p>迷ったらコレ！<br/>おすすめです♪</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

// === MAIN APP COMPONENT ===`;

// Insert the component before MAIN APP COMPONENT
if (!appCode.includes('FruitStudioMenu')) {
  appCode = appCode.replace('// === MAIN APP COMPONENT ===', newFruitMenu);
}

// Add the tab to App component
appCode = appCode.replace(
  "cafe: '#EADFC8'       // Light Beige (for future)",
  "cafe: '#EADFC8',      // Light Beige\n    fruit: '#D32F2F'      // Red for Fruit Studio"
);

appCode = appCode.replace(
  "{activeTab === 'cafe' && <CafeMenu addToCart={addToCart} />}",
  "{activeTab === 'cafe' && <CafeMenu addToCart={addToCart} />}\n          {activeTab === 'fruit' && <FruitStudioMenu addToCart={addToCart} />}"
);

// Add sidebar link
const newTabLink = `
          <div className={\`nav-item \${activeTab === 'fruit' ? 'active' : ''}\`} onClick={() => setActiveTab('fruit')} style={{ borderLeftColor: activeTab === 'fruit' ? '#D32F2F' : 'transparent', backgroundColor: activeTab === 'fruit' ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
            🍓 フルーツ・ソフト
          </div>
        </nav>`;

appCode = appCode.replace('</nav>', newTabLink);

fs.writeFileSync(appPath, appCode, 'utf-8');

// 2. Update CSS
const cssPath = path.join(__dirname, 'src', 'index.css');
let cssCode = fs.readFileSync(cssPath, 'utf-8');

const newFruitCss = `/* --- FRUIT STUDIO PAGE STYLES --- */
.fruit-wrapper {
  padding: 10px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  color: #333;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fruit-hero {
  background: white;
  border-radius: 12px;
  position: relative;
  display: flex;
  margin-bottom: 20px;
  padding: 30px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.fruit-ribbon-red {
  background: #D32F2F;
  color: white;
  padding: 5px 25px;
  font-weight: bold;
  font-size: 16px;
  display: inline-block;
  transform: rotate(-2deg);
  margin-bottom: 15px;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  position: relative;
  left: -40px;
}
.fruit-ribbon-red::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 0;
  border-width: 5px;
  border-style: solid;
  border-color: #9A0007 transparent transparent transparent;
}

.fruit-hero-title {
  font-size: 40px;
  font-weight: bold;
  margin-bottom: 15px;
  letter-spacing: 2px;
}
.fruit-hero-desc {
  font-size: 16px;
  margin-bottom: 25px;
  line-height: 1.5;
  color: #444;
}
.fruit-hero-price {
  font-size: 32px;
  color: #D32F2F;
  font-weight: bold;
  margin-bottom: 5px;
}
.fruit-hero-note {
  font-size: 12px;
  color: #666;
}
.fruit-hero-img-area {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  position: relative;
}
.fruit-hero-img {
  width: 250px;
  height: 250px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  z-index: 1;
}

.fruit-hokkaido-badge {
  position: absolute;
  top: -30px;
  right: -30px;
  background: #4DB6AC;
  color: white;
  width: 70px;
  height: 90px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 15px;
  font-size: 11px;
  font-weight: bold;
  z-index: 0;
}

.fruit-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.fruit-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.fruit-card-img {
  height: 150px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  margin-bottom: 15px;
}

.fruit-card-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}

.fruit-card-desc {
  font-size: 12px;
  text-align: center;
  color: #555;
  margin-bottom: 15px;
  line-height: 1.5;
}

.fruit-card-price {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 15px;
}

.fruit-btn-orange { background: #F39C12; color: white; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; font-size: 14px;}
.fruit-btn-teal { background: #1ABC9C; color: white; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; font-size: 14px;}
.fruit-btn-pink { background: #E91E63; color: white; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; font-size: 14px;}

.fruit-ribbon-orange {
  position: absolute;
  top: -10px;
  left: 20px;
  background: #F39C12;
  color: white;
  padding: 5px 15px;
  font-size: 12px;
  font-weight: bold;
  border-radius: 4px;
}

.fruit-badge-round {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #FFB74D;
  color: white;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  text-align: center;
  font-weight: bold;
}
.fruit-badge-pink {
  position: absolute;
  top: -15px;
  left: -10px;
  background: #F48FB1;
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  text-align: center;
  font-weight: bold;
  line-height: 1.2;
}

.fruit-toggles {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.fruit-toggle-btn {
  border: 1px solid #CCC;
  background: white;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  transition: 0.2s;
}
.fruit-toggle-btn.active {
  border-color: #E91E63;
  color: #E91E63;
  font-weight: bold;
  background: #FFF0F4;
}

.fruit-footer {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
  margin-top: auto;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.fruit-footer-item {
  display: flex;
  align-items: center;
  gap: 15px;
}
.fruit-footer-icon {
  font-size: 32px;
}
.fruit-footer-text h4 {
  font-size: 14px;
  margin: 0 0 5px 0;
  font-weight: bold;
}
.fruit-footer-text p {
  font-size: 11px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}
`;

if (!cssCode.includes('/* --- FRUIT STUDIO PAGE STYLES --- */')) {
  cssCode += '\n\n' + newFruitCss;
  fs.writeFileSync(cssPath, cssCode, 'utf-8');
}

console.log('Fruit Studio Added successfully.');
