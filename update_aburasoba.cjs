const fs = require('fs');
const path = require('path');

// 1. Update App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf-8');

const newAburasobaMenu = `// === ABURASOBA PAGE COMPONENT ===
function AburasobaMenu({ addToCart }) {
  const [opts, setOpts] = useState({
    normal: { size: '並', price: 1130 },
    spicy: { size: '並', price: 1300 },
    negi: { size: '並', price: 1230 }
  });

  const prices = {
    normal: { '小': 980, '並': 1130, '大': 1330 },
    spicy: { '小': 1100, '並': 1300, '大': 1500 },
    negi: { '小': 1030, '並': 1230, '大': 1430 }
  };

  const updateOpt = (type, size) => {
    setOpts(prev => ({
      ...prev,
      [type]: { size, price: prices[type][size] }
    }));
  };

  const toppings = [
    { id: 'top-chashu', name: '細切り\\nチャーシュー', price: 300, text: 'Chashu' },
    { id: 'top-spicy', name: '辛みそ\\nひき肉', price: 300, text: 'Miso' },
    { id: 'top-menma', name: 'メンマ', price: 200, text: 'Menma' },
    { id: 'top-nori', name: 'のり2枚', price: 200, text: 'Nori' },
    { id: 'top-egg', name: 'うずら味玉', price: 200, text: 'Egg' },
    { id: 'top-garlic', name: 'フライド\\nガーリック', price: 150, text: 'Garlic' },
    { id: 'top-mayo', name: 'マヨネーズ', price: 150, text: 'Mayo' },
    { id: 'top-cheese', name: '粉チーズ', price: 150, text: 'Cheese' },
  ];

  return (
    <main className="main-content" style={{ background: '#F8F5EE' }}>
      <div className="abu-wrapper">
        
        {/* Hero Section */}
        <section className="abu-hero">
          <div className="abu-hero-left">
            <p className="subtitle">昭和の味を受け継ぐ、<br /><span className="red">元祖</span> 油そば。</p>
            <h2 className="title">米風亭の<br />油そば</h2>
            <p className="desc">— シンプル、だけど奥深い。—</p>
          </div>

          <div className="abu-hero-center">
            <div className="abu-badge-no1">人気<br/>No.1</div>
            <div className="abu-hero-img-area">
              <div className="abu-hero-img" style={{backgroundImage: 'url("https://via.placeholder.com/400x400/transparent/333?text=Aburasoba")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'}}></div>
            </div>
          </div>

          <div className="abu-hero-right">
            <div className="r-title">米風亭 油そば</div>
            <div className="r-desc">特製ダレがもちもちの麺に絡む、<br/>飽きのこない一杯。</div>
            
            <div className="abu-price-list">
              {['小', '並', '大'].map(s => (
                <div className="abu-price-item" key={s} onClick={() => updateOpt('normal', s)} style={{ cursor: 'pointer' }}>
                  <div className="abu-size-circle" style={{ background: opts.normal.size === s ? '#A91E1E' : '#333' }}>{s}</div>
                  <div className="abu-price-val" style={{ color: opts.normal.size === s ? '#A91E1E' : '#333', fontWeight: opts.normal.size === s ? 'bold' : 'normal' }}>
                    ￥{prices.normal[s].toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="abu-hero-actions">
              <button className="abu-btn-outline">詳しく見る</button>
              <button className="abu-btn-red" onClick={() => addToCart({ id: \`abu-normal-\${opts.normal.size}\`, name: \`米風亭 油そば (\${opts.normal.size})\`, price: opts.normal.price })}>
                注文する
              </button>
            </div>
          </div>
        </section>

        {/* Recommended Section */}
        <div className="abu-section-header">
          <div className="abu-section-title">おすすめ油そば</div>
          <div className="abu-section-line"></div>
        </div>

        <div className="abu-rec-grid">
          {/* Spicy Aburasoba */}
          <div className="abu-rec-card">
            <div className="abu-badge-new">NEW</div>
            <div className="abu-rec-img" style={{backgroundImage: 'url("https://via.placeholder.com/200x200/transparent/333?text=Spicy")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'}}></div>
            <div className="abu-rec-info">
              <div className="abu-rec-title">辛々担々 油そば</div>
              <div className="abu-rec-desc">濃厚なゴマのコクと花椒の<br/>しびれる辛さがクセになる、<br/>やみつきの一杯。</div>
              <div className="abu-rec-price-area">
                <div className="abu-rec-price-col">
                  {['小', '並', '大'].map(s => (
                    <div key={s} onClick={() => updateOpt('spicy', s)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <div className="abu-size-circle" style={{ width: '20px', height: '20px', fontSize: '10px', background: opts.spicy.size === s ? '#A91E1E' : '#333' }}>{s}</div>
                      <div style={{ fontSize: '14px', color: opts.spicy.size === s ? '#A91E1E' : '#333', fontWeight: opts.spicy.size === s ? 'bold' : 'normal' }}>￥{prices.spicy[s].toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="abu-btn-full" onClick={() => addToCart({ id: \`abu-spicy-\${opts.spicy.size}\`, name: \`辛々担々 油そば (\${opts.spicy.size})\`, price: opts.spicy.price })}>
                注文する
              </button>
            </div>
          </div>

          {/* Negi Aburasoba */}
          <div className="abu-rec-card">
            <div className="abu-rec-img" style={{backgroundImage: 'url("https://via.placeholder.com/200x200/transparent/333?text=Negi")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'}}></div>
            <div className="abu-rec-info">
              <div className="abu-rec-title">ネギ盛り 油そば</div>
              <div className="abu-rec-desc">シャキシャキの白髪ネギと<br/>特製ダレが相性抜群。</div>
              <div className="abu-rec-price-area" style={{ marginTop: 'auto' }}>
                <div className="abu-rec-price-col">
                  {['小', '並', '大'].map(s => (
                    <div key={s} onClick={() => updateOpt('negi', s)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <div className="abu-size-circle" style={{ width: '20px', height: '20px', fontSize: '10px', background: opts.negi.size === s ? '#A91E1E' : '#333' }}>{s}</div>
                      <div style={{ fontSize: '14px', color: opts.negi.size === s ? '#A91E1E' : '#333', fontWeight: opts.negi.size === s ? 'bold' : 'normal' }}>￥{prices.negi[s].toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="abu-btn-full" onClick={() => addToCart({ id: \`abu-negi-\${opts.negi.size}\`, name: \`ネギ盛り 油そば (\${opts.negi.size})\`, price: opts.negi.price })}>
                注文する
              </button>
            </div>
          </div>
        </div>

        {/* Toppings Section */}
        <div className="abu-toppings-wrap">
          <div className="abu-toppings-header">
            <div className="abu-section-title" style={{ margin: 0 }}>トッピングで自分好みに</div>
            <div className="abu-toppings-note">※価格はすべて税込みです。</div>
            <div className="abu-section-line" style={{ marginLeft: '15px' }}></div>
          </div>

          <div className="abu-toppings-list">
            {toppings.map(t => (
              <div className="abu-topping-item" key={t.id} onClick={() => addToCart({ id: t.id, name: t.name.replace('\\n', ''), price: t.price })}>
                <div className="abu-topping-img" style={{backgroundImage: \`url("https://via.placeholder.com/100x100/transparent/333?text=\${t.text}")\`}}></div>
                <div className="abu-topping-name">{t.name.split('\\n').map((line, i) => <div key={i}>{line}</div>)}</div>
                <div className="abu-topping-price">￥{t.price}</div>
              </div>
            ))}
          </div>

          <button className="abu-all-toppings-btn" style={{ marginTop: '20px' }}>すべてのトッピングを見る ∨</button>
        </div>

      </div>
    </main>
  );
}`;

