const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf-8');

// Replace logic
const replacements = [
  // Cafe
  { search: 'https://via.placeholder.com/150x200/A08060/fff?text=Americano', replace: '/名称未設定-1_0004_icecoffe.png' },
  { search: 'https://via.placeholder.com/120x150/789BA0/fff?text=Latte', replace: '/名称未設定-1_0003_Icelate.png' },
  { search: 'https://via.placeholder.com/120x150/D65A6E/fff?text=Strawberry', replace: '/名称未設定-1_0001_ichigomiruku.png' },
  { search: 'https://via.placeholder.com/120x150/7D5B41/fff?text=Choco', replace: '/名称未設定-1_0000_chocolata.png' },

  // Aburasoba
  { search: 'https://via.placeholder.com/400x400/transparent/333?text=Aburasoba', replace: '/油そば坦々-メニュー完_0008_レイヤー-1.png' }, // or tantan if that's hero
  { search: 'https://via.placeholder.com/200x200/transparent/333?text=Spicy', replace: '/名称未設定-1_0000_tantan.png' },
  // Note: Negi isn't in the list, keep placeholder or use tantan as fallback
  { search: 'https://via.placeholder.com/200x200/transparent/333?text=Negi', replace: '/油そば坦々-メニュー完_0008_レイヤー-1.png' }, // placeholder fallback
  
  // Toppings
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Chashu', replace: '/名称未設定-1_0000_tya-syu-.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Miso', replace: '/名称未設定-1_0001_nikumiso.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Nori', replace: '/名称未設定-1_0002_nori.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Egg', replace: '/名称未設定-1_0002_uZURA.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Garlic', replace: '/名称未設定-1_0000_furaidoga-rikku.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Mayo', replace: '/名称未設定-1_0001_mayone-zu.png' },
  { search: 'https://via.placeholder.com/100x100/transparent/333?text=Cheese', replace: '/名称未設定-1_0000_konati-zu.png' },

  // Side Dish
  { search: 'https://via.placeholder.com/400x300/3d2b1f/ffffff?text=Big+Frankfurter', replace: '/名称未設定-2_0000_xo-se-ji.png' },
  { search: 'https://via.placeholder.com/100/e6c280/ffffff?text=Fries', replace: '/名称未設定-2_0001_potato.png' },
  { search: 'https://via.placeholder.com/100/e6c280/ffffff?text=Nugget', replace: '/名称未設定-2_0003_nagetto.png' },
  { search: 'https://via.placeholder.com/100/e6c280/ffffff?text=Hash', replace: '/名称未設定-2_0002_hassyupotato.png' },
  { search: 'https://via.placeholder.com/200x120/8b4513/ffffff?text=Jerky', replace: '/名称未設定-2_0005_jya-ki-.png' },
  { search: 'https://via.placeholder.com/200x120/4caf50/ffffff?text=Pickles', replace: '/名称未設定-2_0007_pikurusu.png' },
  { search: 'https://via.placeholder.com/200x120/8bc34a/ffffff?text=Edamame', replace: '/名称未設定-2_0006_edamame.png' },
  { search: 'https://via.placeholder.com/400x300/ffcccb/ffffff?text=Celebration+Plate', replace: '/名称未設定-2_0004_pore-to.png' },

  // Pizza
  { search: 'https://via.placeholder.com/300/e74c3c/fff?text=Margherita', replace: '/名称未設定-3_0004_maruge.png' },
  { search: 'https://via.placeholder.com/200/2ecc71/fff?text=Genovese', replace: '/名称未設定-3_0000_jenobeze.png' },
  { search: 'https://via.placeholder.com/200/e67e22/fff?text=Bismark', replace: '/名称未設定-3_0002_bisumaruku.png' },
  // Since we might not have all pizza placeholder text exactly match, we will just fallback if needed. Let's do regex for the remaining pizzas if any.
  
  // Fruit Studio
  { search: 'https://via.placeholder.com/250x250/transparent/333?text=FruitSoft', replace: '/名称未設定-1_0000_regyura-.png' },
  { search: 'https://via.placeholder.com/150x150/transparent/333?text=FruitSoft', replace: '/名称未設定-2_0000_mini_furusofu.png' },
  { search: 'https://via.placeholder.com/150x150/transparent/333?text=SoftCream', replace: '/名称未設定-1_0000_regyura-.png' }, // fallback
  { search: 'https://via.placeholder.com/150x150/transparent/333?text=Affogato', replace: '/名称未設定-2_0001_afoga-do.png' }
];

replacements.forEach(r => {
  appCode = appCode.replace(r.search, r.replace);
});

// Since Pizza placeholders might be slightly different:
appCode = appCode.replace(/https:\/\/via\.placeholder\.com\/200\/f1c40f\/fff\?text=[A-Za-z]+/g, '/名称未設定-3_0001_kuwatoro.png'); // assuming yellow was quattro
appCode = appCode.replace(/https:\/\/via\.placeholder\.com\/200\/e74c3c\/fff\?text=[A-Za-z]+/g, '/名称未設定-3_0003_marinara.png'); // assuming red was marinara

fs.writeFileSync(appPath, appCode, 'utf-8');
console.log('Images replaced successfully.');
