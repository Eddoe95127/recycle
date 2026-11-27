/* 客戶網站與後台共用：狀態、商品選項、條款、API、LINE 登入、假資料 */
const CFG = window.APP_CONFIG;
const MOCK = new URLSearchParams(location.search).has('mock');

/* ---------- 狀態 ---------- */
const STATUS_META = {
  '已預約':     { color: '#0A84FF', label: '待安排取件' },
  '已安排取件': { color: '#5E5CE6', label: '已安排取件' },
  '已取件':     { color: '#5E5CE6', label: '運送中' },
  '檢測中':     { color: '#BF5AF2', label: '檢測中' },
  '已報價':     { color: '#FF9F0A', label: '待確認報價' },
  '客戶同意':   { color: '#30D158', label: '匯款處理中' },
  '已付款':     { color: '#30D158', label: '交易完成' },
  '客戶不同意': { color: '#8E8E93', label: '待寄回' },
  '退回寄送中': { color: '#8E8E93', label: '寄回中' },
  '已退回':     { color: '#8E8E93', label: '已寄回' },
  '已取消':     { color: '#AEAEB2', label: '已取消' },
};
const STATUS_LIST = Object.keys(STATUS_META);
const MAIN_STEPS = [
  { key: '已預約', label: '預約成功' }, { key: '已安排取件', label: '安排取件' }, { key: '已取件', label: '運送中' },
  { key: '檢測中', label: '檢測中' }, { key: '已報價', label: '報價確認' }, { key: '客戶同意', label: '匯款中' }, { key: '已付款', label: '完成' },
];
const RETURN_STEPS = MAIN_STEPS.slice(0, 5).concat([{ key: '客戶不同意', label: '不同意' }, { key: '退回寄送中', label: '寄回中' }, { key: '已退回', label: '已寄回' }]);
function stepsFor(status) {
  if (status === '已取消') return [MAIN_STEPS[0], { key: '已取消', label: '已取消' }];
  if (['客戶不同意', '退回寄送中', '已退回'].includes(status)) return RETURN_STEPS;
  return MAIN_STEPS;
}
const NEXT_STATUS = { '已預約': '已安排取件', '已安排取件': '已取件', '已取件': '檢測中', '檢測中': '已報價', '客戶同意': '已付款', '客戶不同意': '退回寄送中', '退回寄送中': '已退回' };
// 後台權限：各權限可做的狀態轉換（與後端 TRANSITIONS 相同；edit_any 可任意改）
const STAFF_TRANSITIONS = {
  edit_shipping: { '已預約': ['已安排取件'], '已安排取件': ['已取件'], '已取件': ['檢測中'], '客戶不同意': ['退回寄送中'], '退回寄送中': ['已退回'] },
  edit_report: { '已取件': ['檢測中', '已報價'], '檢測中': ['已報價'] },
  edit_payment: { '客戶同意': ['已付款'] },
};
const canTransition = (perms, from, to) => perms.includes('edit_any') || Object.keys(STAFF_TRANSITIONS).some(p => perms.includes(p) && (STAFF_TRANSITIONS[p][from] || []).includes(to));
const statusColor = s => (STATUS_META[s] || {}).color || '#8E8E93';

/* ---------- 商品選項（沿用原本 Google 表單） ---------- */
const CATEGORY_INFO = {
  iPhone: { title: 'iPhone', sub: 'iPhone 11 以後機型', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 5h3"/></svg>' },
  iPad:   { title: 'iPad', sub: 'iPad / Air / mini / Pro', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="4" y="2.5" width="16" height="19" rx="2.4"/><path d="M11 18.5h2"/></svg>' },
  Mac:    { title: 'Mac', sub: 'MacBook / iMac / Mac mini', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4.5" width="16" height="11" rx="1.6"/><path d="M2 19.5h20l-1.5-4h-17z"/></svg>' },
  '其他': { title: '其他', sub: 'Watch、配件、其他品牌', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></svg>' },
};
const NEW_USED = ['全新未拆封', '二手機(使用過)'];
const IPHONE_MODELS = ['iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone 12 mini', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
  'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16e', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'iPhone 17e', 'iPhone 17', 'iPhone Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'iPhone 18 Pro', 'iPhone 18 Pro Max', 'iPhone Duo'];
const IPAD_MODELS = [ // 與線上估價表的 iPad 型號名稱一致，估價後可直接帶入
  'iPad Pro (M5) 11吋', 'iPad Pro (M5) 13吋', 'iPad Pro (M4) 11吋', 'iPad Pro (M4) 13吋',
  'iPad Air 8 (M4) 11吋', 'iPad Air 8 (M4) 13吋', 'iPad Air 7 (M3) 11吋', 'iPad Air 7 (M3) 13吋', 'iPad Air 6 (M2) 11吋', 'iPad Air 6 (M2) 13吋', 'iPad Air 5', 'iPad Air 4',
  'iPad 11th (A16)', 'iPad 10th', 'iPad 9th', 'iPad 8th', 'iPad 7th', 'iPad 6th', 'iPad mini 7', 'iPad mini 6', 'iPad mini 5',
  'iPad Pro 11吋 第4代', 'iPad Pro 11吋 第3代', 'iPad Pro 11吋 第2代', 'iPad Pro 11吋 第1代',
  'iPad Pro 12.9吋 第6代', 'iPad Pro 12.9吋 第5代', 'iPad Pro 12.9吋 第4代', 'iPad Pro 12.9吋 第3代', '其他 iPad'];
/* ---------- 顏色（依型號） ---------- */
const RED = '(PRODUCT)RED 紅色';
const IPHONE_COLORS = {
  'iPhone 11': ['黑色', '白色', '紫色', '綠色', '黃色', RED],
  'iPhone 11 Pro': ['夜幕綠色', '太空灰色', '銀色', '金色'],
  'iPhone 12': ['黑色', '白色', '藍色', '綠色', '紫色', RED],
  'iPhone 12 Pro': ['石墨色', '銀色', '金色', '太平洋藍色'],
  'iPhone 13': ['午夜色', '星光色', '藍色', '粉紅色', '綠色', RED],
  'iPhone 13 Pro': ['石墨色', '金色', '銀色', '天峰藍色', '松嶺青色'],
  'iPhone 14': ['午夜色', '星光色', '藍色', '紫色', '黃色', RED],
  'iPhone 14 Pro': ['太空黑色', '銀色', '金色', '深紫色'],
  'iPhone 15': ['黑色', '藍色', '綠色', '黃色', '粉紅色'],
  'iPhone 15 Pro': ['黑色鈦金屬', '白色鈦金屬', '藍色鈦金屬', '原色鈦金屬'],
  'iPhone 16e': ['黑色', '白色'],
  'iPhone 16': ['黑色', '白色', '粉紅色', '深青色', '群青色'],
  'iPhone 16 Pro': ['黑色鈦金屬', '白色鈦金屬', '原色鈦金屬', '沙漠色鈦金屬'],
  'iPhone 17': ['黑色', '白色', '薰衣草紫色', '霧藍色', '鼠尾草綠色'],
  'iPhone Air': ['太空黑色', '雲白色', '淺金色', '天藍色'],
  'iPhone 17 Pro': ['宇宙橙色', '深藍色', '銀色'],
  'iPhone SE': ['黑色', '白色', '午夜色', '星光色', RED],
};
const GENERAL_COLORS = ['黑色', '白色', '銀色', '太空灰色', '太空黑色', '金色', '星光色', '午夜色', '藍色', '綠色', '紫色', '粉紅色', '黃色', '紅色', '橙色'];
/** 依型號給顏色選項；同系列 mini／Plus／Pro Max 用基本款或 Pro 的顏色 */
function colorsFor(model) {
  const m = String(model || '').trim();
  if (IPHONE_COLORS[m]) return IPHONE_COLORS[m];
  const key = m.replace(/\s*(mini|Plus|Max)$/i, '').replace(/\s*Pro Max$/i, ' Pro');
  if (IPHONE_COLORS[key]) return IPHONE_COLORS[key];
  if (/SE/.test(m)) return IPHONE_COLORS['iPhone SE'];
  return GENERAL_COLORS;
}
const OTHER_OPT = '__other';

const CAPACITIES = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const IPHONE_APPEARANCE = ['完全無刮傷', '外觀小刮傷', '外觀有凹撞傷'];
const IPHONE_ISSUES = ['功能都完全正常', '無法開機運作', '螢幕有破裂', '機身進過水', '按鍵功能不正常', '相機功能不正常', '其他問題'];
const IPAD_CONNECTIVITY = ['Wi-Fi', 'Wi-Fi + 行動網路'];
const SLOTS = ['上午 09-12', '下午 13-18', '不指定'];
const CITIES = ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣',
  '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'];
const BANKS = ['004 臺灣銀行', '005 土地銀行', '006 合作金庫', '007 第一銀行', '008 華南銀行', '009 彰化銀行', '012 台北富邦', '013 國泰世華',
  '017 兆豐銀行', '700 中華郵政', '808 玉山銀行', '812 台新銀行', '822 中國信託', '807 永豐銀行', '803 聯邦銀行', '806 元大銀行', '810 星展銀行', '824 連線銀行', '826 樂天銀行'];

function itemSummary(it) {
  const parts = {
    iPhone: [it.model, it.capacity, it.color, it.newOrUsed, it.appearance, (it.issues || []).join('、'), it.imei && 'IMEI ' + it.imei, it.issueNote && '補充：' + it.issueNote],
    iPad: [it.model, it.connectivity, it.capacity, it.color, it.newOrUsed, it.issueNote],
    Mac: [it.year, it.model, it.spec, it.newOrUsed, it.serial && 'S/N ' + it.serial],
    '其他': [it.name],
  }[it.category] || [];
  return parts.filter(Boolean).join('｜');
}
const itemTitle = it => it.category === '其他' ? (it.name || '其他商品').split(/[，,\s]/)[0] : (it.category === 'Mac' ? [it.year, it.model].filter(Boolean).join(' ') : [it.model, it.capacity].filter(Boolean).join(' ')) || it.category;

/* ---------- 檢測報告 ---------- */
const CHECK_ITEMS = [
  { k: 'screen', label: '螢幕外觀' }, { k: 'body', label: '機身／邊框外觀' }, { k: 'back', label: '背蓋外觀' },
  { k: 'display', label: '螢幕顯示（亮點、烙印、色偏）' }, { k: 'touch', label: '觸控功能' }, { k: 'faceid', label: 'Face ID／Touch ID' },
  { k: 'camera', label: '相機（前、後鏡頭）' }, { k: 'audio', label: '喇叭／麥克風' }, { k: 'buttons', label: '按鍵' },
  { k: 'charge', label: '充電／連接埠' }, { k: 'signal', label: '網路／訊號' }, { k: 'water', label: '泡水檢查' },
  { k: 'repair', label: '維修紀錄／非原廠零件' }, { k: 'lock', label: '帳號鎖／尋找已關閉' },
];
const GRADE_TEXT = { A: '近全新', B: '輕微使用痕跡', C: '明顯刮傷', D: '嚴重損傷' };
const RES = { ok: ['正常', '#1f9d55', '✓'], bad: ['異常', '#e5484d', '✕'], na: ['未檢測', '#8e8e93', '—'] };
const DEDUCT_SUGGEST = ['螢幕刮傷', '螢幕破裂', '螢幕顯示異常', '觸控異常', '邊框刮傷／掉漆', '機身凹傷', '背蓋破裂', '電池低於標準', '泡水痕跡', '相機異常', 'Face ID 失效',
  '喇叭／麥克風異常', '按鍵異常', '充電／連接埠異常', '網路／訊號異常', '非原廠螢幕', '非原廠電池', '維修過', '帳號鎖未解除', '無法開機', '缺配件'];
/** 檢測項目異常 → 預設的扣款原因 */
const CHECK_DEDUCT = { screen: '螢幕刮傷', body: '邊框刮傷／掉漆', back: '背蓋破裂', display: '螢幕顯示異常', touch: '觸控異常', faceid: 'Face ID 失效',
  camera: '相機異常', audio: '喇叭／麥克風異常', buttons: '按鍵異常', charge: '充電／連接埠異常', signal: '網路／訊號異常', water: '泡水痕跡',
  repair: '維修過', lock: '帳號鎖未解除' };
const numv = v => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0));
function computeReport(rep) {
  rep.items.forEach(it => { it.subtotal = Math.max(0, numv(it.base) - (it.deductions || []).reduce((s, d) => s + numv(d.amount), 0)); });
  rep.total = rep.items.reduce((s, it) => s + it.subtotal, 0);
  return rep;
}

/** 客戶看的檢測報告（網站與後台預覽共用） */
function reportHTML(rep) {
  if (!rep || !rep.items || !rep.items.length) return '';
  return `<div class="card report" id="report">
    <div class="rep-head"><div><h2 class="card-title">檢測估價報告</h2><p class="small muted" style="margin:2px 0 0">檢測日期 ${esc(rep.updatedAt || '')}</p></div>
      <button class="btn btn-ghost btn-sm no-print" onclick="printReport()">列印／存 PDF</button></div>
    ${rep.items.map((it, i) => {
      const bad = it.checks.filter(c => c.r === 'bad').length;
      return `<div class="rep-item">
        <div class="rep-title">${rep.items.length > 1 ? (i + 1) + '. ' : ''}${esc(it.title)}</div>
        <div class="rep-tags">
          ${it.grade ? `<span class="tag">外觀 ${esc(it.grade)}・${esc(GRADE_TEXT[it.grade] || '')}</span>` : ''}
          ${it.battery ? `<span class="tag">電池 ${esc(it.battery)}%</span>` : ''}
          <span class="tag ${bad ? 'bad' : 'ok'}">${bad ? bad + ' 項異常' : '功能檢測皆正常'}</span>
        </div>
        ${it.photos.length ? `<div class="rep-photos">${it.photos.map(p => `<figure><img data-photo="${esc(p.id)}" alt="${esc(p.caption)}"><figcaption>${esc(p.caption)}</figcaption></figure>`).join('')}</div>` : ''}
        <div class="rep-checks">${it.checks.map(c => `<div class="chk ${c.r}"><span class="ico">${RES[c.r][2]}</span><span class="lbl">${esc(c.label)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span><span class="res">${RES[c.r][0]}</span></div>`).join('')}</div>
        <table class="rep-price">
          <tr><td>基本收購價</td><td>NT$ ${numv(it.base).toLocaleString('en-US')}</td></tr>
          ${(it.deductions || []).map(d => `<tr class="minus"><td>${esc(d.reason)}</td><td>− NT$ ${numv(d.amount).toLocaleString('en-US')}</td></tr>`).join('')}
          <tr class="sub"><td>小計</td><td>NT$ ${numv(it.subtotal).toLocaleString('en-US')}</td></tr>
        </table>
      </div>`;
    }).join('')}
    ${rep.summary ? `<div class="note" style="margin-top:14px"><b>檢測說明</b><br><span style="white-space:pre-line">${esc(rep.summary)}</span></div>` : ''}
    <div class="rep-total"><span>檢測後回收價</span><b>NT$ ${numv(rep.total).toLocaleString('en-US')}</b></div>
  </div>`;
}

/* 照片：透過 API 取得（客戶只能看自己的），快取在記憶體 */
const photoCache = {};
async function loadPhotos(root) {
  const imgs = $$('img[data-photo]', root || document).filter(img => !img.src);
  await Promise.all([0, 1, 2].map(async w => {
    for (let i = w; i < imgs.length; i += 3) {
      const img = imgs[i], id = img.dataset.photo;
      try {
        if (!photoCache[id]) photoCache[id] = (await api('photo', { fileId: id })).dataUrl;
        img.src = photoCache[id];
        img.onclick = () => lightbox(img.src, img.alt);
      } catch (e) { img.alt = '照片載入失敗'; img.classList.add('broken'); }
    }
  }));
}
function lightbox(src, cap) {
  const d = document.createElement('div');
  d.className = 'lightbox';
  d.innerHTML = `<img src="${src}" alt=""><p>${esc(cap || '')}</p>`;
  d.onclick = () => d.remove();
  document.body.appendChild(d);
}
async function printReport() {
  await loadPhotos($('#report'));
  document.body.classList.add('printing');
  setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 300);
}
/** 上傳前壓縮照片（最長邊 1600px、JPEG） */
function resizeImage(file, max = 1600, q = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('無法讀取這張照片（HEIC 請改用 JPG）')); };
    img.src = url;
  });
}

