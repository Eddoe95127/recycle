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
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'iPhone 17e', 'iPhone 17', 'iPhone Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'iPhone 18 Pro', 'iPhone 18 Pro Max', 'iPhone Duo'];
const IPAD_MODELS = ['iPad Air4', 'iPad Air5', 'iPad Air6', 'iPad Air7', 'iPad Air8', 'iPad 6th', 'iPad 7th', 'iPad 8th', 'iPad 9th', 'iPad 10th', 'iPad 11th',
  'iPad mini5', 'iPad mini6', 'iPad mini7', 'iPad Pro M4', 'iPad Pro 11寸(第二代)', 'iPad Pro 11寸(第三代)', 'iPad Pro 11寸(第四代)',
  'iPad Pro 12.9(第三代)', 'iPad Pro 12.9(第四代)', 'iPad Pro 12.9(第五代)', 'iPad Pro 12.9(第六代)'];
const CAPACITIES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
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

/* ---------- LINE 登入 + API ---------- */
let liffReady = false;
async function initLine() {
  if (MOCK) { liffReady = true; return; }
  await liff.init({ liffId: CFG.LIFF_ID });
  liffReady = true;
}
const isLoggedIn = () => MOCK || (liffReady && liff.isLoggedIn());
function login(params) {
  if (MOCK) return;
  const url = new URL(location.href);
  url.search = new URLSearchParams(params || {}).toString();
  liff.login({ redirectUri: url.toString() });
}
async function lineProfile() {
  if (MOCK) return { displayName: '王小明', userId: 'Umock' };
  try { return await liff.getProfile(); } catch (e) { return {}; }
}
async function api(action, data = {}) {
  if (MOCK) return mockApi(action, data);
  const res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, accessToken: liff.getAccessToken(), ...data }) });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || '發生錯誤，請稍後再試');
  return j;
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

async function mockApi(action, d) {
  await new Promise(r => setTimeout(r, 350));
  const now = () => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
  const find = id => { const o = mockDB.find(x => x.id === id); if (!o) throw new Error('找不到此訂單'); return o; };
  const setStatus = (o, s) => { if (s && s !== o.status) { o.status = s; o.updatedAt = now(); o.history.push({ time: o.updatedAt, status: s }); } };
  const pub = o => ({ ...o, idNo: o.idNo.slice(0, 3) + '****' + o.idNo.slice(-3), hasBank: !!o.bankAccount, bank: o.bankAccount ? { ...o, bankAccount: '****' + o.bankAccount.slice(-4) } : null, history: [...o.history] });
  switch (action) {
    case 'listOrders': return { ok: true, orders: mockDB.filter(o => o.lineId === 'Umock').reverse().map(pub) };
    case 'getOrder': return { ok: true, order: pub(find(d.id)) };
    case 'createOrder': {
      const o = { ...d.order, ...(d.order.bank || {}), id: 'AR261119' + String(mockDB.length + 1).padStart(3, '0'), createdAt: now(), status: '已預約', history: [{ time: now(), status: '已預約' }], updatedAt: now(),
        lineId: 'Umock', lineName: '王小明', qty: String(d.order.items.length), carrier: '', tracking: '', quote: '', quoteNote: '', internal: '', bankName: '', bankBranch: '', bankAccount: '', bankHolder: '', ...(d.order.bank || {}),
        itemsText: d.order.items.map((it, i) => `${i + 1}. 【${it.category}】${itemSummary(it)}`).join('\n') };
      mockDB.push(o); return { ok: true, order: pub(o) };
    }
    case 'respondQuote': { const o = find(d.id); if (d.bank) Object.assign(o, d.bank); o.replyAt = now(); setStatus(o, d.accept ? '客戶同意' : '客戶不同意'); return { ok: true, order: pub(o) }; }
    case 'cancelOrder': { const o = find(d.id); setStatus(o, '已取消'); return { ok: true, order: pub(o) }; }
    case 'adminWhoami': return { ok: true, isAdmin: true, userId: 'Umock', name: '店長' };
    case 'adminList': return { ok: true, orders: [...mockDB].reverse().map(o => ({ ...o, history: [...o.history] })), statuses: STATUS_LIST };
    case 'adminUpdate': {
      const o = find(d.id), f = d.fields || {};
      if (f.status === '已報價' && !(f.quote ?? o.quote)) throw new Error('請先填寫報價金額');
      ['carrier', 'tracking', 'quote', 'quoteNote', 'internal'].forEach(k => { if (k in f) o[k] = f[k]; });
      setStatus(o, f.status);
      return { ok: true, order: { ...o, history: [...o.history] } };
    }
  }
  throw new Error('未知的操作');
}