const startIndex = appCode.indexOf('// === ABURASOBA PAGE COMPONENT ===');
const endIndex = appCode.indexOf('// === SIDE DISH PAGE COMPONENT ===');

if (startIndex !== -1 && endIndex !== -1) {
  appCode = appCode.substring(0, startIndex) + newAburasobaMenu + '\n\n' + appCode.substring(endIndex);
  fs.writeFileSync(appPath, appCode, 'utf-8');
  console.log('App.jsx updated successfully.');
} else {
  console.log('Could not find boundaries in App.jsx');
}

// 2. Update index.css
const cssPath = path.join(__dirname, 'src', 'index.css');
let cssCode = fs.readFileSync(cssPath, 'utf-8');

const newAbuCss = `/* --- ABURASOBA PAGE STYLES --- */
.abu-wrapper {
  background-color: #F8F5EE;
  padding: 30px;
  font-family: 'Noto Serif JP', serif;
  color: #2A2A2A;
  min-height: 100%;
}

.abu-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
  position: relative;
}

.abu-hero-left {
  flex: 1;
}
.abu-hero-left .subtitle {
  font-size: 14px;
  margin-bottom: 15px;
  letter-spacing: 1px;
}
.abu-hero-left .subtitle .red { color: #A91E1E; font-weight: bold; }
.abu-hero-left .title {
  font-size: 64px;
  font-weight: bold;
  line-height: 1.1;
  margin-bottom: 15px;
  letter-spacing: 2px;
}
.abu-hero-left .desc {
  font-size: 14px;
  color: #555;
  letter-spacing: 1px;
}

.abu-hero-center {
  flex: 1.5;
  position: relative;
  display: flex;
  justify-content: center;
}
.abu-hero-img-area {
  position: relative;
  width: 350px;
  height: 350px;
}
.abu-hero-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  background-color: white;
}
.abu-badge-no1 {
  position: absolute;
  top: 10px;
  left: -10px;
  background: #A91E1E;
  color: white;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.2;
  box-shadow: 0 4px 10px rgba(169, 30, 30, 0.4);
  z-index: 2;
}

.abu-hero-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}
.abu-hero-right .r-title {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 10px;
}
.abu-hero-right .r-desc {
  font-size: 13px;
  color: #555;
  margin-bottom: 25px;
  line-height: 1.6;
}

.abu-price-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
}
.abu-price-item {
  display: flex;
  align-items: center;
  gap: 15px;
}
.abu-size-circle {
  width: 26px;
  height: 26px;
  background: #333;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
.abu-price-val {
  font-size: 22px;
}

.abu-hero-actions {
  display: flex;
  gap: 15px;
}
.abu-btn-outline {
  border: 1px solid #CCC;
  background: transparent;
  padding: 12px 25px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
}
.abu-btn-red {
  background: #A91E1E;
  color: white;
  border: none;
  padding: 12px 35px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(169, 30, 30, 0.3);
}

.abu-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.abu-section-title {
  font-size: 22px;
  font-weight: bold;
  margin-right: 15px;
}
.abu-section-line {
  flex: 1;
  height: 1px;
  background: #D8D2C2;
}

.abu-rec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}
.abu-rec-card {
  background: white;
  border: 1px solid #E8E2D2;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 20px;
  position: relative;
}
.abu-badge-new {
  position: absolute;
  top: 15px;
  left: 15px;
  background: #A91E1E;
  color: white;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: bold;
  border-radius: 4px;
  z-index: 2;
}
.abu-rec-img {
  width: 160px;
  height: 160px;
  background-color: #f5f5f5;
  border-radius: 50%;
}
.abu-rec-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.abu-rec-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
}
.abu-rec-desc {
  font-size: 12px;
  color: #555;
  margin-bottom: 15px;
  line-height: 1.6;
}
.abu-rec-price-area {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.abu-rec-price-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.abu-btn-full {
  width: 100%;
  border: 1px solid #CCC;
  background: white;
  padding: 10px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  margin-top: auto;
  transition: 0.2s;
}
.abu-btn-full:hover {
  background: #f5f5f5;
}

.abu-toppings-wrap {
  margin-top: 20px;
}
.abu-toppings-header {
  display: flex;
  align-items: baseline;
  gap: 15px;
  margin-bottom: 20px;
}
.abu-toppings-title {
  font-size: 22px;
  font-weight: bold;
}
.abu-toppings-note {
  font-size: 12px;
  color: #666;
}

.abu-toppings-list {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding-bottom: 15px;
}
.abu-topping-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  background: white;
  border: 1px solid #E8E2D2;
  border-radius: 12px;
  padding: 15px 10px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}
.abu-topping-img {
  width: 60px;
  height: 60px;
  background-color: #333;
  border-radius: 50%;
  margin-bottom: 10px;
  background-size: cover;
  background-position: center;
}
.abu-topping-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.4;
  margin-bottom: 8px;
  height: 32px; 
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.abu-topping-price {
  font-size: 14px;
  color: #A91E1E;
  font-weight: bold;
}

.abu-all-toppings-btn {
  width: 250px;
  margin: 10px auto 0;
  display: block;
  border: 1px solid #CCC;
  background: transparent;
  padding: 12px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  text-align: center;
  font-size: 13px;
}
`;

if (!cssCode.includes('/* --- ABURASOBA PAGE STYLES --- */')) {
  cssCode += '\n\n' + newAbuCss;
  fs.writeFileSync(cssPath, cssCode, 'utf-8');
  console.log('index.css updated successfully.');
} else {
  console.log('CSS block already exists, skipping CSS update.');
}