/** 身分證照片：壓縮並加上斜向重複浮水印「僅限 iPhone收購中心 收購使用」 */
function watermarkImage(file, max = 1600) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const d = new Date(), date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      const text = `僅限 ${CFG.SHOP_NAME} 收購使用　${date}`;
      const fs = Math.max(18, Math.round(Math.min(w, h) / 16));
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(-Math.PI / 7);
      g.font = `bold ${fs}px -apple-system, "PingFang TC", "Noto Sans TC", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const step = fs * 3.2, span = Math.hypot(w, h);
      for (let y = -span; y <= span; y += step) {
        const shift = (Math.round(y / step) % 2) * fs * 6;
        for (let x = -span; x <= span; x += g.measureText(text).width + fs * 3) {
          g.lineWidth = Math.max(2, fs / 9);
          g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeText(text, x + shift, y);
          g.fillStyle = 'rgba(220,30,30,.42)'; g.fillText(text, x + shift, y);
        }
      }
      g.restore();
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('無法讀取這張照片（HEIC 請改用 JPG）')); };
    img.src = url;
  });
}

/* ---------- 使用者條款（沿用原表單） ---------- */
const TERMS = `1. 特別說明
1.1 本回收交易使用條款（下稱：本使用條款），是本網站「使用者協議」組成的有效部分。您在使用本服務前，請確認您已完整閱讀、充分理解，並接受本使用條款的全部內容。一旦您選擇「同意」或以其他方式選擇接受本使用條款並使用本服務，即表示您同意遵守本使用條款的所有內容。
1.2 若您對本使用條款有任何疑問，歡迎致電丰格客服專線詢問，我們的客服夥伴將向您解釋本使用條款的內容。若您無法接受本使用條款的任何內容，或無法接受並理解丰格對條款的解釋，請暫時不要進行後續操作。

2. 回收的舊設備
2.1 回收的舊設備來源：全球各地區的 iPhone（不包括被運營商鎖定的運營商合約設備）／iPad／Mac／Watch 或其它手機（下稱：「舊設備」或「設備」）。
2.2 iPhone／iPad 包括：iPhone 11 至最新機型；iPad (第 6 代) 以後、iPad Pro、iPad mini 5 以後、iPad Air 4 以後。
2.3 Mac 包括：MacBook／MacBook Air／MacBook Pro／Mac mini／iMac／iMac Pro。
2.4 Watch 包括：Watch SE 2／Watch S7／Watch S8／Watch S9。其它手機品牌包括：Samsung／HTC／MI／Sony／LG／Asus／Huawei／OPPO。

3. 替設備估價與申請回收交易
3.1 使用者登入本網站並填寫持有設備的相關資訊後，可替舊設備進行估價，所得之預估價值為預估參考價。
3.2 預估參考價格並非與丰格實際交易的回收價格。您可以評估回收參考價後選擇是否繼續進行回收交易。若選擇繼續進行回收交易，核定「最終回收確認價」。您可以自由決定是否將回收設備賣給丰格。在任何情況下，設備的估價不代表丰格對您的承諾或義務。
3.3 如果您透過丰格回收網站選擇進行回收交易，您有義務正確填寫您的姓名、手機號碼、電子信箱、收件地址、銀行帳號（或其他支付形式的帳號）、iPhone／iPad 序號（S/N），您還有義務在必要時提出身分證明（身分證），用以驗證使用者身分及設備來源的合法性。
3.4 每筆回收交易的有效期限為 7 天。使用者需要在提交資料後的 7 天內將設備寄達丰格所指定的地址，否則回收交易將會自動結束。在回收過程中，請確保您在網站上填寫的手機信號暢通，我們將會透過該手機號聯繫您及通知回收進度。

4. 寄出設備
4.1 只要提交表單並在 7 天內寄達丰格所指定處，使用者才有權利享有後續的回收服務，包括：免費寄出回收設備、免費檢測設備、確定「檢測後回收價」、完成交易等。
4.2 使用者向丰格交付設備過程中，若由使用者自行包裝，則由丰格支付物流運輸費用。若使用者需要購買包裝材料，則丰格建議使用者前往全家便利商店使用「二手機回收」服務，此服務將酌收運費，以及手續費 30 元新台幣（含包材）。
4.3 在寄出設備前，使用者有義務將電話卡（SIM 卡）取出並妥善保管。丰格對未取出 SIM 卡所造成的任何損失並不承擔任何責任。
4.4 在寄出設備前，使用者應自行備份、清除回收設備中的個人資料、通訊錄資料、照片、影片、音樂、應用程式等所有涉及個人隱私的資料（統稱「個人資料」）。丰格對使用者個人資料的毀損、遺失、復原等並不承擔任何責任。
4.5 使用者應委託丰格合作的物流公司郵寄回收設備，並將之郵寄到丰格指定收貨處。設備的運輸風險及責任將由使用者承擔。回收設備簽收後，丰格及其相關人員始盡管理義務，妥善保管設備。

5. 檢測與確認價格
5.1 使用者授權丰格對所託付的設備進行檢測（包括但不限於功能、性能、外觀、拆開設備）。使用者同意丰格不需就以上等檢測行為承擔任何責任。
5.2 丰格對使用者託付的設備提供免費檢測服務。丰格有權開啟設備電源，對設備的各項功能、性能、外觀進行檢測。
5.3 經過檢測後，丰格有權確認最終交易價格（下稱「確定價格」）。最終確定的交易價格即為丰格同意回收設備的價格（下稱「檢測後回收價」）。丰格確定「檢測後回收價」後將告知使用者。

6. 確認交易及回收款
6.1 使用者收到郵件／電話通知「檢測後回收價」後，應在指定期限內決定是否同意回收交易。
6.2 使用者在指定期限內回覆並確認同意回收交易，均視為達成交易。丰格將在 2 個工作天內將回收設備款（等於「檢測後回收價」）轉入使用者指定帳戶。設備的所有權從使用者確認之日起移轉至丰格。
6.3 使用者在指定期限內未回覆、或回覆拒絕接受「檢測後回收價」，均視使用者不同意交易。丰格將退還舊設備給使用者。退回設備的物流運輸費用將由使用者承擔。

7. 特別約定事項
7.1 使用者承諾：向丰格所提供的所有交易資料、資訊及內容都是正確、真實且有效的，且託付的設備為原裝品牌設備，並符合丰格的回收要求。
7.2 使用者承諾：本人已年滿 20 歲。
7.3 使用者承諾：參加回收交易的設備是使用者的合法財產。該設備不具有任何留置、抵押等擔保功能與權益。使用者對設備擁有完整的處置權。
7.4 使用者承諾：託付的設備絕非以偷竊、搶劫、詐騙、欺詐、假冒、走私等違法途徑獲得。若因設備來源違法及因任何無權處置之情形而產生任何民事糾紛或刑事責任、行政處罰，由使用者自行承擔。若丰格因上述情況有所損失，則丰格有權向使用者追償。如發現任何涉嫌違法之情形，丰格有權免責，並將該涉嫌違法之設備移交司法機關處理，並配合調查。
7.5 使用者同意：在必要或有特殊情況時，依照丰格要求提供當初購買設備的證明（發票或收據等）原件或影本，配合丰格服務人員進行調查。若設備檢測未通過或資料不齊全，丰格有權拒收。對於已回收的設備，丰格依情況有權單方面取消交易，並將設備退還給使用者。
7.6 因使用者違反本使用條款之情形，導致丰格之董事、員工、子公司、分支機構或代理者任何損失，將由使用者負責賠償。
7.7 使用者提交的設備若為贗品、仿冒品，或由非法途徑所獲得，丰格有權拒收或取消交易，並將設備退回或交由警察司法機關處理。丰格不承擔任何責任。
7.8 若使用者違反本使用條款，丰格有權依其判斷單方面取消與使用者的交易，並將舊設備退回給使用者。使用者有義務按照丰格的要求返還設備回收款，並按照設備交易金額的 10% 支付違約金。
7.9 丰格有權隨時更新回收交易的使用條款，並依照最新版本的使用條款在發生特殊情況下做出解釋及妥善處理。
7.10 由於收購價格隨時浮動，報價以宅配公司收件當日網路報價為準。
7.11 估價時間為收到後 3 個工作天；同意回收後，匯款時間為通知後 2 個工作天。`;

/* ---------- 小工具 ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => { const n = Number(String(v || '').replace(/[^\d.]/g, '')); return isNaN(n) || !String(v || '').trim() ? '-' : n.toLocaleString('en-US'); };
const opts = (list, val, placeholder) => (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') + list.map(v => `<option ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('');
const chips = (name, list, val, multi) => `<div class="chips">${list.map(v => `<label class="chip"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(v)}" ${(multi ? (val || []).includes(v) : v === val) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`;
const badge = s => `<span class="badge" style="--c:${statusColor(s)}">${esc((STATUS_META[s] || {}).label || s)}</span>`;
const spinner = () => '<div class="spinner"></div>';
/** 網站自己的確認視窗（取代瀏覽器的 confirm，部分 App 內建瀏覽器會封鎖 confirm） */
function ask(message, okText = '確定', cancelText = '取消') {
  return new Promise(res => {
    const d = document.createElement('div');
    d.className = 'ask-wrap';
    d.innerHTML = `<div class="ask-box" role="dialog" aria-modal="true"><p>${esc(message).replace(/\n/g, '<br>')}</p>
      <div class="ask-btns"><button type="button" class="btn btn-ghost" data-v="0">${esc(cancelText)}</button><button type="button" class="btn btn-dark" data-v="1">${esc(okText)}</button></div></div>`;
    const done = v => { d.remove(); document.removeEventListener('keydown', key); res(v); };
    const key = e => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
    d.onclick = e => { const v = e.target.dataset && e.target.dataset.v; if (e.target === d) done(false); else if (v !== undefined) done(v === '1'); };
    document.addEventListener('keydown', key);
    document.body.appendChild(d);
    d.querySelector('[data-v="1"]').focus();
  });
}
/* ---------- 版本與錯誤回報 ----------
 * 版本：網頁載入的程式版本（看 store.js／shared.js 網址上的 ?v=），顯示在「我的帳號」，方便確認平板是不是最新版
 * 錯誤：平板上發生程式錯誤時，畫面跳出提示，並把錯誤送到後台記錄（Apps Script 執行記錄），方便遠端查原因 */
const appVer = () => [...document.scripts].map(x => (x.src.match(/\?v=(\w+)/) || [])[1]).filter(Boolean).sort().pop() || ''; // 所有程式裡最新的版本
const errSeen = {};
function reportErr(msg, stack) {
  msg = String(msg || '').slice(0, 300);
  if (!msg || /^Script error\.?$/.test(msg) || errSeen[msg]) return; // 外部程式（LINE、Google）的錯誤看不到內容，不報
  errSeen[msg] = 1;
  try { toast('⚠️ 程式錯誤：' + msg + '（請截圖給管理者）'); } catch (e) {}
  if (typeof MOCK !== 'undefined' && MOCK) return;
  try {
    fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'clientLog',
      msg: [msg, 'v=' + appVer(), location.pathname + location.search.replace(/[?&](code|state|liff[^=]*)=[^&]*/g, '') + location.hash, navigator.userAgent, String(stack || '').slice(0, 800)].join(' ｜ ') }) }).catch(() => {});
  } catch (e) {}
}
window.addEventListener('error', e => reportErr(e.message + (e.filename ? ` @${e.filename.split('/').pop().split('?')[0]}:${e.lineno}` : ''), e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (r.auth) return; reportErr('Promise：' + (r.message || r), r.stack); });

