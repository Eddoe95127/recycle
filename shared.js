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
const DEDUCT_SUGGEST = ['螢幕刮傷', '螢幕破裂', '邊框刮傷／掉漆', '機身凹傷', '背蓋破裂', '電池健康度偏低', '泡水痕跡', '相機異常', 'Face ID 失效',
  '非原廠螢幕', '非原廠電池', '維修過', '按鍵異常', '無法開機', '缺配件'];
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
  clear() { try { localStorage.removeItem(this.ns + 'session'); localStorage.removeItem(this.ns + 'sessionUser'); } catch (e) {} },
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
const NO_AUTH = ['loginGoogle', 'emailStart', 'emailVerify', 'staffLogin', 'priceTable'];
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
const MOCK_PERMS = { view_contact: '查看客戶電話、Email、地址', view_id: '查看身分證字號與照片', view_bank: '查看匯款帳戶', edit_shipping: '處理物流（安排取件、已取件、到店、寄回）', edit_report: '填寫檢測報告、上傳照片、送出報價', edit_payment: '匯款作業（宅配標記已付款、門市標記已匯款與上傳截圖）', edit_any: '任意修改宅配訂單狀態（含取消）', manage_users: '管理員工帳號與權限', create_intake: '門市收購登記（建立收購單、列印收購聯）', view_cost: '查看收購金額與成本', edit_stock: '管理庫存（改庫存狀態、登記銷售、匯出盤點）', edit_prices: '維護線上估價表（價格與扣款規則）' };
const MOCK_PRESETS = { '店長': Object.keys(MOCK_PERMS).filter(k => k !== 'manage_users'), '檢測人員': ['edit_report'], '物流客服': ['view_contact', 'edit_shipping'], '會計': ['view_id', 'view_bank', 'edit_payment', 'view_cost'], '門市店員': ['create_intake'] };
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
const mockIntakes = [], mockStock = [
  { sku: 'AR261112001-1', source: '宅配', ref: 'AR261112001', inAt: '2026-11-15 11:00', category: '手機', model: 'iPhone 15 Pro', capacity: '256GB', color: '原色鈦金屬', serial: '356789012345678', notes: '外觀 A', cost: 18800, status: '已售出', saleDate: '2026-11-18', channel: '蝦皮', salePrice: 21500, updatedAt: '2026-11-18 14:00', updatedBy: '老闆', photos: [] },
];