/* ---------- 新版本提示：App 從背景回來時檢查網站有沒有更新，有就提示重新整理 ---------- */
let verChecked = 0;
async function checkNewVersion() {
  if ((typeof MOCK !== 'undefined' && MOCK) || !appVer() || Date.now() - verChecked < 60000 || document.getElementById('newVer')) return;
  verChecked = Date.now();
  try {
    const html = await (await fetch(location.pathname + '?nc=' + Date.now(), { cache: 'no-store' })).text();
    const theirs = html.match(/(?:store|shared)\.js\?v=\w+/g) || []; // 網站上最新的版本，例如 store.js?v=20261125a
    const mine = [...document.scripts].map(x => x.src.split('/').pop()); // 目前載入的，例如 store.js?v=20261124f
    if (!theirs.length || theirs.every(t => mine.includes(t))) return;
    const b = document.createElement('div');
    b.id = 'newVer';
    b.innerHTML = '🔄 系統有新版本，<b>點這裡更新</b>（正在填的單請先完成）';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top));z-index:500;background:#0a84ff;color:#fff;padding:10px 18px;border-radius:999px;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;max-width:92vw;text-align:center';
    b.onclick = () => location.reload();
    document.body.appendChild(b);
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNewVersion(); });
document.addEventListener('change', e => { const l = e.target.closest && e.target.closest('label.check.must'); if (l) l.classList.toggle('done', e.target.checked); }); // 必勾項目：勾了就變綠色
setTimeout(checkNewVersion, 15000);

/* ---------- 舊版 iPad（iPadOS 14.0 以前）不支援 flex 的 gap：自動用外距補上按鈕間距 ---------- */
(function flexGapFallback() {
  const t = document.createElement('div');
  t.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
  t.appendChild(document.createElement('div')); t.appendChild(document.createElement('div'));
  document.documentElement.appendChild(t);
  const ok = t.scrollHeight === 1; t.remove();
  if (ok) return; // 新版：不用處理
  document.documentElement.classList.add('no-flexgap');
  const fix = root => (root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : []).forEach(el => {
    if (el.nodeType !== 1 || el._fg) return;
    const cs = getComputedStyle(el);
    if (cs.display !== 'flex' && cs.display !== 'inline-flex') return;
    const cg = parseFloat(cs.columnGap) || 0, rg = parseFloat(cs.rowGap) || 0;
    if (!cg && !rg) return;
    el._fg = 1;
    const col = cs.flexDirection.indexOf('column') === 0, wrap = cs.flexWrap !== 'nowrap';
    [...el.children].forEach((c, i) => {
      if (getComputedStyle(c).position === 'absolute') return;
      if (col) { if (i) c.style.marginTop = rg + 'px'; }
      else if (wrap) { c.style.marginRight = cg + 'px'; c.style.marginBottom = rg + 'px'; }
      else if (i) c.style.marginLeft = cg + 'px';
    });
  });
  const run = () => fix(document.body);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { fix(n); if (n.parentElement) { n.parentElement._fg = 0; fix(n.parentElement); } } })))
    .observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

function stepperHTML(status) {
  const steps = stepsFor(status);
  const cur = Math.max(0, steps.findIndex(s => s.key === status));
  const pct = steps.length > 1 ? cur / (steps.length - 1) : 0;
  return `<div class="stepper" style="--c:${statusColor(status)}">
    <div class="fill" style="width:calc((100% - 32px) * ${pct})"></div>
    ${steps.map((s, i) => `<div class="st ${i < cur || (i === cur && i === steps.length - 1) ? 'done' : i === cur ? 'cur' : ''}"><div class="dot">${i < cur || (i === cur && i === steps.length - 1) ? '✓' : i + 1}</div><div class="lbl">${esc(s.label)}</div></div>`).join('')}
  </div>`;
}
function progressPct(status) {
  const steps = stepsFor(status);
  const i = steps.findIndex(s => s.key === status);
  return Math.round(((i < 0 ? 0 : i) + 1) / steps.length * 100);
}

/* ---------- 線上估價 ---------- */
/** 型號的電池要求：價格表的「電池要求」，空白用預設（0＝不限） */
const batteryReq = (row, rules) => row && row.battery !== '' && row.battery != null ? Number(row.battery) : Number(rules.batteryDefault ?? 90);
/** 這個型號適用的盒子／配件項目與各項扣款：[{label, amount}]
 *  價格表「配件項目」空白＝全部項目、每項扣「配件扣款」；「無」＝不扣；可寫「沒有原廠盒子:1500,沒有原廠充電器:2000」個別指定金額 */
const accItemsFor = (row, rules) => {
  const all = (rules.accessories || []).map(x => x.label);
  const raw = String((row && row.accItems) || '').trim();
  if (raw === '無') return [];
  const base = Number(row && row.acc) || 0;
  const only = raw.split(/[,，]/).map(x => x.trim()).filter(Boolean).map(x => { const [l, n] = x.split(/[:：]/); return { label: l.trim(), amount: n != null && n !== '' ? Number(n) || 0 : base }; });
  return only.length ? only.filter(o => all.includes(o.label)) : all.map(l => ({ label: l, amount: base }));
};
/** 預估價：最高收購價 × 外觀% × 電池% × Π(1 − 故障扣%)；電池達到型號要求不扣；有需檢測的故障就不給數字 */
function estimatePrice(price, sel, rules, req = 0, accList = []) {
  const find = (list, label) => (list || []).find(x => x.label === label);
  const ap = find(rules.appearance, sel.appearance), bt = find(rules.battery, sel.battery);
  const issues = (sel.issues || []).map(l => find(rules.issues, l)).filter(Boolean);
  if (issues.some(i => i.inspect)) return { inspect: true, issues };
  const btPct = !bt ? 100 : (bt.min != null && bt.min >= req) ? 100 : bt.pct;
  let v = price * (ap ? ap.pct : 100) / 100 * btPct / 100;
  issues.forEach(i => { v *= (100 - i.pct) / 100; });
  const accOff = (sel.missing || []).reduce((t, l) => t + ((accList.find(a => a.label === l) || {}).amount || 0), 0);
  v = Math.max(0, v - accOff); // 缺盒子／配件：每項扣該項金額
  const high = Math.max(0, Math.floor(v / 100) * 100);
  const low = Math.max(0, Math.floor(high * (100 - (rules.spread || 0)) / 100 / 100) * 100);
  return { low, high, issues, deducted: issues.length > 0, accOff };
}

/* ---------- 登入（LINE / Google / Email 驗證碼）+ API ---------- */
let liffReady = false;
let mockLoggedIn = !new URLSearchParams(location.search).has('login'); // 預覽登入畫面：?mock=1&login=1
const auth = {
  ns: window.AUTH_NS || '', // 後台用 'admin_'，和客戶網站的登入分開
  get session() { return store.get(this.ns + 'session'); },
  get user() { return store.get(this.ns + 'sessionUser') || (liffReady && !MOCK && liff.isLoggedIn() ? { via: 'LINE' } : null); },
  save(r) { store.set(this.ns + 'session', r.session); store.set(this.ns + 'sessionUser', r.user); },
  clear() { try { localStorage.removeItem(this.ns + 'session'); localStorage.removeItem(this.ns + 'sessionUser'); Object.keys(localStorage).filter(k => k.startsWith(this.ns + 'me_')).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
};
async function initLine() {
  if (MOCK) { liffReady = true; return; }
  await liff.init({ liffId: CFG.LIFF_ID });
  liffReady = true;
}
const isLoggedIn = () => MOCK ? mockLoggedIn : (!!auth.session || (liffReady && liff.isLoggedIn()));
function login(params) {
  if (MOCK) return;
  const url = new URL(location.href);
  url.search = new URLSearchParams(params || {}).toString();
  url.hash = '';
  liff.login({ redirectUri: url.toString() });
}
function logout() {
  auth.clear();
  if (MOCK) { try { localStorage.removeItem('mockMe'); } catch (e) {} const u = new URL(location.href); u.searchParams.set('login', '1'); u.searchParams.delete('reset'); location.href = u; return; }
  if (liffReady && liff.isLoggedIn() && !liff.isInClient()) liff.logout();
  location.reload();
}
const NO_AUTH = ['loginGoogle', 'emailStart', 'emailVerify', 'staffLogin', 'priceTable', 'clientLog'];
async function api(action, data = {}) {
  if (MOCK) return mockApi(action, data);
  const body = { action, ...data };
  if (!NO_AUTH.includes(action)) {
    if (auth.session) body.session = auth.session;
    else if (liffReady && liff.isLoggedIn()) body.accessToken = liff.getAccessToken();
  }
  const res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(body) });
  const j = await res.json();
  if (!j.ok) {
    if (j.auth) auth.clear();
    const e = new Error(j.error || '發生錯誤，請稍後再試'); e.auth = !!j.auth; throw e;
  }
  return j;
}

/* ---------- 登入畫面 ---------- */
const LINE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s5.9-3.5 8.1-6C21.4 14.3 22 12.7 22 11c0-4.4-4.5-8-10-8z"/></svg>';
const G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function loadGsi() {
  return new Promise((res, rej) => {
    if (window.google && google.accounts && google.accounts.id) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
/**
 * 顯示登入畫面。opts: { title, sub, lineParams, onDone }
 * 在 LINE App 裡會自動是 LINE 登入，不會出現這個畫面。
 */
function mountLogin(el, opts) {
  const hasGoogle = MOCK || !!CFG.GOOGLE_CLIENT_ID;
  el.innerHTML = `<div class="narrow" style="padding-top:36px"><div class="card login-card rise">
    <h2 class="card-title" style="font-size:22px">${esc(opts.title)}</h2>
    <p class="muted" style="margin:6px 0 24px;font-size:15px">${esc(opts.sub)}</p>
    <button class="btn btn-line btn-block" id="lgLine">${LINE_ICON}使用 LINE 登入</button>
    ${hasGoogle ? '<div id="lgGoogle" class="g-wrap"></div>' : ''}
    <div class="divider"><span>或用 Email 收驗證碼登入</span></div>
    <div id="lgEmail">
      <input class="input" id="lgMail" type="email" placeholder="you@example.com" autocomplete="email" inputmode="email">
      <button class="btn btn-ghost btn-block" id="lgSend" style="margin-top:10px">寄送驗證碼</button>
    </div>
    <div class="err" id="lgErr"></div>
    <p class="small muted" style="margin:14px 0 0">用 Google 或 Email 登入時，同一個 Email 會看到同一批訂單</p>
  </div></div>`;
  const err = m => { $('#lgErr').textContent = m || ''; };
  const done = r => { if (MOCK) mockLoggedIn = true; else auth.save(r); opts.onDone(); };
  $('#lgLine').onclick = () => MOCK ? done({}) : login(opts.lineParams);

  if (hasGoogle) {
    const box = $('#lgGoogle');
    if (MOCK) {
      box.innerHTML = `<button class="btn btn-ghost btn-block" id="gMock">${G_ICON}使用 Google 登入</button>`;
      $('#gMock').onclick = async () => done(await api('loginGoogle', { credential: 'mock' }));
    } else {
      loadGsi().then(() => {
        google.accounts.id.initialize({
          client_id: CFG.GOOGLE_CLIENT_ID,
          callback: async resp => { err(); try { done(await api('loginGoogle', { credential: resp.credential })); } catch (e) { err(e.message); } },
        });
        google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'zh-TW', width: Math.min(400, box.clientWidth || 320) });
      }).catch(() => { box.innerHTML = ''; });
    }
  }

  const askCode = email => {
    $('#lgEmail').innerHTML = `<p class="small muted" style="margin:0 0 10px">驗證碼已寄到 <b style="color:var(--ink)">${esc(email)}</b><br>10 分鐘內有效，沒收到請看垃圾郵件匣</p>
      <input class="input" id="lgCode" inputmode="numeric" maxlength="6" placeholder="6 位數驗證碼" autocomplete="one-time-code" style="letter-spacing:.35em;text-align:center;font-size:22px;font-weight:700">
      <button class="btn btn-dark btn-block" id="lgVerify" style="margin-top:10px">登入</button>
      <button class="link" id="lgBack" style="display:block;margin:10px auto 0">換一個 Email</button>`;
    $('#lgCode').focus();
    const verify = async () => {
      const code = $('#lgCode').value.replace(/\D/g, '');
      if (code.length !== 6) return err('請輸入 6 位數驗證碼');
      const b = $('#lgVerify'); b.disabled = true; err();
      try { done(await api('emailVerify', { email, code })); } catch (e) { err(e.message); b.disabled = false; }
    };
    $('#lgVerify').onclick = verify;
    $('#lgCode').oninput = e => { if (e.target.value.replace(/\D/g, '').length === 6) verify(); };
    $('#lgBack').onclick = () => mountLogin(el, opts);
  };
  const send = async () => {
    const email = $('#lgMail').value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return err('請輸入正確的 Email');
    const b = $('#lgSend'); b.disabled = true; b.textContent = '寄送中…'; err();
    try { await api('emailStart', { email }); askCode(email); }
    catch (e) { err(e.message); b.disabled = false; b.textContent = '寄送驗證碼'; }
  };
  $('#lgSend').onclick = send;
  $('#lgMail').onkeydown = e => { if (e.key === 'Enter') send(); };
}

/* ---------- 假資料（網址加 ?mock=1 預覽，不連 LINE、不寫入資料） ---------- */
const mockDB = (() => {
  const base = { email: 'ming@example.com', idNo: 'A123456789', city: '新北市', address: '永和區中正路 100 號 5 樓', slot: '不指定', note: '', bankName: '', bankBranch: '', bankAccount: '', bankHolder: '', carrier: '', tracking: '', quote: '', quoteNote: '', replyAt: '', internal: '', lineName: '王小明', lineId: 'Umock' };
  const mk = (o, hist) => ({ ...base, ...o, history: hist.map(([time, status]) => ({ time, status })), updatedAt: hist[hist.length - 1][0], qty: String(o.items.length), itemsText: o.items.map((it, i) => `${i + 1}. 【${it.category}】${itemSummary(it)}`).join('\n') });
  return [
    mk({ id: 'AR261112001', createdAt: '2026-11-12 10:22', status: '已付款', name: '陳怡君', phone: '0922333444', lineId: 'Uother', carrier: '黑貓宅急便', tracking: '9012-3456-7801', quote: '18800', bankName: '822 中國信託', bankBranch: '永和分行', bankAccount: '123456789012', bankHolder: '陳怡君',
      items: [{ category: 'iPhone', model: 'iPhone 15 Pro', capacity: '256GB', color: '原色鈦金屬', newOrUsed: '二手機(使用過)', appearance: '完全無刮傷', issues: ['功能都完全正常'], imei: '356789012345678' }] },
      [['2026-11-12 10:22', '已預約'], ['2026-11-12 15:10', '已安排取件'], ['2026-11-13 11:40', '已取件'], ['2026-11-14 10:05', '檢測中'], ['2026-11-14 16:30', '已報價'], ['2026-11-14 18:02', '客戶同意'], ['2026-11-15 11:00', '已付款']]),
    mk({ id: 'AR261115002', createdAt: '2026-11-15 09:41', status: '已報價', name: '王小明', phone: '0912345678', carrier: '黑貓宅急便', tracking: '9012-3456-7890', quote: '12500', quoteNote: '電池健康度 86%，背蓋輕微刮傷，功能正常。',
      items: [{ category: 'iPhone', model: 'iPhone 13 Pro', capacity: '256GB', color: '天峰藍', newOrUsed: '二手機(使用過)', appearance: '外觀小刮傷', issues: ['功能都完全正常'], imei: '353456789012345' }] },
      [['2026-11-15 09:41', '已預約'], ['2026-11-15 14:20', '已安排取件'], ['2026-11-17 10:12', '已取件'], ['2026-11-18 09:30', '檢測中'], ['2026-11-18 15:40', '已報價']]),
    mk({ id: 'AR261118003', createdAt: '2026-11-18 21:05', status: '已安排取件', name: '王小明', phone: '0912345678', carrier: '黑貓宅急便', tracking: '',
      items: [{ category: 'iPad', model: 'iPad Air5', connectivity: 'Wi-Fi', capacity: '64GB', color: '太空灰', newOrUsed: '二手機(使用過)', issueNote: '螢幕右下角小刮痕' },
              { category: 'Mac', year: '2020', model: 'MacBook Air M1', spec: 'M1 / 8GB / 256GB', newOrUsed: '二手機(使用過)', serial: 'FVFDX1ABQ6L4' }] },
      [['2026-11-18 21:05', '已預約'], ['2026-11-19 09:12', '已安排取件']]),
    mk({ id: 'AR261119004', createdAt: '2026-11-19 08:15', status: '已預約', name: '林志豪', phone: '0933555777', lineId: 'Uother2', city: '臺北市', address: '信義區松仁路 58 號 12 樓', slot: '下午 13-18',
      items: [{ category: 'iPhone', model: 'iPhone 14', capacity: '128GB', color: '午夜色', newOrUsed: '二手機(使用過)', appearance: '外觀有凹撞傷', issues: ['螢幕有破裂'], imei: '351234567890123' }] },
      [['2026-11-19 08:15', '已預約']]),
  ];
})();

const mockPhotos = (() => {
  const svg = (bg, t) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${bg}"/><text x="400" y="315" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#fff">${t}</text></svg>`);
  return { demo1: svg('#6b7280', '正面全景'), demo2: svg('#9a6b4f', '右側邊框刮傷特寫'), demo3: svg('#4b5563', '背面全景'), demo4: svg('#3f6b8f', '電池健康度 86%') };
})();
mockDB.find(o => o.id === 'AR261115002').report = {
  updatedAt: '2026-11-18 15:40', summary: '整體功能正常，外觀有輕微使用痕跡。電池健康度 86%，略低於同型號平均。',
  items: [{
    title: 'iPhone 13 Pro 256GB', grade: 'B', battery: '86',
    checks: CHECK_ITEMS.map(c => ({ k: c.k, label: c.label, r: c.k === 'body' ? 'bad' : 'ok', note: c.k === 'body' ? '右側邊框刮傷約 1 公分' : c.k === 'water' ? '泡水指示貼片正常（白色）' : '' })),
    photos: [{ id: 'demo1', caption: '正面全景' }, { id: 'demo2', caption: '右側邊框刮傷' }, { id: 'demo3', caption: '背面全景' }, { id: 'demo4', caption: '電池健康度' }],
    base: 13800, deductions: [{ reason: '邊框刮傷／掉漆', amount: 800 }, { reason: '電池健康度偏低', amount: 500 }], subtotal: 12500,
  }], total: 12500,
};

{ const r = mockDB.find(o => o.id === 'AR261115002').report; r.sent = { ...JSON.parse(JSON.stringify(r)), sentAt: r.updatedAt }; }
// 預覽用員工帳號（密碼都是 password123）
const MOCK_PERMS = { view_contact: '查看客戶電話、Email、地址', view_id: '查看身分證字號與照片', view_bank: '查看匯款帳戶', edit_shipping: '處理物流（安排取件、已取件、到店、寄回）', edit_report: '填寫檢測報告、上傳照片、送出報價', edit_payment: '匯款作業（宅配標記已付款、門市標記已匯款與上傳截圖）', edit_any: '任意修改宅配訂單狀態（含取消）', edit_order: '修改宅配訂單客戶資料（姓名、聯絡、地址、匯款帳戶，會留下操作紀錄）', delete_order: '刪除宅配訂單（需填原因，會留下紀錄）', manage_users: '管理員工帳號與權限', hr_manage: '人資管理（審核請假／加班／補打卡、出勤總表、補登打卡、員工到職日與班別、打卡設定）', payroll: '薪資（設定薪資、計算與確認每月薪資單，可看所有人薪資）', create_intake: '門市收購登記（建立收購單、列印收購聯）', edit_intake: '修改門市收購單（出售人、付款、商品資料，會留下修改紀錄）', delete_intake: '刪除門市收購單（需填原因，會留下紀錄）', view_cost: '查看收購金額與成本', view_profit: '查看毛利（庫存「本月毛利」、報表的銷售／維修毛利）', edit_stock: '管理庫存（改庫存狀態、登記銷售、匯出盤點）', edit_prices: '維護線上估價表（價格與扣款規則）', repair: '門市維修作業（建立維修單、更新進度、取件與保固查詢）', edit_repair: '修改維修單基本資料（客戶、裝置、故障，會留下修改紀錄）', delete_repair: '刪除維修單（需填原因，會留下紀錄）' };
const MOCK_PRESETS = { '店長': Object.keys(MOCK_PERMS).filter(k => k !== 'manage_users' && k !== 'view_profit'), '檢測人員': ['edit_report'], '物流客服': ['view_contact', 'edit_shipping'], '會計': ['view_id', 'view_bank', 'edit_payment', 'view_cost'], '門市店員': ['create_intake', 'repair'], '維修技師': ['repair'] };
const mockUsers = [
  { username: 'tech1', name: '阿傑', role: '檢測人員', perms: MOCK_PRESETS['檢測人員'], enabled: true, mustChange: false, createdAt: '2026-11-20 10:00', lastLogin: '2026-11-21 09:12', pw: 'password123' },
  { username: 'ship1', name: '小美', role: '物流客服', perms: MOCK_PRESETS['物流客服'], enabled: true, mustChange: false, createdAt: '2026-11-20 10:01', lastLogin: '', pw: 'password123' },
  { username: 'clerk1', name: '店員小王', role: '門市店員', perms: MOCK_PRESETS['門市店員'], enabled: true, mustChange: false, createdAt: '2026-11-21 10:00', lastLogin: '', pw: 'password123' },
  { username: 'acct1', name: '會計 Amy', role: '會計', perms: MOCK_PRESETS['會計'], enabled: true, mustChange: true, createdAt: '2026-11-20 10:02', lastLogin: '', pw: 'password123' },
];
let mockMe = ''; // 目前預覽登入的員工帳號；空白 = 老闆
const mockPriceRules = { spread: 8,
  appearance: [{ label: '完全無刮傷', pct: 100 }, { label: '外觀小刮傷', pct: 92 }, { label: '外觀有凹撞傷', pct: 75 }],
  battery: [{ label: '95% 以上', min: 95, pct: 100 }, { label: '90–94%', min: 90, pct: 95 }, { label: '85–89%', min: 85, pct: 92 }, { label: '80–84%', min: 80, pct: 88 }, { label: '低於 80% 或顯示「維修」', min: 0, pct: 82 }],
  batteryDefault: 90,
  accessories: [{ label: '沒有原廠盒子' }, { label: '沒有原廠充電線' }, { label: '沒有原廠充電器' }],
  issues: [{ label: '螢幕有破裂', pct: 30 }, { label: '按鍵功能不正常', pct: 10 }, { label: '相機功能不正常', pct: 15 }, { label: '無法開機運作', inspect: true }, { label: '機身進過水', inspect: true }, { label: '其他問題', inspect: true }],
  note: '以上為預估價格，實際收購價以收到商品後的檢測結果為準；價格會隨市場行情調整。' };
let mockPrices = [['iPhone 11', '64GB', 2000, 0, 300, '沒有原廠盒子'], ['iPhone 13', '128GB', 5000, 80, 300], ['iPhone 15 Pro', '256GB', 14000, 85, 300], ['iPhone 16 Pro', '256GB', 18000, 90, 500], ['iPhone 17 Pro', '256GB', 24000, 95, 500], ['iPhone 16', '128GB', 0, '', '']]
  .map(([model, capacity, price, battery, acc, accItems]) => ({ category: 'iPhone', model, capacity, price, battery, acc, accItems: accItems || '沒有原廠盒子,沒有原廠充電線', note: '', newPrice: model === 'iPhone 17 Pro' ? 33000 : 0 }))
  .concat([
    { category: 'iPad', model: 'iPad Air 8 (M4) 11吋', capacity: '128GB Wi-Fi', price: 13500, newPrice: 16000, battery: 0, acc: 300, accItems: '', note: '' },
    { category: 'iPad', model: 'iPad Air 8 (M4) 11吋', capacity: '128GB LTE', price: 16000, newPrice: 17500, battery: 0, acc: 300, accItems: '', note: '' },
    { category: 'Mac', model: 'MacBook Air 13吋', capacity: '2022 M2', price: 11000, newPrice: 0, battery: 0, acc: 0, accItems: '沒有原廠盒子:1500,沒有原廠充電器:2000', note: '' },
    { category: 'Samsung', model: 'Galaxy S24 Ultra', capacity: '12G/256G', price: 11100, newPrice: 0, battery: '', acc: '', accItems: '', note: '' },
    { category: 'Apple Watch', model: 'Apple Watch 12', capacity: '42mm GPS', price: 0, newPrice: 9500, battery: '', acc: '', accItems: '', note: '' },
  ]);
const mockRepairs = [], mockAudit = [];
const mockHr = { profiles: {}, roster: {}, clocks: [], reqs: [], slips: [], seq: 0, S: { shifts: [{ name: '早班', start: '10:00', end: '19:00', brk: 60 }, { name: '晚班', start: '13:00', end: '22:00', brk: 60 }],  lat: 25.0339, lng: 121.5645, radius: 200, grace: 5, lateDeduct: false, dayHours: 8, since: '2026-11-01', workdays: [1, 2, 3, 4, 5, 6], shiftStart: '10:00', shiftEnd: '19:00', breakMin: 60 } };
let mockOwnerLogin = null, mockOwnerName = '老闆', mockPriceLog = [], mockRepairPrices = [], mockFee = 3, mockSale = [];
const mkKey = (m, c) => (String(m || '') + '|' + String(c || '')).toLowerCase().replace(/\s+/g, '');
const mkCard = c => c ? Math.ceil(c * (1 + mockFee / 100) / 10) * 10 : 0;
const mkSaleFor = r => { const t = mockSale.find(x => mkKey(x.model, x.capacity) === mkKey(r.model, r.capacity)); return t ? { cash: t.cash, card: t.card || mkCard(t.cash) } : null; };
const mockIntakes = [], mockStock = [
  { sku: 'AR261112001-1', source: '宅配', ref: 'AR261112001', inAt: '2026-11-15 11:00', category: '手機', model: 'iPhone 15 Pro', capacity: '256GB', color: '原色鈦金屬', serial: '356789012345678', notes: '外觀 A', cost: 18800, status: '已售出', saleDate: '2026-11-18', channel: '蝦皮', salePrice: 21500, updatedAt: '2026-11-18 14:00', updatedBy: '老闆', photos: [] },
];

// 預覽模式：前台與後台共用同一份假資料（存在這台電腦的瀏覽器裡，網址加 &reset=1 可重置）
if (MOCK) {
  try {
    if (new URLSearchParams(location.search).has('reset')) { ['mockDB', 'mockPhotos', 'mockUsers', 'mockMe', 'mockIntakes', 'mockStock', 'mockRepairs'].forEach(k => localStorage.removeItem(k)); }
    const mr = JSON.parse(localStorage.getItem('mockRepairs') || 'null'); if (mr) mockRepairs.splice(0, mockRepairs.length, ...mr);
    const mi = JSON.parse(localStorage.getItem('mockIntakes') || 'null'); if (mi) mockIntakes.splice(0, mockIntakes.length, ...mi);
    const ms = JSON.parse(localStorage.getItem('mockStock') || 'null'); if (ms) mockStock.splice(0, mockStock.length, ...ms);
    const us = JSON.parse(localStorage.getItem('mockUsers') || 'null');
    if (us) mockUsers.splice(0, mockUsers.length, ...us);
    mockMe = localStorage.getItem('mockMe') || '';
    const db = JSON.parse(localStorage.getItem('mockDB') || 'null');
    if (db) mockDB.splice(0, mockDB.length, ...db);
    Object.assign(mockPhotos, JSON.parse(localStorage.getItem('mockPhotos') || '{}'));
  } catch (e) {}
}
function mockPersist() {
  try {
    localStorage.setItem('mockDB', JSON.stringify(mockDB));
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    localStorage.setItem('mockMe', mockMe);
    localStorage.setItem('mockIntakes', JSON.stringify(mockIntakes));
    localStorage.setItem('mockStock', JSON.stringify(mockStock));
    localStorage.setItem('mockRepairs', JSON.stringify(mockRepairs));
    localStorage.setItem('mockPhotos', JSON.stringify(Object.fromEntries(Object.entries(mockPhotos).filter(([k]) => !k.startsWith('demo')))));
  } catch (e) {}
}

async function mockApi(action, d) {
  try { return await mockApiInner(action, d); } finally { mockPersist(); }
}
async function mockApiInner(action, d) {
  await new Promise(r => setTimeout(r, 350));
  const now = () => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
  const find = id => { const o = mockDB.find(x => x.id === id); if (!o) throw new Error('找不到此訂單'); return o; };
  const setStatus = (o, s, by) => { if (s && s !== o.status) { o.status = s; o.updatedAt = now(); o.history.push({ time: o.updatedAt, status: s, by: by || '客戶' }); } };
  const me = () => { const u = mockUsers.find(x => x.username === mockMe); return u ? { ...u, via: 'Staff' } : { username: '', name: mockOwnerName, role: '老闆', via: 'LINE', perms: Object.keys(MOCK_PERMS), mustChange: false }; };
  const need = p => { const s = me(); if (s.mustChange) throw new Error('請先修改密碼'); if (p && !s.perms.includes(p)) throw new Error('您沒有這項權限'); return s; };
  const adm = o => {
    const s = me(), a = { ...o, history: [...o.history], masked: {} };
    if (!s.perms.includes('view_contact')) { ['phone', 'email', 'city', 'address'].forEach(k => a[k] = ''); a.masked.contact = true; }
    if (!s.perms.includes('view_id')) { a.masked.id = !!(o.idNo || o.idPhoto); a.idNo = ''; a.idPhoto = ''; }
    if (!s.perms.includes('view_bank')) { a.masked.bank = !!o.bankAccount; ['bankName', 'bankBranch', 'bankAccount', 'bankHolder'].forEach(k => a[k] = ''); }
    a.edits = auditOf('宅配訂單', o.id, s);
    return a;
  };
  const storeOk = s => ['create_intake', 'edit_stock', 'edit_payment', 'view_cost'].some(p => s.perms.includes(p));
  const inOut = (o, s) => {
    const a = JSON.parse(JSON.stringify(o)); a.masked = {};
    const m = (v, h, t) => v.length <= h + t ? v : v.slice(0, h) + '*'.repeat(v.length - h - t) + v.slice(-t);
    if (!s.perms.includes('view_contact') && a.phone) { a.phone = m(a.phone, 2, 3); a.masked.phone = true; }
    if (!s.perms.includes('view_contact') && a.email) { a.email = a.email.replace(/^(.{1,2})[^@]*/, '$1***'); a.masked.email = true; a.mailLog = (a.mailLog || '').replace(/[^\s@（→]+@/g, '***@'); }
    if (!s.perms.includes('view_bank') && a.account) { a.account = m(a.account, 0, 4); a.masked.account = true; }
    if (!s.perms.includes('view_id')) { a.masked.id = a.idPhotos.length; a.idPhotos = []; }
    if (!s.perms.includes('view_cost')) { a.masked.cost = true; a.total = null; a.items.forEach(it => { it.price = null; it.base = null; (it.deductions || []).forEach(x => { x.amount = null; }); }); }
    if (!s.perms.includes('edit_payment') && !s.perms.includes('view_bank')) a.proofs = [];
    a.edits = auditOf('收購單', o.id, s);
    return a;
  };
  const auditLine = (x, s) => x.s ? `${x.f}：已修改` : x.c && !s.perms.includes('view_cost') ? `${x.f}：已修改（🔒 金額）` : `${x.f}：${x.a || '（空白）'} → ${x.b || '（空白）'}`;
  const auditOut = (r, s) => ({ ...r, lines: r.diffs.length ? r.diffs.map(x => auditLine(x, s)) : r.detail.split('\n') });
  const auditOf = (kind, id, s) => mockAudit.filter(r => r.kind === kind && r.ref === id).reverse().map(r => auditOut(r, s));
  const addAudit = (s, kind, ref, action, diffs, reason, detail = '') => mockAudit.push({ at: now(), by: s.name, kind, ref, action, diffs, reason: reason || '', detail });
  const diffOf = (o, n, labels, secret = {}, cost = {}) => Object.keys(labels).filter(k => n[k] !== undefined && String(o[k] ?? '') !== String(n[k] ?? ''))
    .map(k => secret[k] ? { f: labels[k], a: '', b: '', s: 1 } : { f: labels[k], a: String(o[k] ?? ''), b: String(n[k] ?? ''), c: cost[k] ? 1 : 0 });
  const rpOut = (o, s) => { const a = JSON.parse(JSON.stringify(o)); a.masked = {}; if (!s.perms.includes('view_cost')) { a.masked.cost = true; a.partsCost = null; a.parts.forEach(p => { p.cost = null; }); } a.edits = auditOf('維修單', o.id, s); return a; };
  const stOut = (r, s) => ({ ...r, suggestMode: r.suggestMode || (r.suggestCash ? 'auto' : ''), tableCash: (mkSaleFor(r) || {}).cash || 0, tableCard: (mkSaleFor(r) || {}).card || 0, cost: s.perms.includes('view_cost') ? r.cost : null, salePrice: s.perms.includes('view_cost') || s.perms.includes('edit_stock') ? r.salePrice : null });
  const pub = o => ({ ...o, idNo: o.idNo ? o.idNo.slice(0, 3) + '****' + o.idNo.slice(-3) : '', idPhoto: undefined, hasBank: !!o.bankAccount, bank: o.bankAccount ? { ...o, bankAccount: '****' + o.bankAccount.slice(-4) } : null, history: [...o.history], report: o.report ? (o.report.sent || null) : null });
  switch (action) {
    case 'loginGoogle': return { ok: true, session: 'mock', user: { name: 'Google 用戶', email: 'ming@gmail.com', via: 'Google' } };
    case 'emailStart': return { ok: true };
    case 'emailVerify': if (d.code !== '123456') throw new Error('驗證碼不正確（預覽請輸入 123456）'); return { ok: true, session: 'mock', user: { name: d.email, email: d.email, via: 'Email' } };
    case 'listOrders': return { ok: true, orders: mockDB.filter(o => o.lineId === 'Umock').reverse().map(pub) };
    case 'getOrder': return { ok: true, order: pub(find(d.id)) };
    case 'createOrder': {
      const o = { ...d.order, ...(d.order.bank || {}), id: 'AR261119' + String(mockDB.length + 1).padStart(3, '0'), createdAt: now(), status: '已預約', history: [{ time: now(), status: '已預約' }], updatedAt: now(),
        lineId: 'Umock', lineName: '王小明', qty: String(d.order.items.length), carrier: '', tracking: '', quote: '', quoteNote: '', internal: '', bankName: '', bankBranch: '', bankAccount: '', bankHolder: '', ...(d.order.bank || {}),
        itemsText: d.order.items.map((it, i) => `${i + 1}. 【${it.category}】${itemSummary(it)}`).join('\n') };
      mockDB.push(o); return { ok: true, order: pub(o) };
    }
    case 'respondQuote': { const o = find(d.id); if (d.accept) { if (!d.idNo || !d.idPhoto) throw new Error('請填寫身分證字號並上傳照片'); const pid = 'id' + Date.now(); mockPhotos[pid] = d.idPhoto; o.idNo = d.idNo; o.idPhoto = pid; } if (d.bank) Object.assign(o, d.bank); o.replyAt = now(); setStatus(o, d.accept ? '客戶同意' : '客戶不同意'); return { ok: true, order: pub(o) }; }
    case 'cancelOrder': { const o = find(d.id); setStatus(o, '已取消'); return { ok: true, order: pub(o) }; }
    case 'staffLogin': {
      if (mockOwnerLogin && mockOwnerLogin.username === String(d.username || '').trim().toLowerCase() && mockOwnerLogin.pw === d.password) { mockMe = ''; mockLoggedIn = true; return { ok: true, session: 'mock', user: { name: mockOwnerName, via: 'Owner' } }; }
      const u = mockUsers.find(x => x.username === String(d.username || '').trim().toLowerCase());
      if (!u || !u.enabled || u.pw !== d.password) throw new Error('帳號或密碼錯誤（預覽：tech1 / ship1 / acct1，密碼 password123）');
      u.lastLogin = now(); mockMe = u.username; mockLoggedIn = true;
      return { ok: true, session: 'mock', user: { name: u.name, via: 'Staff' } };
    }
    case 'adminWhoami': {
      const s = me();
      return { ok: true, isAdmin: true, userId: s.username || 'Umock', via: s.via, name: s.name, canEditSelf: s.role === '老闆' || s.perms.includes('manage_users'), role: s.role, perms: s.perms, mustChange: s.mustChange, permDefs: MOCK_PERMS, rolePresets: MOCK_PRESETS,
        loginVia: s.via, ownerLogin: s.role === '老闆' ? (mockOwnerLogin || {}).username || '' : undefined };
    }
    case 'ownerSetLogin': {
      if (need().role !== '老闆') throw new Error('只有老闆可以設定');
      if (d.disable) { mockOwnerLogin = null; return { ok: true, username: '' }; }
      const username = String(d.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,30}$/.test(username)) throw new Error('帳號只能用英文小寫、數字、. _ -，長度 3–30');
      if (mockUsers.some(x => x.username === username)) throw new Error('這個帳號已經有員工在用，請換一個');
      if (!mockOwnerLogin && !d.password) throw new Error('請設定密碼');
      if (d.password && d.password.length < 6) throw new Error('密碼至少 6 個字');
      mockOwnerLogin = { username, pw: d.password || mockOwnerLogin.pw }; return { ok: true, username };
    }
    case 'staffChangePassword': {
      const u = mockUsers.find(x => x.username === mockMe);
      if (!u) throw new Error('老闆帳號使用 LINE／Google 登入，不需要密碼');
      if (u.pw !== d.oldPassword) throw new Error('目前的密碼不正確');
      if (!String(d.newPassword || '')) throw new Error('請輸入新密碼');
      if (d.newPassword === d.oldPassword) throw new Error('新密碼不能和舊密碼相同');
      u.pw = d.newPassword; u.mustChange = false;
      return { ok: true, session: 'mock', user: { name: u.name, via: 'Staff' } };
    }
    case 'updateMyProfile': { const s = need(); if (!d.name) throw new Error('請填寫顯示名稱'); if (s.via === 'Staff') { if (!s.perms.includes('manage_users')) throw new Error('顯示名稱請找老闆或管理者修改'); mockUsers.find(x => x.username === s.username).name = d.name; } else mockOwnerName = d.name; return { ok: true, name: d.name }; }
    case 'adminUsers': need('manage_users'); return { ok: true, users: mockUsers.map(({ pw, ...u }) => ({ ...u, perms: [...u.perms] })) };
    case 'adminSaveUser': {
      need('manage_users');
      const v = d.user || {}, username = String(v.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,30}$/.test(username)) throw new Error('帳號只能用英文小寫、數字、. _ -，長度 3–30');
      let u = mockUsers.find(x => x.username === username);
      if (v.isNew && u) throw new Error('這個帳號已經存在');
      if (!u) { if (!v.password) throw new Error('請設定初始密碼'); u = { username, createdAt: now(), lastLogin: '' }; mockUsers.push(u); }
      if (v.password) { if (!String(v.password)) throw new Error('請輸入密碼'); u.pw = v.password; u.mustChange = true; }
      Object.assign(u, { name: v.name || username, role: v.role || '自訂', perms: (v.perms || []).filter(p => MOCK_PERMS[p]), enabled: v.enabled !== false });
      const { pw, ...pub } = u; return { ok: true, user: pub };
    }
    case 'adminDeleteUser': {
      const s = need('manage_users'), i = mockUsers.findIndex(x => x.username === d.username);
      if (!d.reason) throw new Error('請填寫刪除原因');
      if (s.username === d.username) throw new Error('不能刪除自己的帳號');
      if (i < 0) throw new Error('找不到這個帳號（可能已被刪除）');
      const [{ pw, ...pub }] = mockUsers.splice(i, 1); return { ok: true, user: pub };
    }
    case 'adminList': need(); return { ok: true, orders: mockDB.filter(o => !o.deletedAt).reverse().map(adm), statuses: STATUS_LIST };
    case 'orderEdit': {
      const s = need('edit_order'), o = mockDB.find(x => x.id === d.id && !x.deletedAt), f = d.fields || {};
      if (f.name !== undefined && !f.name) throw new Error('姓名不可空白');
      if (f.phone !== undefined && !/^09\d{8}$/.test(f.phone.replace(/[\s-]/g, ''))) throw new Error('手機號碼格式不正確');
      const diffs = diffOf(o, f, { name: '姓名', phone: '手機', email: 'Email', idNo: '身分證字號', city: '縣市', address: '地址', slot: '收件時段', note: '客戶備註', bankName: '銀行名稱', bankBranch: '銀行分行', bankAccount: '銀行帳號', bankHolder: '銀行戶名' }, { phone: 1, email: 1, idNo: 1, address: 1, bankAccount: 1 });
      if (!diffs.length) throw new Error('沒有任何修改');
      Object.assign(o, f); addAudit(s, '宅配訂單', o.id, '修改', diffs, d.reason);
      return { ok: true, order: adm(o) };
    }
    case 'orderDelete': {
      const s = need('delete_order'), o = mockDB.find(x => x.id === d.id && !x.deletedAt);
      if (!d.reason) throw new Error('請填寫刪除原因');
      Object.assign(o, { deletedAt: now(), deletedBy: s.name, deleteReason: d.reason });
      addAudit(s, '宅配訂單', o.id, '刪除', [], d.reason, `刪除宅配訂單：${o.name}（${o.status}，${o.createdAt} 建立）`);
      return { ok: true };
    }
    case 'photo': if (!mockPhotos[d.fileId]) throw new Error('找不到照片'); return { ok: true, dataUrl: mockPhotos[d.fileId] };
    case 'adminUploadPhoto': { need('edit_report'); const id = 'up' + Date.now() + Math.random().toString(36).slice(2, 6); mockPhotos[id] = d.dataUrl; return { ok: true, fileId: id }; }
    case 'adminDeletePhoto': need('edit_report'); return { ok: true };
    case 'adminSaveReport': {
      const s = need('edit_report');
      const o = find(d.id), rep = computeReport(JSON.parse(JSON.stringify(d.report)));
      delete rep.sent; rep.updatedAt = now();
      if (o.report && o.report.sent) rep.sent = o.report.sent;
      if (d.submit) {
        if (!rep.total) throw new Error('請先填寫基本收購價');
        const snap = JSON.parse(JSON.stringify(rep)); delete snap.sent; snap.sentAt = now(); rep.sent = snap;
        o.quote = String(rep.total); o.quoteNote = rep.summary; setStatus(o, '已報價', s.name);
      }
      o.report = rep;
      return { ok: true, order: adm(o) };
    }
    case 'adminUpdate': {
      const s = need();
      const o = find(d.id), f = d.fields || {};
      const has = p => s.perms.includes(p) || s.perms.includes('edit_any');
      const labels = { carrier: ['物流公司', 'edit_shipping'], tracking: ['託運單號', 'edit_shipping'], quote: ['報價金額', 'edit_report'], quoteNote: ['報價說明', 'edit_report'], internal: ['內部備註', ''] };
      Object.keys(labels).forEach(k => { if (k in f && f[k] !== o[k] && labels[k][1] && !has(labels[k][1])) throw new Error(`您沒有修改「${labels[k][0]}」的權限`); });
      if (f.status && f.status !== o.status && !canTransition(s.perms, o.status, f.status)) throw new Error(`您沒有把狀態改成「${f.status}」的權限`);
      if (f.status === '已報價' && !(f.quote ?? o.quote)) throw new Error('請先填寫報價金額');
      Object.keys(labels).forEach(k => { if (k in f) o[k] = f[k]; });
      const was = o.status;
      setStatus(o, f.status, s.name);
      if (o.status === '已付款' && was !== '已付款' && !mockStock.some(r => r.ref === o.id)) {
        o.items.forEach((it, i) => mockStock.push({ sku: o.id + '-' + (i + 1), source: '宅配', ref: o.id, inAt: now(), category: { iPhone: '手機', iPad: '平板', Mac: '筆電' }[it.category] || '其他商品',
          model: itemTitle(it), capacity: it.capacity || '', color: it.color || '', serial: it.imei || it.serial || '', notes: '', cost: i ? 0 : Number(o.quote) || 0, status: '在庫', saleDate: '', channel: '', salePrice: '', updatedAt: now(), updatedBy: s.name, photos: [] }));
      }
      return { ok: true, order: adm(o) };
    }
    case 'priceTable': return { ok: true, rows: mockPrices.filter(r => r.price > 0 || r.newPrice > 0), rules: mockPriceRules };
    case 'adminPrices': need('edit_prices'); return { ok: true, rows: mockPrices.map(r => ({ ...r })), rules: JSON.parse(JSON.stringify(mockPriceRules)) };
    case 'repairPrices': need(); return { ok: true, rows: mockRepairPrices.map(r => ({ ...r })) };
    case 'repairPricesSave': {
      const s = need('edit_prices'), key = r => r.category + '｜' + r.model + '｜' + r.item, om = {}, logs = [];
      mockRepairPrices.forEach(r => { om[key(r)] = r; });
      if (!mockRepairPrices.length) logs.push({ key: '維修價目', field: '匯入', before: '', after: `由官網價目匯入 ${d.rows.length} 筆` });
      else d.rows.forEach(r => { const o = om[key(r)]; if (!o) logs.push({ key: key(r), field: '新增', before: '', after: '價格 ' + r.price }); else if (String(o.price) !== String(r.price)) logs.push({ key: key(r), field: '價格', before: String(o.price), after: String(r.price) }); });
      logs.forEach(x => mockPriceLog.unshift({ at: now(), by: s.name, type: '維修價', ...x }));
      mockRepairPrices = d.rows.map(r => ({ ...r, price: Number(r.price) || 0 }));
      return { ok: true, rows: mockRepairPrices, changed: logs.length };
    }
    case 'priceLog': { need(); return { ok: true, logs: mockPriceLog.filter(x => (!d.type || x.type === d.type) && (!d.q || (x.key + ' ' + x.field + ' ' + x.by).toLowerCase().includes(d.q.toLowerCase()))) }; }
    case 'stockSettings': { const s = need('edit_stock'); mockPriceLog.unshift({ at: now(), by: s.name, type: '設定', key: '刷卡手續費', field: '手續費%', before: String(mockFee), after: String(d.cardFee) }); mockFee = Number(d.cardFee) || 0; return { ok: true, cardFee: mockFee }; }
    case 'stockSuggest': {
      const s = need('edit_stock'), list = mockStock.filter(r => (d.skus || [d.sku]).includes(r.sku));
      list.forEach(r => {
        const key = r.sku + '｜' + [r.model, r.capacity].filter(Boolean).join(' '), b = { cash: r.suggestCash, card: r.suggestCard };
        if (d.mode === 'auto') { const t = mkSaleFor(r); if (!t) throw new Error('建議售價表還沒有這個型號'); Object.assign(r, { suggestCash: t.cash, suggestCard: t.card, suggestMode: 'auto', suggestNote: '' }); }
        else { if (!Number(d.cash)) throw new Error('請填寫建議售價（現金價）'); if (!d.note) throw new Error('手動售價請備註特殊機況'); Object.assign(r, { suggestCash: Number(d.cash), suggestCard: d.card !== '' && d.card != null ? Number(d.card) : mkCard(Number(d.cash)), suggestMode: 'manual', suggestNote: d.note }); }
        Object.assign(r, { suggestAt: now(), suggestBy: s.name });
        if (b.cash !== r.suggestCash) mockPriceLog.unshift({ at: now(), by: s.name, type: '建議售價', key, field: d.mode === 'auto' ? '現金價（改回依型號）' : '現金價（特殊機況）', before: String(b.cash || ''), after: String(r.suggestCash) });
      });
      return { ok: true, items: list.map(r => stOut(r, s)), cash: list[0].suggestCash, card: list[0].suggestCard };
    }
    case 'saleTable': need(); return { ok: true, rows: mockSale.map(r => ({ ...r })), cardFee: mockFee };
    case 'saleTableSave': {
      const s = need('edit_stock'), om = {}; mockSale.forEach(r => { om[mkKey(r.model, r.capacity)] = r; }); let changed = 0, synced = 0;
      d.rows.forEach(r => { const o = om[mkKey(r.model, r.capacity)]; if (!o || o.cash !== r.cash || o.card !== r.card) { changed++; mockPriceLog.unshift({ at: now(), by: s.name, type: '建議售價表', key: r.category + '｜' + (r.model + ' ' + r.capacity).trim(), field: o ? '現金價' : '新增', before: o ? String(o.cash) : '', after: String(r.cash) }); } });
      mockSale = d.rows.map(r => ({ ...r }));
      mockStock.filter(r => r.status !== '已售出' && r.suggestMode !== 'manual').forEach(r => { const t = mkSaleFor(r); if (t && (t.cash !== r.suggestCash || t.card !== r.suggestCard)) { Object.assign(r, { suggestCash: t.cash, suggestCard: t.card, suggestMode: 'auto', suggestAt: now(), suggestBy: s.name }); synced++; } });
      return { ok: true, rows: mockSale, changed, synced, cardFee: mockFee };
    }
    case 'adminSavePrices': { const s0 = need('edit_prices'); { const k = r => r.category + '｜' + (r.model + ' ' + r.capacity).trim(), om = {}; mockPrices.forEach(r => { om[k(r)] = r; }); let n = 0;
        d.rows.forEach(r => { const o = om[k(r)]; [['price', '最高收購價'], ['newPrice', '全新價']].forEach(([f, l]) => { const a = String(o ? o[f] || '' : ''), b = String(Number(String(r[f] || '').replace(/[^\d]/g, '')) || ''); if (a !== b) { n++; mockPriceLog.unshift({ at: now(), by: s0.name, type: '收購價', key: k(r), field: o ? l : '新增', before: a, after: b }); } }); }); d._n = n; }
      mockPrices = d.rows.filter(r => r.model).map(r => ({ ...r, price: Number(String(r.price).replace(/[^\d]/g, '')) || 0 })); if (d.rules) Object.assign(mockPriceRules, d.rules); return { ok: true, rows: mockPrices, rules: mockPriceRules, changed: d._n }; }
    case 'intakeList': { const s = need(); if (!storeOk(s)) throw new Error('您沒有這項權限'); return { ok: true, intakes: mockIntakes.filter(o => !o.deletedAt).reverse().map(o => inOut(o, s)) }; }
    case 'intakeEdit': {
      const s = need('edit_intake'), o = mockIntakes.find(x => x.id === d.id && !x.deletedAt), f = d.fields || {};
      if (!o) throw new Error('找不到這張收購單');
      if (f.seller !== undefined && !f.seller) throw new Error('出售人姓名不可空白');
      if (f.payment && f.payment !== o.payment && o.remit === '已匯款') throw new Error('已匯款的收購單不能改付款方式');
      const pay = f.payment || o.payment, n = { ...f };
      if (pay === '轉帳') { if (o.payment !== '轉帳') n.remit = '待匯款'; } else { Object.assign(n, { bank: '', account: '', period: '', payDate: '' }); if (o.payment !== '現金') n.remit = ''; }
      const diffs = diffOf(o, n, { seller: '出售人', phone: '電話', email: '電子信箱', payment: '付款方式', bank: '收款銀行', account: '收款帳號', period: '匯款期限', payDate: '指定日期' }, { phone: 1, email: 1, account: 1 });
      const L = { model: '品名／型號', capacity: '容量', color: '顏色', serial: 'IMEI／序號', notes: '狀況說明', price: '收購金額' };
      (d.items || []).forEach((x, i) => { const it = o.items[i]; if (!it) return; const nv = { ...x }; if (!s.perms.includes('view_cost') || nv.price === '') delete nv.price; else if (nv.price !== undefined) nv.price = Number(nv.price);
        diffs.push(...diffOf(it, nv, Object.fromEntries(Object.entries(L).map(([k, l]) => [k, `商品${i + 1} ${l}`])), {}, { price: 1 })); Object.assign(it, nv); });
      if (!diffs.length) throw new Error('沒有任何修改');
      Object.keys(n).forEach(k => { o[k] = n[k]; });
      o.total = o.items.reduce((t, it) => t + (Number(it.price) || 0), 0);
      mockStock.filter(r => r.ref === o.id).forEach(r => { const it = o.items[Number(r.sku.split('-').pop()) - 1]; if (it) Object.assign(r, { model: it.model, capacity: it.capacity, color: it.color, serial: it.serial, cost: it.price, updatedAt: now(), updatedBy: s.name }); });
      addAudit(s, '收購單', o.id, '修改', diffs, d.reason);
      return { ok: true, intake: inOut(o, s) };
    }
    case 'intakeDelete': {
      const s = need('delete_intake'), o = mockIntakes.find(x => x.id === d.id && !x.deletedAt);
      if (!d.reason) throw new Error('請填寫刪除原因');
      const st = mockStock.filter(r => r.ref === o.id);
      if (st.some(r => r.status === '已售出')) throw new Error('這張單的商品已經售出，不能刪除；請先到庫存改回「在庫」');
      Object.assign(o, { deletedAt: now(), deletedBy: s.name, deleteReason: d.reason });
      st.forEach(r => { r.status = '已刪除'; });
      addAudit(s, '收購單', o.id, '刪除', [], d.reason, `刪除收購單：出售人 ${o.seller}（${o.createdAt}）\n商品：${o.items.map(it => it.model).join('、')}${st.length ? `\n庫存 ${st.length} 件一併標記為已刪除` : ''}`);
      return { ok: true };
    }
    case 'repairEdit': {
      const s = need('edit_repair'), o = mockRepairs.find(x => x.id === d.id && !x.deletedAt), f = { ...(d.fields || {}) };
      if (!f.customer) throw new Error('客戶姓名不可空白');
      if (!/^0\d{8,9}$/.test(String(f.phone || '').replace(/[\s-]/g, ''))) throw new Error('請填寫正確的聯絡電話');
      f.inspectFee = f.inspect ? Number(f.inspectFee) || 0 : 0;
      const diffs = diffOf(o, f, { customer: '客戶姓名', phone: '電話', email: '電子信箱', category: '類別', model: '型號', capacity: '容量', color: '顏色', serial: 'IMEI／序號', issue: '故障描述', condition: '外觀與配件', promise: '預計完成', inspect: '檢測後報價', inspectFee: '檢測費' });
      if (!diffs.length) throw new Error('沒有任何修改');
      Object.assign(o, f);
      addAudit(s, '維修單', o.id, '修改', diffs, d.reason);
      return { ok: true, repair: rpOut(o, s) };
    }
    case 'repairDelete': {
      const s = need('delete_repair'), o = mockRepairs.find(x => x.id === d.id && !x.deletedAt);
      if (!d.reason) throw new Error('請填寫刪除原因');
      Object.assign(o, { deletedAt: now(), deletedBy: s.name, deleteReason: d.reason });
      addAudit(s, '維修單', o.id, '刪除', [], d.reason, `刪除維修單：${o.customer}・${o.model}（${o.status}，${o.createdAt} 收件）`);
      return { ok: true };
    }
    case 'auditList': {
      const s = need();
      if (!['manage_users', 'edit_intake', 'delete_intake', 'edit_repair', 'delete_repair', 'edit_order', 'delete_order'].some(p => s.perms.includes(p))) throw new Error('您沒有這項權限');
      return { ok: true, logs: [...mockAudit].reverse().map(r => auditOut(r, s)) };
    }
    case 'intakeCreate': {
      const s = need('create_intake');
      if (!d.seller) throw new Error('請填寫出售人姓名');
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('電子信箱格式不正確');
      if (!d.trade && !d.sellerSign) throw new Error('請出售人完成簽名');
      const day = now().slice(2, 10).replace(/-/g, ''), id = 'IN' + day + String(mockIntakes.length + 1).padStart(3, '0');
      const save = (u) => { const k = 'mk' + Date.now() + Math.random().toString(36).slice(2, 6); mockPhotos[k] = u; return k; };
      const items = d.items.map(it => { const base = Number(it.base) || Number(it.price) || 0, deductions = (it.deductions || []).filter(x => x.reason || x.amount).map(x => ({ reason: x.reason, amount: Number(x.amount) || 0 }));
        return { ...it, _m: undefined, _open: undefined, base, deductions, price: Math.max(0, base - deductions.reduce((s, x) => s + x.amount, 0)), photos: it.photos.map(save) }; });
      const o = { id, createdAt: now(), staff: s.name, seller: d.seller, phone: d.phone, payment: d.payment, bank: d.bank || '', account: d.account || '', period: d.payment === '轉帳' ? d.period : '', payDate: d.payDate || '',
        total: items.reduce((t, it) => t + it.price, 0), remit: d.payment === '轉帳' ? '待匯款' : '', remitAt: '', remitBy: '', verified: true, noticeAt: d.idPhotos.length ? d.noticeAt : '',
        terms: '2026-11-21 門市收購條款 v1', items, idPhotos: d.idPhotos.map(save), sellerSign: d.trade ? '' : save(d.sellerSign), trade: !!d.trade, staffSign: d.staffSign ? save(d.staffSign) : '', staffUser: s.username || '老闆（LINE）', proofs: [], email: (d.email || '').toLowerCase(), mailLog: d.email ? `${now()} 已寄送 → ${(d.email || '').toLowerCase()}（模擬）` : '' };
      mockIntakes.push(o);
      items.forEach((it, i) => mockStock.push({ ...(t => t ? { suggestCash: t.cash, suggestCard: t.card, suggestMode: 'auto', suggestAt: now(), suggestBy: '依型號帶入' } : {})(mkSaleFor(it)), sku: id + '-' + (i + 1), source: '門市', ref: id, inAt: o.createdAt, category: it.category, model: it.model, capacity: it.capacity, color: it.color, serial: it.serial, notes: it.notes, cost: it.price, status: '在庫', saleDate: '', channel: '', salePrice: '', updatedAt: o.createdAt, updatedBy: s.name, photos: it.photos }));
      return { ok: true, intake: inOut(o, s) };
    }
    case 'intakePdf': {
      need();
      const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
      return { ok: true, name: `二手商品收購單_${d.id}_${d.kind === 'shop' ? '門市存聯' : '客戶聯'}.pdf`, data: btoa(pdf) };
    }
    case 'repairList': { const s = need(); return { ok: true, repairs: mockRepairs.filter(o => !o.deletedAt).reverse().map(o => rpOut(o, s)) }; }
    case 'repairCreate': {
      const s = need('repair');
      if (!d.customer) throw new Error('請填寫客戶姓名');
      if (!d.dropSign) throw new Error('請客人完成送修簽名');
      const save = (u) => { const k = 'rk' + Date.now() + Math.random().toString(36).slice(2, 6); mockPhotos[k] = u; return k; };
      const day = now().slice(2, 10).replace(/-/g, ''), id = 'RP' + day + String(mockRepairs.length + 1).padStart(3, '0');
      const items = (d.items || []).map(x => ({ name: x.name, amount: Number(x.amount) || 0, warranty: Number(x.warranty) || 0 }));
      const o = { id, createdAt: now(), staff: s.name, status: '待維修', customer: d.customer, phone: d.phone, email: d.email || '', category: d.category, model: d.model, capacity: d.capacity || '', color: d.color || '',
        serial: d.serial || '', issue: d.issue, condition: d.condition || '', items, quote: items.reduce((t, x) => t + x.amount, 0), inspect: !!d.inspect, inspectFee: Number(d.inspectFee) || 0, parts: [], partsCost: 0, fee: null, payment: '', promise: d.promise || '',
        doneAt: '', pickupAt: '', pickupBy: '', warrantyEnd: '', note: d.note || '', history: [`${now()}｜待維修（收件）｜${s.name}`], photos: (d.photos || []).map(save), dropSign: save(d.dropSign), pickSign: '',
        mailLog: d.email ? `${now()} 已寄送（收件）→ ${d.email}（模擬）` : '', masked: {} };
      mockRepairs.push(o);
      return { ok: true, repair: rpOut(o, need()) };
    }
    case 'repairUpdate': {
      const s = need('repair'), o = mockRepairs.find(x => x.id === d.id);
      if (d.expected && d.expected !== o.status) throw new Error('這張維修單剛被其他人更新，請重新整理');
      const txt = it => (it || []).map(x => `${x.name} NT$${x.amount}`).join('、'), before = { items: txt(o.items), parts: (o.parts || []).map(p => p.name).join('、'), note: o.note };
      const after = { items: d.items ? txt(d.items) : undefined, parts: d.parts ? d.parts.map(p => p.name).join('、') : undefined, note: d.note != null ? d.note : undefined };
      const rdiff = diffOf(before, after, { items: '維修項目', parts: '使用零件', note: '內部備註' }); if (rdiff.length) addAudit(s, '維修單', o.id, '修改', rdiff, '');
      if (d.items) { o.items = d.items; o.quote = d.items.reduce((t, x) => t + (Number(x.amount) || 0), 0); }
      if (d.parts) { o.parts = d.parts; o.partsCost = d.parts.reduce((t, p) => t + (Number(p.cost) || 0), 0); }
      if (d.note != null) o.note = d.note;
      if (d.status && d.status !== o.status) { if (d.status === '待取件' || d.status === '無法維修') { o.doneAt = now(); if (o.email) o.mailLog = `${now()} 已寄送（${d.status === '待取件' ? '完修通知' : '無法維修通知'}）→ ${o.email}（模擬）\n` + o.mailLog; } o.status = d.status; o.history.unshift(`${now()}｜${d.status}｜${s.name}`); }
      return { ok: true, repair: rpOut(o, need()) };
    }
    case 'repairPickup': {
      const s = need('repair'), o = mockRepairs.find(x => x.id === d.id);
      if (!d.pickSign) throw new Error('請客人完成取件簽名');
      if (d.items) { o.items = d.items; o.quote = d.items.reduce((t, x) => t + (Number(x.amount) || 0), 0); }
      const max = Math.max(0, ...o.items.map(x => Number(x.warranty) || 0));
      const t = new Date(); t.setDate(t.getDate() + max);
      o.warrantyEnd = max ? t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') : '';
      o.fee = Number(d.fee) || 0; o.payment = o.fee ? d.payment : ''; o.pickupAt = now(); o.pickupBy = s.name; o.doneAt = o.doneAt || o.pickupAt; o.status = '已取件';
      const k = 'rk' + Date.now(); mockPhotos[k] = d.pickSign; o.pickSign = k; o.history.unshift(`${now()}｜已取件｜${s.name}`);
      if (o.email) o.mailLog = `${now()} 已寄送（取件保固）→ ${o.email}（模擬）\n` + o.mailLog;
      return { ok: true, repair: rpOut(o, need()) };
    }
    case 'reportPdf': {
      need('view_cost');
      const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
      return { ok: true, name: (d.title || '報表') + '.pdf', data: btoa(pdf) };
    }
    case 'repairPdf': {
      need();
      const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
      return { ok: true, name: `維修${d.kind === 'pickup' ? '取件單' : '送修單'}_${d.id}.pdf`, data: btoa(pdf) };
    }
    case 'intakeMail': {
      const s = need('create_intake'), o = mockIntakes.find(x => x.id === d.id);
      const email = (d.email || '').toLowerCase() || o.email;
      if (!email) throw new Error('請填寫客人的電子信箱');
      o.email = email; o.mailLog = `${now()} 已寄送 → ${email}（模擬）` + (o.mailLog ? '\n' + o.mailLog : '');
      return { ok: true, intake: inOut(o, s) };
    }
    case 'intakeRemit': {
      const s = need('edit_payment'), o = mockIntakes.find(x => x.id === d.id);
      if (d.proof) { const k = 'pf' + Date.now(); mockPhotos[k] = d.proof; o.proofs.push(k); }
      if (d.status) { o.remit = d.status; o.remitAt = d.status === '已匯款' ? now() : ''; o.remitBy = d.status === '已匯款' ? s.name : ''; }
      return { ok: true, intake: inOut(o, s) };
    }

    /* ---------- 人資（模擬） ---------- */
    case 'hrMe': case 'hrClock': case 'hrRequest': case 'hrCancel': case 'hrMyPayslip': case 'hrRequests': case 'hrDecide': case 'hrAttendance':
    case 'hrClockAdd': case 'hrClockDelete': case 'hrStaff': case 'hrStaffSave': case 'hrSettings': case 'hrSettingsSave': case 'hrRoster': case 'hrRosterSave': case 'hrShiftsSave':
    case 'payrollList': case 'payrollCompute': case 'payrollSave': case 'payrollSaveAll': case 'payrollConfirm': return mockHrApi(action, d, need, me);
    case 'stockList': { const s = need(); if (!storeOk(s)) throw new Error('您沒有這項權限'); return { ok: true, items: mockStock.filter(r => r.status !== '已刪除').reverse().map(r => stOut(r, s)), cardFee: mockFee }; }
    case 'stockUpdate': {
      const s = need('edit_stock'), r = mockStock.find(x => x.sku === d.sku);
      if (d.expected && d.expected !== r.status) throw new Error('這件商品剛被其他人改過，請重新整理');
      if (d.status === '已售出') { if (!d.sale.date || !d.sale.channel || !d.sale.price) throw new Error('請填寫銷售日期、管道與價格'); Object.assign(r, { saleDate: d.sale.date, channel: d.sale.channel, salePrice: Number(d.sale.price) }); }
      else Object.assign(r, { saleDate: '', channel: '', salePrice: '' });
      Object.assign(r, { status: d.status, updatedAt: now(), updatedBy: s.name });
      return { ok: true, item: stOut(r, s) };
    }
  }
  throw new Error('未知的操作');
}

/* ---------- 人資模擬後端（計算用 HRC，與正式後端相同） ---------- */
function mockHrApi(action, d, need, me) {
  const H = mockHr, S = H.S, today = (() => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); })();
  const nowT = () => new Date().toTimeString().slice(0, 8);
  H.roster = H.roster || {};
  const prof = u => ({ ...(H.profiles[u] || { username: u, hireDate: '', workdays: S.workdays.slice(), shiftStart: S.shiftStart, shiftEnd: S.shiftEnd, breakMin: S.breakMin, payType: '月薪', salary: '', allowances: [], laborIns: '', healthIns: '', pensionPct: '', leaveAdjust: '', note: '' }), roster: H.roster[u] || {} });
  const emp = () => { const s = need(); if (s.via !== 'Staff') throw new Error('老闆帳號不用打卡；員工請用自己的員工帳號登入'); return s; };
  const annual = p => { const a = HRC.annualLeave(p.hireDate, today); if (!a) return null; const inR = q => Object.entries(q.split).filter(([k]) => k >= a.from && k <= a.to).reduce((t, [, h]) => t + h, 0);
    const mine = H.reqs.filter(q => q.username === p.username && q.kind === '請假' && q.leaveType === '特休'); const used = mine.filter(q => q.status === '已核准').reduce((t, q) => t + inR(q), 0) / S.dayHours;
    const pending = mine.filter(q => q.status === '待核准').reduce((t, q) => t + inR(q), 0) / S.dayHours; const total = a.days + (Number(p.leaveAdjust) || 0);
    const cov = {}; mine.filter(q => q.status === '已核准' || q.status === '待核准').forEach(q => Object.keys(q.split).forEach(k => { cov[k] = 1; })); const rd = HRC.rosterAnnualDays(p.roster, a.from, a.to, cov);
    return { ...a, adjust: Number(p.leaveAdjust) || 0, total, rosterDays: rd, used: used + rd, pending, left: total - used - rd - pending }; };
  const att = (p, month) => HRC.monthAttendance(p, month, H.clocks.filter(c => c.username === p.username && !c.deletedAt), H.reqs.filter(q => q.username === p.username && q.status === '已核准'), S, today);
  const staff = () => mockUsers.filter(u => u.enabled);
  const calc = (u, month, adj, ov) => { const p = prof(u), a = att(p, month), pay = HRC.computePay(p, month, a, H.reqs.filter(q => q.username === u && q.status === '已核准'), S, adj, ov); return { ...pay, payType: p.payType, salary: Number(p.salary) || 0, sum: a.sum }; };
  const month = /^\d{4}-\d{2}$/.test(d.month || '') ? d.month : today.slice(0, 7);
  switch (action) {
    case 'hrMe': {
      const s = need(); if (s.via !== 'Staff') return { ok: true, owner: true, hasLocation: !!S.lat };
      const p = prof(s.username), used = {};
      H.reqs.filter(q => q.username === s.username && q.kind === '請假' && q.status === '已核准').forEach(q => Object.entries(q.split).forEach(([k, h]) => { if (k.slice(0, 4) === today.slice(0, 4)) used[q.leaveType] = (used[q.leaveType] || 0) + h / S.dayHours; }));
      return { ok: true, month, today, hasLocation: !!S.lat, radius: S.radius, dayHours: S.dayHours, profile: { ...p, seniority: HRC.seniority(p.hireDate, today) },
        todayClocks: H.clocks.filter(c => c.username === s.username && c.date === today && !c.deletedAt), att: att(p, month), annual: annual(p), leaveUsed: used,
        upcoming: HRC.upcoming(p, H.reqs.filter(q => q.username === s.username && q.kind === '請假' && q.status === '已核准'), S, today, 14),
        requests: H.reqs.filter(q => q.username === s.username).slice().reverse(), payslips: H.slips.filter(x => x.username === s.username && x.status === '已確認').map(x => ({ id: x.id, month: x.month, net: x.net })) };
    }
    case 'hrClock': {
      const s = emp(); const R = 6371000, rad = x => x * Math.PI / 180, a = S.lat, b = S.lng, c2 = Number(d.lat), e2 = Number(d.lng);
      const dist = Math.round(2 * R * Math.asin(Math.sqrt(Math.sin(rad(c2 - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c2)) * Math.sin(rad(e2 - b) / 2) ** 2)));
      if (dist > S.radius + Math.min(Number(d.acc) || 0, 100)) throw new Error(`您距離門市約 ${dist} 公尺，超出打卡範圍（${S.radius} 公尺）`);
      const c = { id: 'CK' + Date.now(), username: s.username, name: s.name, type: d.type, at: today + ' ' + nowT(), date: today, dist, source: '手機', note: '', by: s.name };
      H.clocks.push(c); return { ok: true, clock: c };
    }
    case 'hrRequest': {
      const s = emp(), p = prof(s.username), q = { id: 'HR' + (++H.seq), username: s.username, name: s.name, kind: d.kind, start: d.start, end: d.start, reason: d.reason || '', status: '待核准', createdAt: today + ' ' + nowT().slice(0, 5), split: {}, hours: 0 };
      if (d.kind === '請假') { Object.assign(q, { leaveType: d.leaveType, unit: d.unit, end: d.unit === '全天' ? d.end : d.start }); q.split = HRC.leaveSplit(q.unit === '時數' ? { ...q, hours: d.hours } : q, p, S); q.hours = Object.values(q.split).reduce((t, h) => t + h, 0);
        if (!q.hours) throw new Error('選的日期都不是您的上班日'); if (q.leaveType === '特休') { const a = annual(p); if (!a || q.hours / S.dayHours > a.left) throw new Error(`特休剩 ${a ? a.left : 0} 天，不夠這次的 ${q.hours / S.dayHours} 天`); } }
      if (d.kind === '加班') { if (!d.reason) throw new Error('請填寫加班事由'); Object.assign(q, { hours: Math.round(Number(d.hours) * 2) / 2, otType: d.otType }); }
      if (d.kind === '補打卡') { if (!d.reason) throw new Error('請填寫忘記打卡的原因'); Object.assign(q, { clockType: d.clockType, clockTime: d.clockTime }); }
      H.reqs.push(q); return { ok: true, request: q };
    }
    case 'hrCancel': { const s = emp(), q = H.reqs.find(x => x.id === d.id && x.username === s.username); if (q.status !== '待核准') throw new Error('已審核的申請不能自己取消'); q.status = '已取消'; return { ok: true, request: q }; }
    case 'hrMyPayslip': { const s = emp(), x = H.slips.find(y => y.username === s.username && y.month === d.month && y.status === '已確認'); if (!x) throw new Error('這個月的薪資單還沒確認'); return { ok: true, slip: x }; }
    case 'hrRequests': need('hr_manage'); return { ok: true, requests: H.reqs.filter(q => !d.status || q.status === d.status).slice().reverse() };
    case 'hrDecide': {
      const s = need('hr_manage'), q = H.reqs.find(x => x.id === d.id);
      if (s.via === 'Staff' && q.username === s.username) throw new Error('不能審核自己的申請');
      if (!d.approve && !d.note) throw new Error('退回請填寫原因');
      Object.assign(q, { status: d.approve ? '已核准' : '已退回', decidedAt: today, decidedBy: s.name, decideNote: d.note || '' });
      if (d.approve && q.kind === '補打卡') H.clocks.push({ id: 'CK' + Date.now(), username: q.username, name: q.name, type: q.clockType, at: `${q.start} ${q.clockTime}:00`, date: q.start, dist: null, source: '補打卡申請', note: q.reason, by: s.name });
      return { ok: true, request: q };
    }
    case 'hrAttendance': need('hr_manage'); return { ok: true, month, today, staff: staff().map(u => { const p = prof(u.username); return { username: u.username, name: u.name, hireDate: p.hireDate, shift: `${p.shiftStart}–${p.shiftEnd}`, att: att(p, month), clocks: H.clocks.filter(c => c.username === u.username && c.date.slice(0, 7) === month && !c.deletedAt) }; }) };
    case 'hrClockAdd': { const s = need('hr_manage'); if (!d.note) throw new Error('請填寫補登原因'); const u = mockUsers.find(x => x.username === d.username); H.clocks.push({ id: 'CK' + Date.now(), username: u.username, name: u.name, type: d.type, at: `${d.date} ${d.time}:00`, date: d.date, dist: null, source: '主管補登', note: d.note, by: s.name }); return { ok: true }; }
    case 'hrClockDelete': { need('hr_manage'); if (!d.reason) throw new Error('請填寫刪除原因'); H.clocks.find(c => c.id === d.id).deletedAt = today; return { ok: true }; }
    case 'hrStaff': { const s = need('hr_manage'), pay = s.perms.includes('payroll'); return { ok: true, canPay: pay, staff: mockUsers.map(u => { const p = prof(u.username), o = { username: u.username, name: u.name, role: u.role, enabled: u.enabled, ...p, seniority: HRC.seniority(p.hireDate, today), annual: annual(p) }; if (!pay) ['payType', 'salary', 'allowances', 'laborIns', 'healthIns', 'pensionPct', 'bankName', 'bankAccount'].forEach(k => delete o[k]); return o; }) }; }
    case 'hrStaffSave': { const s = need('hr_manage'), v = d.profile, p = { ...prof(v.username) }; ['hireDate', 'workdays', 'shiftStart', 'shiftEnd', 'breakMin', 'leaveAdjust', 'note', 'realName', 'title', 'empType', 'gender', 'birthday', 'idNo', 'phone', 'email', 'regAddress', 'address', 'emergName', 'emergRel', 'emergPhone', 'leaveDate'].forEach(k => { if (v[k] !== undefined) p[k] = v[k]; });
      if (v.photoData) { const id = 'emp' + Date.now(); mockPhotos[id] = v.photoData; p.photo = id; } else if (v.photo === '') p.photo = '';
      if (s.perms.includes('payroll')) ['payType', 'salary', 'allowances', 'laborIns', 'healthIns', 'pensionPct', 'bankName', 'bankAccount'].forEach(k => { if (v[k] !== undefined) p[k] = v[k]; }); H.profiles[v.username] = p; return { ok: true, changes: ['已更新'] }; }
    case 'hrSettings': need('hr_manage'); return { ok: true, settings: { ...S } };
    case 'hrRoster': { need('hr_manage'); const prev = HRC.addYM(month + '-01', 0, -1).slice(0, 7);
      return { ok: true, month, today, shifts: S.shifts || [], staff: staff().map(u => { const p = prof(u.username), a = annual(p), pick = mo => Object.fromEntries(Object.entries(p.roster).filter(([k]) => k.slice(0, 7) === mo)), days = pick(month);
        const cov = {}; H.reqs.filter(q => q.username === u.username && q.kind === '請假' && q.leaveType === '特休' && q.status !== '已退回' && q.status !== '已取消').forEach(q => Object.keys(q.split).forEach(k => { if (k.slice(0, 7) === month) cov[k] = 1; }));
        return { username: u.username, name: u.name, role: u.role, hireDate: p.hireDate, workdays: p.workdays, shiftStart: p.shiftStart, shiftEnd: p.shiftEnd, days, prev: pick(prev), covered: Object.keys(cov),
          annual: a ? { from: a.from, to: a.to, total: a.total, label: a.label, baseLeft: a.left + HRC.rosterAnnualDays(days, a.from, a.to, cov) } : null }; }) }; }
    case 'hrRosterSave': { need('hr_manage'); const ok = ['休', '特休', ...(S.shifts || []).map(x => x.name)]; const changes = [];
      (d.rows || []).forEach(r => { Object.entries(r.days).forEach(([k, v]) => { if (!ok.includes(v)) throw new Error(`「${v}」不是班別選項`); });
        const m = H.roster[r.username] = H.roster[r.username] || {}; Object.keys(m).filter(k => k.slice(0, 7) === month).forEach(k => delete m[k]); Object.assign(m, r.days); changes.push(r.username); });
      return { ok: true, month, changes }; }
    case 'hrShiftsSave': { need('hr_manage'); const seen = {}; (d.shifts || []).forEach(x => { if (!x.name) throw new Error('請填寫班別名稱'); if (x.name === '休' || x.name === '特休') throw new Error('「休」「特休」是固定選項'); if (seen[x.name]) throw new Error('班別名稱重複：' + x.name); seen[x.name] = 1; if (!x.start || !x.end || x.end <= x.start) throw new Error(`「${x.name}」的上下班時間不正確`); });
      S.shifts = (d.shifts || []).map(x => ({ name: x.name, start: x.start, end: x.end, brk: Number(x.brk) || 0 })); return { ok: true, shifts: S.shifts }; }
    case 'hrSettingsSave': { need('hr_manage'); const v = d.settings; if (v.shiftEnd <= v.shiftStart) throw new Error('請填寫正確的上下班時間');
      Object.assign(S, { lat: Number(v.lat), lng: Number(v.lng), radius: Number(v.radius) || 200, grace: Number(v.grace) || 0, dayHours: Number(v.dayHours) || 8, since: v.since, lateDeduct: !!v.lateDeduct, workdays: v.workdays, shiftStart: v.shiftStart, shiftEnd: v.shiftEnd, breakMin: Number(v.breakMin) || 0 });
      let applied = 0; if (v.applyAll) staff().forEach(u => { H.profiles[u.username] = { ...prof(u.username), workdays: S.workdays.slice(), shiftStart: S.shiftStart, shiftEnd: S.shiftEnd, breakMin: S.breakMin }; applied++; });
      return { ok: true, settings: { ...S }, applied }; }
    case 'payrollList': need('payroll'); return { ok: true, month, slips: H.slips.filter(x => x.month === month), missing: staff().filter(u => !H.slips.some(x => x.month === month && x.username === u.username)).map(u => ({ username: u.username, name: u.name, salarySet: !!Number(prof(u.username).salary) })) };
    case 'payrollCompute': { const s = need('payroll'); staff().filter(u => Number(prof(u.username).salary)).forEach(u => { const id = month + '-' + u.username, old = H.slips.find(x => x.id === id); if (old && old.status === '已確認') return; const adj = old ? old.adjustments : [], ov = old ? old.overrides || {} : {}, pay = calc(u.username, month, adj, ov);
        const x = { id, month, username: u.username, name: u.name, status: '草稿', gross: pay.gross, deduct: pay.deduct, net: pay.net, detail: pay, adjustments: adj, overrides: ov, note: old ? old.note : '' }; if (old) Object.assign(old, x); else H.slips.push(x); }); return mockHrApi('payrollList', d, need, me); }
    case 'payrollSave': { need('payroll'); const x = H.slips.find(y => y.id === d.id), adj = (d.adjustments || []).filter(a => a.name && a.amount), ov = d.overrides !== undefined ? d.overrides : x.overrides || {}, pay = calc(x.username, x.month, adj, ov); Object.assign(x, { gross: pay.gross, deduct: pay.deduct, net: pay.net, detail: pay, adjustments: adj, overrides: ov, note: d.note }); return { ok: true, slip: x }; }
    case 'payrollSaveAll': { need('payroll'); (d.rows || []).forEach(r => { const x = H.slips.find(y => y.id === r.id); if (x.status === '已確認') throw new Error(x.name + ' 的薪資單已確認'); const ov = {}; Object.entries(r.overrides || {}).forEach(([k, v]) => { if (v !== '' && v != null) ov[k] = Math.abs(Number(v)) || 0; }); const pay = calc(x.username, x.month, x.adjustments || [], ov); Object.assign(x, { gross: pay.gross, deduct: pay.deduct, net: pay.net, detail: pay, overrides: ov, note: r.note !== undefined ? r.note : x.note }); }); return { ...mockHrApi('payrollList', d, need, me), changed: (d.rows || []).map(r => r.id) }; }
    case 'payrollConfirm': { const s = need('payroll'); const ids = []; H.slips.filter(x => d.ids.includes(x.id)).forEach(x => { x.status = d.reopen ? '草稿' : '已確認'; x.confirmedAt = d.reopen ? '' : today; x.confirmedBy = d.reopen ? '' : s.name; ids.push(x.id); }); return { ok: true, ids }; }
  }
}