// 預覽模式：前台與後台共用同一份假資料（存在這台電腦的瀏覽器裡，網址加 &reset=1 可重置）
if (MOCK) {
  try {
    if (new URLSearchParams(location.search).has('reset')) { ['mockDB', 'mockPhotos', 'mockUsers', 'mockMe', 'mockIntakes', 'mockStock'].forEach(k => localStorage.removeItem(k)); }
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
  const me = () => { const u = mockUsers.find(x => x.username === mockMe); return u ? { ...u, via: 'Staff' } : { username: '', name: '老闆', role: '老闆', via: 'LINE', perms: Object.keys(MOCK_PERMS), mustChange: false }; };
  const need = p => { const s = me(); if (s.mustChange) throw new Error('請先修改密碼'); if (p && !s.perms.includes(p)) throw new Error('您沒有這項權限'); return s; };
  const adm = o => {
    const s = me(), a = { ...o, history: [...o.history], masked: {} };
    if (!s.perms.includes('view_contact')) { ['phone', 'email', 'city', 'address'].forEach(k => a[k] = ''); a.masked.contact = true; }
    if (!s.perms.includes('view_id')) { a.masked.id = !!(o.idNo || o.idPhoto); a.idNo = ''; a.idPhoto = ''; }
    if (!s.perms.includes('view_bank')) { a.masked.bank = !!o.bankAccount; ['bankName', 'bankBranch', 'bankAccount', 'bankHolder'].forEach(k => a[k] = ''); }
    return a;
  };
  const storeOk = s => ['create_intake', 'edit_stock', 'edit_payment', 'view_cost'].some(p => s.perms.includes(p));
  const inOut = (o, s) => {
    const a = JSON.parse(JSON.stringify(o)); a.masked = {};
    const m = (v, h, t) => v.length <= h + t ? v : v.slice(0, h) + '*'.repeat(v.length - h - t) + v.slice(-t);
    if (!s.perms.includes('view_contact') && a.phone) { a.phone = m(a.phone, 2, 3); a.masked.phone = true; }
    if (!s.perms.includes('view_bank') && a.account) { a.account = m(a.account, 0, 4); a.masked.account = true; }
    if (!s.perms.includes('view_id')) { a.masked.id = a.idPhotos.length; a.idPhotos = []; }
    if (!s.perms.includes('view_cost')) { a.masked.cost = true; a.total = null; a.items.forEach(it => it.price = null); }
    if (!s.perms.includes('edit_payment') && !s.perms.includes('view_bank')) a.proofs = [];
    return a;
  };
  const stOut = (r, s) => ({ ...r, cost: s.perms.includes('view_cost') ? r.cost : null, salePrice: s.perms.includes('view_cost') || s.perms.includes('edit_stock') ? r.salePrice : null });
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
      const u = mockUsers.find(x => x.username === String(d.username || '').trim().toLowerCase());
      if (!u || !u.enabled || u.pw !== d.password) throw new Error('帳號或密碼錯誤（預覽：tech1 / ship1 / acct1，密碼 password123）');
      u.lastLogin = now(); mockMe = u.username; mockLoggedIn = true;
      return { ok: true, session: 'mock', user: { name: u.name, via: 'Staff' } };
    }
    case 'adminWhoami': {
      const s = me();
      return { ok: true, isAdmin: true, userId: s.username || 'Umock', via: s.via, name: s.name, role: s.role, perms: s.perms, mustChange: s.mustChange, permDefs: MOCK_PERMS, rolePresets: MOCK_PRESETS };
    }
    case 'staffChangePassword': {
      const u = mockUsers.find(x => x.username === mockMe);
      if (!u) throw new Error('老闆帳號使用 LINE／Google 登入，不需要密碼');
      if (u.pw !== d.oldPassword) throw new Error('目前的密碼不正確');
      if (String(d.newPassword || '').length < 8) throw new Error('新密碼至少 8 個字');
      if (d.newPassword === d.oldPassword) throw new Error('新密碼不能和舊密碼相同');
      u.pw = d.newPassword; u.mustChange = false;
      return { ok: true, session: 'mock', user: { name: u.name, via: 'Staff' } };
    }
    case 'adminUsers': need('manage_users'); return { ok: true, users: mockUsers.map(({ pw, ...u }) => ({ ...u, perms: [...u.perms] })) };
    case 'adminSaveUser': {
      need('manage_users');
      const v = d.user || {}, username = String(v.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,30}$/.test(username)) throw new Error('帳號只能用英文小寫、數字、. _ -，長度 3–30');
      let u = mockUsers.find(x => x.username === username);
      if (v.isNew && u) throw new Error('這個帳號已經存在');
      if (!u) { if (!v.password) throw new Error('請設定初始密碼'); u = { username, createdAt: now(), lastLogin: '' }; mockUsers.push(u); }
      if (v.password) { if (String(v.password).length < 8) throw new Error('密碼至少 8 個字'); u.pw = v.password; u.mustChange = true; }
      Object.assign(u, { name: v.name || username, role: v.role || '自訂', perms: (v.perms || []).filter(p => MOCK_PERMS[p]), enabled: v.enabled !== false });
      const { pw, ...pub } = u; return { ok: true, user: pub };
    }
    case 'adminList': need(); return { ok: true, orders: [...mockDB].reverse().map(adm), statuses: STATUS_LIST };
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
    case 'adminSavePrices': { need('edit_prices'); mockPrices = d.rows.filter(r => r.model).map(r => ({ ...r, price: Number(String(r.price).replace(/[^\d]/g, '')) || 0 })); if (d.rules) Object.assign(mockPriceRules, d.rules); return { ok: true, rows: mockPrices, rules: mockPriceRules }; }
    case 'intakeList': { const s = need(); if (!storeOk(s)) throw new Error('您沒有這項權限'); return { ok: true, intakes: [...mockIntakes].reverse().map(o => inOut(o, s)) }; }
    case 'intakeCreate': {
      const s = need('create_intake');
      if (!d.seller) throw new Error('請填寫出售人姓名');
      if (!d.sellerSign || !d.staffSign) throw new Error('請完成出售人與經手人簽名');
      const day = now().slice(2, 10).replace(/-/g, ''), id = 'IN' + day + String(mockIntakes.length + 1).padStart(3, '0');
      const save = (u) => { const k = 'mk' + Date.now() + Math.random().toString(36).slice(2, 6); mockPhotos[k] = u; return k; };
      const items = d.items.map(it => ({ ...it, price: Number(it.price) || 0, photos: it.photos.map(save) }));
      const o = { id, createdAt: now(), staff: s.name, seller: d.seller, phone: d.phone, payment: d.payment, bank: d.bank || '', account: d.account || '', period: d.payment === '轉帳' ? d.period : '', payDate: d.payDate || '',
        total: items.reduce((t, it) => t + it.price, 0), remit: d.payment === '轉帳' ? '待匯款' : '', remitAt: '', remitBy: '', verified: true, noticeAt: d.idPhotos.length ? d.noticeAt : '',
        terms: '2026-11-21 門市收購條款 v1', items, idPhotos: d.idPhotos.map(save), sellerSign: save(d.sellerSign), staffSign: save(d.staffSign), proofs: [] };
      mockIntakes.push(o);
      items.forEach((it, i) => mockStock.push({ sku: id + '-' + (i + 1), source: '門市', ref: id, inAt: o.createdAt, category: it.category, model: it.model, capacity: it.capacity, color: it.color, serial: it.serial, notes: it.notes, cost: it.price, status: '在庫', saleDate: '', channel: '', salePrice: '', updatedAt: o.createdAt, updatedBy: s.name, photos: it.photos }));
      return { ok: true, intake: inOut(o, s) };
    }
    case 'intakeRemit': {
      const s = need('edit_payment'), o = mockIntakes.find(x => x.id === d.id);
      if (d.proof) { const k = 'pf' + Date.now(); mockPhotos[k] = d.proof; o.proofs.push(k); }
      if (d.status) { o.remit = d.status; o.remitAt = d.status === '已匯款' ? now() : ''; o.remitBy = d.status === '已匯款' ? s.name : ''; }
      return { ok: true, intake: inOut(o, s) };
    }
    case 'stockList': { const s = need(); if (!storeOk(s)) throw new Error('您沒有這項權限'); return { ok: true, items: [...mockStock].reverse().map(r => stOut(r, s)) }; }
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
