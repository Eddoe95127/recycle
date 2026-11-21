/* =====================================================================
 * 門市收購單、庫存、匯款（後台）
 * 依賴 admin.html 的 app、me、P()、pagesNav()、closeDrawer()、start()，與 shared.js 的工具函式
 * ===================================================================== */
const COMPANY = CFG.COMPANY || '丰格科技有限公司';
const IN_CATS = {
  '手機': ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17', 'iPhone Air', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini', 'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone SE（第 3 代）', 'iPhone SE（第 2 代）'],
  '平板': ['iPad', 'iPad mini', 'iPad Air', 'iPad Pro'],
  '筆電': ['MacBook Air', 'MacBook Pro', 'MacBook'],
  '其他 3C': ['Apple Watch', 'AirPods', 'AirPods Pro', 'AirPods Max', 'Mac mini', 'iMac', 'Mac Studio'],
  '其他商品': [],
};
const IN_CAPS = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const IN_COLORS = ['黑色', '白色', '銀色', '灰色', '金色', '藍色', '綠色', '粉紅色', '紫色', '紅色', '原色鈦金屬', '沙漠色鈦金屬'];
const IN_NOTES = ['螢幕刮傷', '螢幕破裂', '邊框刮傷', '邊框凹傷', '背蓋破裂', '電池需更換', '無法充電', '無法開機', '相機異常', 'Face ID 異常', '附原盒', '附充電線'];
const IN_BANKS = ['004 臺灣銀行', '005 臺灣土地銀行', '006 合作金庫', '007 第一銀行', '008 華南銀行', '009 彰化銀行', '012 台北富邦', '013 國泰世華',
  '017 兆豐銀行', '700 中華郵政', '803 聯邦銀行', '805 遠東銀行', '806 元大銀行', '807 永豐銀行', '808 玉山銀行', '809 凱基銀行', '812 台新銀行',
  '822 中國信託', '823 將來銀行', '824 LINE Bank'];
const IN_PERIODS = ['收購當日', '收購後 1 個工作天內', '收購後 3 個工作天內', '指定日期'];
const SALE_CHANNELS = ['門市', '蝦皮', '露天', 'Facebook', '同業批發', '其他'];
const IN_TERMS = [
  ['交易與付款', '雙方以本單所列商品、收購金額及付款方式為本次買賣內容。出售人依約交付商品，門市依約支付價款；付款是否完成，以實際收款或轉帳紀錄為準。'],
  ['商品來源與處分權', '出售人確認對商品有合法處分權，並據實告知所知的遺失、遭竊、租賃、分期未繳清、所有權保留或第三人權利等情形。如有隱瞞，出售人應負法律責任並返還價款。'],
  ['商品點交與瑕疵', '門市記錄點交時可檢查的外觀、功能及配件。出售人應據實說明所知的故障、泡水、維修、更換零件或其他瑕疵。'],
  ['裝置帳號與資料', '出售人於交付前自行備份資料、登出 Apple ID 並關閉「尋找」。若無法解除，雙方應記錄狀態與處理方式。門市於交易完成後清除裝置資料。'],
  ['個人資料', `${COMPANY}依個人資料保護法，僅於本次收購交易、查核與法令要求範圍內蒐集、處理及利用出售人資料，並妥善保管。`],
  ['電子簽署', '雙方核對本單及條款後，同意以電子方式簽署並各自留存，效力與紙本簽名相同。'],
];
const IN_NOTICE = [
  ['蒐集者', `${COMPANY}（${CFG.SHOP_NAME}）`],
  ['蒐集目的', '核對出售人身分與本次收購交易、二手商品交易查核，以及依法配合主管機關查詢。'],
  ['資料類別', '證件影像（可能包含姓名、證號、出生日期、照片）。照片會加上「僅限收購使用」浮水印。'],
  ['利用期間與方式', '保存於本公司雲端硬碟，僅授權人員可查閱；於法令規定的保存期間屆滿後刪除。'],
  ['您的權利', '您可依個資法第 3 條請求查詢、閱覽、製給複本、補充更正、停止利用或刪除，請洽門市或客服。'],
];

const isStoreRoute = page => ['intake', 'intake/new', 'stock', 'remit'].includes(page);
function storeRoute(page) {
  $('#refresh').hidden = page === 'intake/new';
  if (page === 'intake/new' && P('create_intake')) return intakeForm();
  if (page === 'intake' && canStoreView()) { $('#refresh').onclick = () => intakePage(true); return intakePage(); }
  if (page === 'stock' && canStoreView()) { $('#refresh').onclick = () => stockPage(true); return stockPage(); }
  if (page === 'remit' && P('edit_payment')) { $('#refresh').onclick = () => remitPage(true); return remitPage(); }
  location.hash = '';
}
const canStoreView = () => ['create_intake', 'edit_stock', 'edit_payment', 'view_cost'].some(P);
const nt = v => v == null ? '🔒' : 'NT$ ' + Number(v || 0).toLocaleString('en-US');

/* ============================== 收購單列表 ============================== */
let intakes = [], inQuery = '';
async function loadIntakes() { intakes = (await api('intakeList')).intakes; }
async function intakePage(refresh) {
  if (refresh || !intakes.length) {
    app.innerHTML = pagesNav('intake') + '<div class="spinner"></div>';
    try { await loadIntakes(); } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('intake') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const today = new Date().toISOString().slice(0, 10);
  const todays = intakes.filter(o => o.createdAt.slice(0, 10) === today);
  app.innerHTML = `${pagesNav('intake')}
    ${SHOP && P('create_intake') ? '<a class="shop-cta" href="#intake/new"><div><b>＋ 新增收購單</b><small>客人在現場：填商品 → 核對證件 → 雙方簽名 → 列印收購聯</small></div><span class="go">→</span></a>' : ''}
    <div class="toolbar" style="align-items:center">
      <input class="input" id="inQ" placeholder="搜尋 單號／出售人／型號／IMEI" value="${esc(inQuery)}">
      ${P('create_intake') && !SHOP ? '<a class="btn btn-dark" href="#intake/new" style="white-space:nowrap">＋ 新增收購單</a>' : ''}
    </div>
    <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat" style="--c:#0A84FF"><div class="n num">${todays.length}</div><div class="l">今日收購單</div></div>
      ${P('view_cost') ? `<div class="stat" style="--c:#30D158"><div class="n num">${nt(todays.reduce((t, o) => t + (o.total || 0), 0))}</div><div class="l">今日收購金額</div></div>` : ''}
      <div class="stat" style="--c:#FF9F0A"><div class="n num">${intakes.filter(o => o.remit === '待匯款').length}</div><div class="l">待匯款</div></div>
    </div>
    <div id="inTbl"></div>`;
  $('#inQ').oninput = e => { inQuery = e.target.value; drawIntakeTable(); };
  drawIntakeTable();
}
function drawIntakeTable() {
  const q = inQuery.trim().toLowerCase();
  const list = intakes.filter(o => !q || [o.id, o.seller, o.staff, ...o.items.map(it => it.model + ' ' + it.serial)].join(' ').toLowerCase().includes(q));
  $('#inTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>單號</th><th>出售人</th><th>商品</th><th class="hide-m">金額</th><th>付款</th><th class="hide-m">經手</th></tr></thead><tbody>
    ${list.map(o => `<tr data-in="${esc(o.id)}"><td><b class="num">${esc(o.id)}</b><div class="sub">${esc(o.createdAt)}</div></td>
      <td>${esc(o.seller)}<div class="sub num">${esc(o.phone)}</div></td>
      <td>${esc(o.items[0]?.model || '')}${o.items.length > 1 ? ` <span class="sub">+${o.items.length - 1}</span>` : ''}</td>
      <td class="num hide-m">${nt(o.total)}</td>
      <td>${o.payment === '轉帳' ? `<span class="pill ${o.remit === '已匯款' ? '' : 'warn'}">${esc(o.remit)}</span>` : '<span class="pill off">現金</span>'}</td>
      <td class="sub hide-m">${esc(o.staff)}</td></tr>`).join('')}
    </tbody></table>` : `<div class="card empty">${intakes.length ? '沒有符合的收購單' : '還沒有門市收購單'}</div>`;
  $$('[data-in]').forEach(tr => tr.onclick = () => intakeDrawer(intakes.find(o => o.id === tr.dataset.in)));
}

/* ---------- 收購單明細（抽屜） ---------- */
function intakeDrawer(o) {
  const NOPE = '<span class="no-perm">🔒 無權限查看</span>';
  const d = $('#drawer');
  d.innerHTML = `
    <div class="d-head"><b class="num">${esc(o.id)}</b>${o.payment === '轉帳' ? `<span class="pill ${o.remit === '已匯款' ? '' : 'warn'}">${esc(o.remit)}</span>` : '<span class="pill off">現金</span>'}<button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      <div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-dark btn-sm" data-rc="shop">列印門市存聯</button>
        <button class="btn btn-ghost btn-sm" data-rc="customer">列印客戶聯</button></div>
        ${o.masked.cost ? '<p class="small muted" style="margin:8px 0 0">您沒有查看金額的權限，收購聯上的金額會隱藏</p>' : ''}</div>
      <div class="card"><h3>交易</h3><dl class="kv">
        <dt>建立時間</dt><dd>${esc(o.createdAt)}</dd><dt>經手人</dt><dd>${esc(o.staff)}</dd>
        <dt>出售人</dt><dd>${esc(o.seller)}</dd><dt>電話</dt><dd class="num">${esc(o.phone || '未填')}${o.masked.phone ? ' <span class="no-perm">🔒</span>' : ''}</dd>
        <dt>付款</dt><dd>${esc(o.payment)}</dd>
        ${o.payment === '轉帳' ? `<dt>收款帳戶</dt><dd class="num">${esc(o.bank)}<br>${esc(o.account)}${o.masked.account ? ' <span class="no-perm">🔒</span>' : ''}</dd><dt>匯款期限</dt><dd>${esc(o.period)}${o.payDate ? ' ' + esc(o.payDate) : ''}</dd>` : ''}
        ${o.remitAt ? `<dt>已匯款</dt><dd>${esc(o.remitAt)}・${esc(o.remitBy)}</dd>` : ''}
        <dt>合計</dt><dd class="num"><b>${nt(o.total)}</b></dd></dl></div>
      <div class="card"><h3>商品（${o.items.length}）</h3>
        ${o.items.map((it, i) => `<div style="padding:10px 0;border-top:${i ? '1px solid var(--line)' : '0'}">
          <b>${i + 1}. ${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</b> <span class="num" style="float:right">${nt(it.price)}</span>
          <div class="small muted">${esc(it.category)}${it.serial ? '・' + esc(it.serial) : ''}${it.notes ? '・' + esc(it.notes) : ''}</div>
          <div class="ph-grid" style="margin-top:8px">${it.photos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="商品照片"></div>`).join('')}</div></div>`).join('')}</div>
      <div class="card"><h3>證件與簽名</h3>
        <p class="small" style="margin:0 0 8px">${o.verified ? '✓ 門市已核對證件' : ''}${o.noticeAt ? `・出售人已確認個資告知（${esc(fmtTime(o.noticeAt))}）` : ''}</p>
        ${o.masked.id ? `<p>${NOPE}　<span class="small muted">已附 ${o.masked.id} 張證件照</span></p>` : o.idPhotos.length ? `<div class="ph-grid">${o.idPhotos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="證件"></div>`).join('')}</div>` : '<p class="small muted">未附證件照片</p>'}
        <div class="grid2" style="margin-top:10px"><div><div class="small muted">出售人簽名</div><img class="sig-img" data-photo="${esc(o.sellerSign)}" alt="出售人簽名"></div>
          <div><div class="small muted">經手人簽名</div><img class="sig-img" data-photo="${esc(o.staffSign)}" alt="經手人簽名"></div></div></div>
      ${P('edit_payment') && o.payment === '轉帳' ? remitBox(o) : ''}
    </div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  $$('[data-rc]', d).forEach(b => b.onclick = () => showReceipt(o, b.dataset.rc));
  loadPhotos(d);
  bindRemit(d, o, () => intakeDrawer(intakes.find(x => x.id === o.id)));
}
const fmtTime = iso => { const t = new Date(iso); return isNaN(t) ? iso : t.toLocaleString('zh-TW', { hour12: false }); };

/* ---------- 匯款（抽屜內） ---------- */
function remitBox(o) {
  return `<div class="card"><h3>匯款作業</h3>
    ${o.account && !o.masked.account ? `<div class="uid" style="margin-top:0">${esc(o.bank)}　${esc(o.account)}　戶名：${esc(o.seller)}　<button class="copy" data-copy="${esc(o.account)}">複製帳號</button></div>` : ''}
    <div class="ph-grid">${o.proofs.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="匯款截圖"></div>`).join('')}
      ${o.proofs.length < 4 ? '<label class="ph-add">＋ 匯款截圖<input type="file" accept="image/*" hidden data-proof></label>' : ''}</div>
    <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
      ${o.remit === '已匯款' ? '<button class="btn btn-ghost btn-sm" data-remit="待匯款">改回待匯款</button>' : `<button class="btn btn-dark" data-remit="已匯款">標記已匯款 ${nt(o.total)}</button>`}
      <span class="err" id="rmErr" style="margin:0"></span></div></div>`;
}
function bindRemit(root, o, redraw) {
  $$('[data-copy]', root).forEach(b => b.onclick = () => navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('已複製'), () => {}));
  const run = async (data, msg) => {
    $('#rmErr', root).textContent = '儲存中…';
    try {
      const r = await api('intakeRemit', { id: o.id, ...data });
      const i = intakes.findIndex(x => x.id === o.id); if (i >= 0) intakes[i] = r.intake; else intakes.push(r.intake);
      toast(msg); redraw();
      if (location.hash === '#remit') drawRemitTable(); else if (location.hash === '#intake') drawIntakeTable();
    } catch (e) { if (e.auth) return start(); $('#rmErr', root).textContent = e.message; }
  };
  $$('[data-remit]', root).forEach(b => b.onclick = async () => {
    if (b.dataset.remit === '已匯款' && !(await ask(`確定已匯款 ${nt(o.total)} 給 ${o.seller}？`, '已匯款'))) return;
    run({ status: b.dataset.remit }, b.dataset.remit === '已匯款' ? '已標記為已匯款' : '已改回待匯款');
  });
  const f = $('[data-proof]', root);
  if (f) f.onchange = async () => { if (!f.files[0]) return; try { run({ proof: await resizeImage(f.files[0], 1600, 0.8) }, '已上傳匯款截圖'); } catch (e) { toast(e.message); } };
}

/* ============================== 新增收購單（三步驟） ============================== */
let dr = null, drStep = 1, drBusy = false, drDone = null;
const newItem = () => ({ category: '手機', model: '', capacity: '', color: '', serial: '', price: '', notes: '', photos: [] });
const newDraft = () => ({ requestId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random(), seller: '', phone: '', payment: '', bank: '', account: '', period: IN_PERIODS[1], payDate: '',
  items: [newItem()], idPhotos: [], noticeAt: '', verified: false, agreed: false, sellerSign: '', staffSign: '' });

function intakeForm() {
  if (!dr || drDone) { dr = newDraft(); drStep = 1; drDone = null; }
  drawForm();
}
window.addEventListener('beforeunload', e => { if (dr && !drDone && location.hash === '#intake/new' && (dr.seller || dr.items[0].model)) { e.preventDefault(); e.returnValue = ''; } });

function drawForm() {
  if (drDone) return drawDone();
  const steps = ['商品與交易', '證件核對', '確認與簽名'];
  app.innerHTML = `${pagesNav('intake')}
    <div class="in-wrap">
      <div class="in-steps">${steps.map((s, i) => `<div class="${i + 1 === drStep ? 'on' : i + 1 < drStep ? 'done' : ''}"><i>${i + 1 < drStep ? '✓' : i + 1}</i>${s}</div>`).join('')}</div>
      <div id="inBody">${drStep === 1 ? stepItems() : drStep === 2 ? stepId() : stepSign()}</div>
      <div class="in-foot"><span class="err" id="inErr" style="flex:1;margin:0"></span>
        ${drStep > 1 ? '<button class="btn btn-ghost" id="inBack">上一步</button>' : '<a class="btn btn-ghost" href="#intake" id="inCancel">取消</a>'}
        <button class="btn btn-dark" id="inNext">${drStep < 3 ? '下一步' : '完成並建立收購單'}</button></div>
    </div>`;
  bindForm();
  window.scrollTo(0, 0);
}
const fld = (label, key, val, extra = '') => `<label class="field"><span>${label}</span><input class="input" data-k="${key}" value="${esc(val)}" ${extra}></label>`;
function stepItems() {
  return `<div class="card"><h3>出售人與付款</h3>
      <div class="grid2">${fld('出售人姓名 *', 'seller', dr.seller, 'autocomplete="off"')}${fld('聯絡電話', 'phone', dr.phone, 'type="tel" inputmode="tel" placeholder="選填"')}</div>
      <div class="field"><span>付款方式 *</span><div class="chips">${['現金', '轉帳'].map(p => `<label class="chip"><input type="radio" name="pay" value="${p}" ${dr.payment === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div></div>
      ${dr.payment === '轉帳' ? `<div class="grid2">
        <label class="field"><span>收款銀行 *</span><input class="input" data-k="bank" list="bankList" value="${esc(dr.bank)}" placeholder="例：822 中國信託"><datalist id="bankList">${IN_BANKS.map(b => `<option value="${esc(b)}">`).join('')}</datalist></label>
        ${fld('收款帳號 *', 'account', dr.account, 'inputmode="numeric" autocomplete="off"')}
        <label class="field"><span>匯款期限</span><select class="input" data-k="period">${IN_PERIODS.map(p => `<option ${dr.period === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        ${dr.period === '指定日期' ? fld('指定日期', 'payDate', dr.payDate, 'type="date"') : ''}</div>
        <p class="small muted" style="margin:0">戶名須與出售人相同</p>` : ''}
    </div>
    ${dr.items.map((it, i) => `<div class="card" data-i="${i}">
      <h3 style="display:flex;justify-content:space-between">商品 ${i + 1}${dr.items.length > 1 ? `<button class="link" data-del-item="${i}" style="font-size:13px">移除</button>` : ''}</h3>
      <div class="chips" style="margin-bottom:10px">${Object.keys(IN_CATS).map(c => `<label class="chip"><input type="radio" name="cat${i}" data-cat value="${c}" ${it.category === c ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div>
      <div class="grid2">
        <label class="field"><span>品名／型號 *</span><input class="input" data-f="model" list="ml${i}" value="${esc(it.model)}" placeholder="可直接輸入"><datalist id="ml${i}">${IN_CATS[it.category].map(m => `<option value="${esc(m)}">`).join('')}</datalist></label>
        <label class="field"><span>收購金額（NT$）*</span><input class="input num" data-f="price" inputmode="numeric" value="${esc(it.price)}" placeholder="整數"></label>
        <label class="field"><span>容量／規格</span><input class="input" data-f="capacity" list="capList" value="${esc(it.capacity)}"></label>
        <label class="field"><span>顏色</span><input class="input" data-f="color" list="colList" value="${esc(it.color)}"></label>
      </div>
      <label class="field"><span style="display:flex;justify-content:space-between;align-items:center">IMEI／序號
        <label class="link" style="font-size:13px;cursor:pointer">📷 拍設定畫面自動辨識<input type="file" accept="image/*" capture="environment" hidden data-ocr></label></span>
        <input class="input num" data-f="serial" value="${esc(it.serial)}" autocomplete="off" spellcheck="false"></label>
      <div class="field"><span>狀況／配件</span>
        <div class="chips small-chips">${IN_NOTES.map(n => `<button type="button" class="chip-btn" data-note="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <textarea class="input" data-f="notes" style="margin-top:8px" placeholder="可自行補充">${esc(it.notes)}</textarea></div>
      <div class="field"><span>外觀照片 *（最多 8 張）</span>
        <div class="ph-grid">${it.photos.map((p, j) => `<div class="ph"><img src="${p}" alt="商品照片"><button class="ph-del" data-delph="${j}" aria-label="刪除">✕</button></div>`).join('')}
          ${it.photos.length < 8 ? `<label class="ph-add">📷 拍照<input type="file" accept="image/*" capture="environment" hidden data-photo-add></label>
          <label class="ph-add">＋ 相簿<input type="file" accept="image/*" multiple hidden data-photo-add></label>` : ''}</div></div>
    </div>`).join('')}
    <datalist id="capList">${IN_CAPS.map(c => `<option value="${c}">`).join('')}</datalist><datalist id="colList">${IN_COLORS.map(c => `<option value="${c}">`).join('')}</datalist>
    <button class="btn btn-ghost btn-block" id="addItem">＋ 再加一件商品</button>
    ${P('view_cost') ? `<div class="rep-total" style="margin-top:14px"><span>合計</span><b id="inTotal">NT$ ${money(sumDraft())}</b></div>` : ''}`;
}
const sumDraft = () => dr.items.reduce((t, it) => t + (Number(it.price) || 0), 0);
function stepId() {
  return `<div class="card"><h3>證件照片個資蒐集告知</h3>
      <p class="small muted" style="margin:0 0 8px">請出售人閱讀後勾選確認，再拍攝證件。</p>
      <dl class="kv notice-kv">${IN_NOTICE.map(([h, b]) => `<dt>${esc(h)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      <label class="check"><input type="checkbox" id="noticeOk" ${dr.noticeAt ? 'checked' : ''}> 出售人已閱讀並了解上述告知</label>
    </div>
    <div class="card"><h3>證件照片（正面，最多 2 張）</h3>
      <p class="small muted" style="margin:0 0 8px">會自動加上「僅限收購使用」與日期浮水印</p>
      <div class="ph-grid">${dr.idPhotos.map((p, j) => `<div class="ph"><img src="${p}" alt="證件"><button class="ph-del" data-delid="${j}" aria-label="刪除">✕</button></div>`).join('')}
        ${dr.idPhotos.length < 2 ? `<label class="ph-add ${dr.noticeAt ? '' : 'disabled'}">📷 拍證件<input type="file" accept="image/*" capture="environment" hidden data-id-add ${dr.noticeAt ? '' : 'disabled'}></label>` : ''}</div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="verifiedOk" ${dr.verified ? 'checked' : ''}> 我已當面核對出售人證件與本人相符 *</label>
    </div>`;
}
function stepSign() {
  return `<div class="card"><h3>核對內容</h3><dl class="kv">
      <dt>出售人</dt><dd>${esc(dr.seller)}${dr.phone ? '　' + esc(dr.phone) : ''}</dd>
      <dt>付款</dt><dd>${esc(dr.payment)}${dr.payment === '轉帳' ? `　${esc(dr.bank)} ${esc(dr.account)}（${esc(dr.period === '指定日期' ? dr.payDate : dr.period)}）` : ''}</dd>
      ${dr.items.map((it, i) => `<dt>商品 ${i + 1}</dt><dd>${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}${it.serial ? `<br><span class="small muted">${esc(it.serial)}</span>` : ''}<span class="num" style="float:right">NT$ ${money(it.price)}</span></dd>`).join('')}
      <dt>合計</dt><dd class="num"><b style="font-size:18px">NT$ ${money(sumDraft())}</b></dd></dl></div>
    <div class="card"><h3>二手商品收購條款</h3><ol class="terms-ol">${IN_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
      <label class="check"><input type="checkbox" id="agreeOk" ${dr.agreed ? 'checked' : ''}> 雙方已核對商品、金額與付款方式，同意上述條款，並以電子方式簽署 *</label></div>
    <div class="card"><h3>簽名</h3><div class="grid2">
      ${[['sellerSign', '出售人簽名'], ['staffSign', `經手人簽名（${esc(me.name)}）`]].map(([k, l]) => `<div><div style="display:flex;justify-content:space-between" class="small"><b>${l}</b><button type="button" class="link" data-clear="${k}" style="font-size:13px">清除</button></div>
        <canvas class="sig-pad" data-sig="${k}" width="600" height="220"></canvas></div>`).join('')}</div></div>`;
}

function bindForm() {
  const body = $('#inBody'), err = m => { $('#inErr').textContent = m || ''; };
  $$('[data-k]', body).forEach(el => el.oninput = el.onchange = () => { dr[el.dataset.k] = el.value; if (el.dataset.k === 'period') drawForm(); });
  $$('input[name=pay]', body).forEach(r => r.onchange = () => { dr.payment = r.value; drawForm(); });
  $$('[data-i]', body).forEach(card => {
    const it = dr.items[+card.dataset.i];
    $$('[data-f]', card).forEach(el => el.oninput = () => { it[el.dataset.f] = el.value; if (el.dataset.f === 'price' && $('#inTotal')) $('#inTotal').textContent = 'NT$ ' + money(sumDraft()); });
    $$('[data-cat]', card).forEach(r => r.onchange = () => { it.category = r.value; drawForm(); });
    $$('[data-note]', card).forEach(b => b.onclick = () => { if (!it.notes.includes(b.dataset.note)) it.notes = (it.notes ? it.notes + '、' : '') + b.dataset.note; $('[data-f=notes]', card).value = it.notes; });
    $$('[data-delph]', card).forEach(b => b.onclick = () => { it.photos.splice(+b.dataset.delph, 1); drawForm(); });
    $$('[data-photo-add]', card).forEach(inp => inp.onchange = async () => {
      const files = [...inp.files].slice(0, 8 - it.photos.length);
      err('處理照片中…');
      for (const f of files) { try { it.photos.push(await resizeImage(f, 1280, 0.8)); } catch (e) { toast(e.message); } }
      err(); drawForm();
    });
    const ocr = $('[data-ocr]', card);
    if (ocr) ocr.onchange = () => ocr.files[0] && runOcr(ocr.files[0], it);
  });
  $$('[data-del-item]', body).forEach(b => b.onclick = async () => { if (await ask(`移除商品 ${+b.dataset.delItem + 1}？`, '移除')) { dr.items.splice(+b.dataset.delItem, 1); drawForm(); } });
  if ($('#addItem')) $('#addItem').onclick = () => { dr.items.push(newItem()); drawForm(); setTimeout(() => $$('[data-i]').pop()?.scrollIntoView({ behavior: 'smooth' }), 50); };
  if ($('#noticeOk')) $('#noticeOk').onchange = e => { dr.noticeAt = e.target.checked ? new Date().toISOString() : ''; if (!e.target.checked) dr.idPhotos = []; drawForm(); };
  if ($('#verifiedOk')) $('#verifiedOk').onchange = e => { dr.verified = e.target.checked; };
  $$('[data-delid]', body).forEach(b => b.onclick = () => { dr.idPhotos.splice(+b.dataset.delid, 1); drawForm(); });
  const idIn = $('[data-id-add]', body);
  if (idIn) idIn.onchange = async () => { try { dr.idPhotos.push(await watermarkImage(idIn.files[0], 1400)); } catch (e) { toast(e.message); } drawForm(); };
  if ($('#agreeOk')) $('#agreeOk').onchange = e => { dr.agreed = e.target.checked; };
  $$('[data-sig]', body).forEach(c => sigPad(c, dr[c.dataset.sig], url => { dr[c.dataset.sig] = url; }));
  $$('[data-clear]', body).forEach(b => b.onclick = () => { dr[b.dataset.clear] = ''; drawForm(); });
  if ($('#inBack')) $('#inBack').onclick = () => { drStep--; drawForm(); };
  $('#inNext').onclick = () => nextStep(err);
}

function nextStep(err) {
  if (drStep === 1) {
    if (!dr.seller.trim()) return err('請填寫出售人姓名');
    if (!dr.payment) return err('請選擇付款方式');
    if (dr.payment === '轉帳') {
      if (!dr.bank.trim()) return err('請填寫收款銀行');
      if (!/^\d{6,24}$/.test(dr.account.replace(/[\s-]/g, ''))) return err('收款帳號請輸入 6–24 位數字');
      if (dr.period === '指定日期' && !dr.payDate) return err('請選擇指定匯款日期');
    }
    for (let i = 0; i < dr.items.length; i++) {
      const it = dr.items[i];
      if (!it.model.trim()) return err(`請填寫商品 ${i + 1} 的品名／型號`);
      if (!(Number(it.price) > 0)) return err(`請填寫商品 ${i + 1} 的收購金額`);
      if (!it.photos.length) return err(`請拍攝商品 ${i + 1} 的外觀照片`);
    }
  }
  if (drStep === 2 && !dr.verified) return err('請勾選「已當面核對出售人證件」');
  if (drStep < 3) { drStep++; return drawForm(); }
  if (!dr.agreed) return err('請勾選同意條款與電子簽署');
  if (!dr.sellerSign || !dr.staffSign) return err('請完成出售人與經手人簽名');
  submitIntake(err);
}
async function submitIntake(err) {
  if (drBusy) return;
  drBusy = true;
  const btn = $('#inNext'); btn.disabled = true; btn.textContent = '上傳中，請勿關閉…';
  try {
    const r = await api('intakeCreate', { ...dr, account: dr.account.replace(/[\s-]/g, '') });
    drDone = r.intake;
    drDone._local = { items: dr.items.map(it => it.photos), ids: dr.idPhotos, sellerSign: dr.sellerSign, staffSign: dr.staffSign };
    intakes.unshift(r.intake);
    stockCache = null;
    drawForm();
  } catch (e) {
    if (e.auth) return start();
    err(e.message); btn.disabled = false; btn.textContent = '完成並建立收購單';
  } finally { drBusy = false; }
}
function drawDone() {
  const o = drDone;
  // 剛建立的單：照片直接用本機的，不必再下載
  o.items.forEach((it, i) => it.photos.forEach((id, j) => { if (o._local.items[i]?.[j]) photoCache[id] = o._local.items[i][j]; }));
  o.idPhotos.forEach((id, j) => { if (o._local.ids[j]) photoCache[id] = o._local.ids[j]; });
  photoCache[o.sellerSign] = o._local.sellerSign; photoCache[o.staffSign] = o._local.staffSign;
  app.innerHTML = `${pagesNav('intake')}<div class="card staff-login rise" style="text-align:center">
    <div style="font-size:44px">✅</div><h2 class="card-title">收購單已建立</h2>
    <p class="num" style="font-size:22px;margin:6px 0">${esc(o.id)}</p>
    <p class="muted">${esc(o.seller)}・${o.items.length} 件${o.total != null ? `・NT$ ${money(o.total)}` : ''}${o.payment === '轉帳' ? '・待匯款' : '・現金'}</p>
    <div style="display:grid;gap:10px;margin-top:18px">
      <button class="btn btn-dark btn-block" data-rc="customer">列印／存 PDF 客戶聯（交給出售人）</button>
      <button class="btn btn-ghost btn-block" data-rc="shop">列印門市存聯</button>
      <button class="btn btn-ghost btn-block" id="nextOne">＋ 下一位客人</button>
      <a class="btn btn-ghost btn-block" href="#intake">回收購單列表</a></div></div>`;
  $$('[data-rc]').forEach(b => b.onclick = () => showReceipt(o, b.dataset.rc));
  $('#nextOne').onclick = () => { dr = null; intakeForm(); };
}

/* ---------- 簽名板 ---------- */
function sigPad(canvas, existing, onChange) {
  const g = canvas.getContext('2d');
  g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111';
  if (existing) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0); img.src = existing; }
  let drawing = false, last = null, inked = !!existing;
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
  canvas.onpointerdown = e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); };
  canvas.onpointermove = e => {
    if (!drawing) return;
    const p = pos(e);
    g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke();
    last = p; inked = true;
  };
  canvas.onpointerup = canvas.onpointercancel = () => { if (drawing && inked) onChange(canvas.toDataURL('image/png')); drawing = false; };
}

/* ---------- 拍照辨識 IMEI／型號 ---------- */
async function runOcr(file, it) {
  if (typeof deviceOcr === 'undefined') return toast('辨識功能載入失敗');
  const w = document.createElement('div');
  w.className = 'ask-wrap';
  const url = URL.createObjectURL(file);
  const ctrl = new AbortController();
  w.innerHTML = `<div class="ask-box" style="max-width:420px"><img src="${url}" style="width:100%;max-height:220px;object-fit:contain;border-radius:10px;background:#f2f2f4">
    <p id="ocrMsg" class="small">正在載入辨識工具，第一次使用需要幾秒…</p><div id="ocrRes"></div>
    <div class="ask-btns"><button class="btn btn-ghost" data-x>關閉</button></div></div>`;
  document.body.appendChild(w);
  const close = () => { ctrl.abort(); URL.revokeObjectURL(url); w.remove(); };
  $('[data-x]', w).onclick = close;
  try {
    const r = await deviceOcr.recognize(file, f => { $('#ocrMsg', w) && ($('#ocrMsg', w).textContent = `辨識中 ${Math.round(f * 100)}%`); }, ctrl.signal);
    if (!r || (!r.model && !r.serial && !r.imei)) { $('#ocrMsg', w).textContent = '沒有辨識到型號或序號，請拍清楚「設定 → 一般 → 關於本機」畫面，或手動輸入。'; return; }
    $('#ocrMsg', w).textContent = '請對照照片確認，可直接修改：';
    $('#ocrRes', w).innerHTML = `<label class="field"><span>品名／型號</span><input class="input" id="oM" value="${esc(r.model)}"></label>
      <label class="field"><span>IMEI／序號</span><input class="input num" id="oS" value="${esc(r.imei || r.serial)}"></label>
      ${r.imei && r.serial ? `<p class="small muted">也讀到序號 ${esc(r.serial)}</p>` : ''}
      <button class="btn btn-dark btn-block" id="oOk">帶入表單</button>`;
    $('#oOk', w).onclick = () => { if ($('#oM', w).value.trim()) it.model = $('#oM', w).value.trim(); if ($('#oS', w).value.trim()) it.serial = $('#oS', w).value.trim(); close(); drawForm(); toast('已帶入辨識結果'); };
  } catch (e) { if ($('#ocrMsg', w)) $('#ocrMsg', w).textContent = e.message || '辨識失敗，請手動輸入'; }
}

/* ============================== 收購聯（列印） ============================== */
async function showReceipt(o, kind) {
  const customer = kind === 'customer';
  const maskTail = (s, n) => s ? '*'.repeat(Math.max(0, s.length - n)) + s.slice(-n) : '';
  const phone = customer ? maskTail(o.phone, 3) : o.phone;
  const account = customer ? maskTail(o.account, 4) : o.account;
  const w = document.createElement('div'); w.className = 'lightbox prev';
  w.innerHTML = `<div class="prev-box"><div id="report" class="receipt">
    <div class="rc-head"><div><div class="small muted">${esc(COMPANY)}・${esc(CFG.SHOP_NAME)}</div><h2>二手商品收購單</h2></div>
      <div style="text-align:right"><b class="num">${esc(o.id)}</b><div class="small">${customer ? '客戶聯' : '門市存聯'}</div></div></div>
    <table class="rc-meta"><tr><th>日期</th><td>${esc(o.createdAt)}</td><th>經手人</th><td>${esc(o.staff)}</td></tr>
      <tr><th>出售人</th><td>${esc(o.seller)}</td><th>電話</th><td class="num">${esc(phone || '—')}</td></tr>
      <tr><th>付款方式</th><td colspan="3">${esc(o.payment)}${o.payment === '轉帳' ? `　${esc(o.bank)} ${esc(account)}　${esc(o.period)}${o.payDate ? ' ' + esc(o.payDate) : ''}` : ''}</td></tr></table>
    <table class="rc-items"><thead><tr><th>#</th><th>商品</th><th>IMEI／序號</th><th>狀況</th><th style="text-align:right">金額</th></tr></thead><tbody>
      ${o.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</td><td class="num">${esc(it.serial || '—')}</td><td>${esc(it.notes || '')}</td><td class="num" style="text-align:right">${it.price == null ? '—' : 'NT$ ' + money(it.price)}</td></tr>`).join('')}
      <tr class="rc-total"><td colspan="4">合計</td><td class="num" style="text-align:right">${o.total == null ? '—' : 'NT$ ' + money(o.total)}</td></tr></tbody></table>
    <ol class="terms-ol small">${IN_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
    <p class="small">✓ 門市已當面核對出售人證件　✓ 雙方同意上述條款並以電子方式簽署（${esc(o.terms)}）</p>
    ${o.idPhotos.length ? `<div class="rc-ids">${o.idPhotos.map(p => `<img data-photo="${esc(p)}" alt="證件（浮水印）">`).join('')}</div>` : ''}
    <div class="rc-sign"><div><img data-photo="${esc(o.sellerSign)}" alt="出售人簽名"><span>出售人 ${esc(o.seller)}</span></div>
      <div><img data-photo="${esc(o.staffSign)}" alt="經手人簽名"><span>經手人 ${esc(o.staff)}</span></div></div>
  </div><div class="no-print" style="display:flex;gap:8px;margin-top:12px"><button class="btn" style="flex:1;background:#fff;color:#111" data-print>🖨 列印／存成 PDF</button><button class="btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)" data-close>關閉</button></div></div>`;
  document.body.appendChild(w);
  w.onclick = e => { if (e.target === w || e.target.dataset.close !== undefined) w.remove(); };
  await loadPhotos(w);
  $('[data-print]', w).onclick = () => { document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 200); };
}

/* ============================== 庫存 ============================== */
let stockCache = null, stQuery = '', stStatus = 'active', stSource = '';
async function stockPage(refresh) {
  if (refresh || !stockCache) {
    app.innerHTML = pagesNav('stock') + '<div class="spinner"></div>';
    try { stockCache = (await api('stockList')).items; } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('stock') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const active = stockCache.filter(r => r.status !== '已售出');
  const month = new Date().toISOString().slice(0, 7);
  const soldM = stockCache.filter(r => r.status === '已售出' && (r.saleDate || '').slice(0, 7) === month);
  app.innerHTML = `${pagesNav('stock')}
    <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat" style="--c:#0A84FF"><div class="n num">${active.length}</div><div class="l">在庫（含整理中）</div></div>
      <div class="stat" style="--c:#BF5AF2"><div class="n num">${stockCache.filter(r => r.status === '整理中').length}</div><div class="l">整理中</div></div>
      ${P('view_cost') ? `<div class="stat" style="--c:#30D158"><div class="n num">${nt(active.reduce((t, r) => t + (r.cost || 0), 0))}</div><div class="l">在庫成本</div></div>` : ''}
      <div class="stat" style="--c:#1d1d1f"><div class="n num">${soldM.length}</div><div class="l">本月售出</div></div>
      ${P('view_cost') ? `<div class="stat" style="--c:#FF9F0A"><div class="n num">${nt(soldM.reduce((t, r) => t + ((r.salePrice || 0) - (r.cost || 0)), 0))}</div><div class="l">本月毛利</div></div>` : ''}
    </div>
    <div class="toolbar">
      <input class="input" id="stQ" placeholder="搜尋 型號／IMEI／單號" value="${esc(stQuery)}">
      <div class="tabs">${[['active', '在庫'], ['整理中', '整理中'], ['已售出', '已售出'], ['all', '全部']].map(([k, l]) => `<button data-st="${k}" class="${stStatus === k ? 'on' : ''}">${l}</button>`).join('')}
        ${[['', '全部來源'], ['門市', '門市'], ['宅配', '宅配']].map(([k, l]) => `<button data-src="${k}" class="${stSource === k ? 'on' : ''}">${l}</button>`).join('')}
        ${P('edit_stock') ? '<button id="csv">⬇ 匯出盤點 CSV</button>' : ''}</div>
    </div><div id="stTbl"></div>`;
  $('#stQ').oninput = e => { stQuery = e.target.value; drawStock(); };
  $$('[data-st]').forEach(b => b.onclick = () => { stStatus = b.dataset.st; stockPage(); });
  $$('[data-src]').forEach(b => b.onclick = () => { stSource = b.dataset.src; stockPage(); });
  if ($('#csv')) $('#csv').onclick = exportCsv;
  drawStock();
}
function stockVisible() {
  const q = stQuery.trim().toLowerCase();
  return stockCache.filter(r => (stStatus === 'all' || (stStatus === 'active' ? r.status !== '已售出' : r.status === stStatus))
    && (!stSource || r.source === stSource)
    && (!q || [r.sku, r.ref, r.model, r.serial, r.capacity, r.color, r.category].join(' ').toLowerCase().includes(q)));
}
function drawStock() {
  const list = stockVisible();
  $('#stTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>商品</th><th class="hide-m">IMEI／序號</th><th>來源</th><th class="hide-m">成本</th><th>狀態</th></tr></thead><tbody>
    ${list.map(r => `<tr data-sku="${esc(r.sku)}"><td><b>${esc(r.model)}</b> <span class="sub">${esc([r.capacity, r.color].filter(Boolean).join(' '))}</span><div class="sub">${esc(r.sku)}・入庫 ${esc(r.inAt.slice(0, 10))}</div></td>
      <td class="num sub hide-m">${esc(r.serial || '—')}</td>
      <td><span class="pill ${r.source === '宅配' ? '' : 'off'}">${esc(r.source)}</span></td>
      <td class="num hide-m">${nt(r.cost)}</td>
      <td>${stockBadge(r)}${r.status === '已售出' ? `<div class="sub">${esc(r.saleDate)} ${esc(r.channel)}${r.salePrice != null && r.salePrice !== '' ? ' NT$' + money(r.salePrice) : ''}</div>` : ''}</td></tr>`).join('')}
    </tbody></table>` : '<div class="card empty">沒有符合的庫存</div>';
  $$('[data-sku]').forEach(tr => tr.onclick = () => stockDrawer(stockCache.find(r => r.sku === tr.dataset.sku)));
}
const stockBadge = r => `<span class="pill ${r.status === '在庫' ? '' : r.status === '整理中' ? 'warn' : 'off'}">${esc(r.status)}</span>`;
function stockDrawer(r) {
  const can = P('edit_stock');
  const d = $('#drawer');
  d.innerHTML = `<div class="d-head"><b>${esc(r.model)}</b>${stockBadge(r)}<button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      <div class="card"><dl class="kv"><dt>庫存編號</dt><dd class="num">${esc(r.sku)}</dd><dt>來源</dt><dd>${esc(r.source)}・<a href="${r.source === '宅配' ? '#' : '#intake'}" data-ref="${esc(r.ref)}">${esc(r.ref)}</a></dd>
        <dt>規格</dt><dd>${esc([r.category, r.capacity, r.color].filter(Boolean).join('・'))}</dd><dt>IMEI／序號</dt><dd class="num">${esc(r.serial || '—')}</dd>
        <dt>狀況</dt><dd>${esc(r.notes || '—')}</dd><dt>收購成本</dt><dd class="num">${nt(r.cost)}</dd><dt>入庫</dt><dd>${esc(r.inAt)}</dd>
        <dt>最後更新</dt><dd>${esc(r.updatedAt)}・${esc(r.updatedBy)}</dd></dl>
        ${r.photos.length ? `<div class="ph-grid" style="margin-top:10px">${r.photos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="商品照片"></div>`).join('')}</div>` : ''}</div>
      ${can ? `<div class="card"><h3>庫存狀態</h3>
        <div class="chips">${['在庫', '整理中', '已售出'].map(s => `<label class="chip"><input type="radio" name="sst" value="${s}" ${r.status === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div>
        <div id="saleBox" ${r.status === '已售出' ? '' : 'hidden'} style="margin-top:12px"><div class="grid2">
          <label class="field"><span>銷售日期</span><input class="input" type="date" id="sDate" value="${esc(r.saleDate || new Date().toISOString().slice(0, 10))}"></label>
          <label class="field"><span>銷售管道</span><input class="input" id="sCh" list="chList" value="${esc(r.channel)}"><datalist id="chList">${SALE_CHANNELS.map(c => `<option value="${c}">`).join('')}</datalist></label>
          <label class="field"><span>銷售價格（NT$）</span><input class="input num" id="sPrice" inputmode="numeric" value="${esc(r.salePrice ?? '')}"></label></div></div></div>` : ''}
    </div>
    ${can ? '<div class="d-foot"><span class="err" id="sErr" style="flex:1;margin:0"></span><button class="btn btn-dark" id="sSave">儲存</button></div>' : ''}`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  loadPhotos(d);
  const ref = $('[data-ref]', d);
  ref.onclick = async e => {
    e.preventDefault();
    if (r.source === '宅配') { closeDrawer(); window.openAfterLoad = r.ref; filter = 'all'; location.hash = ''; return; }
    if (!intakes.length) { try { await loadIntakes(); } catch (x) { return toast(x.message); } }
    const o = intakes.find(x => x.id === r.ref); if (o) intakeDrawer(o);
  };
  if (!can) return;
  $$('input[name=sst]', d).forEach(x => x.onchange = () => { $('#saleBox').hidden = x.value !== '已售出'; });
  $('#sSave').onclick = async () => {
    const status = $('input[name=sst]:checked', d).value;
    const sale = { date: $('#sDate').value, channel: $('#sCh').value.trim(), price: $('#sPrice').value.replace(/[^\d]/g, '') };
    if (status === '已售出' && (!sale.date || !sale.channel || !sale.price)) return $('#sErr').textContent = '請填寫銷售日期、管道與價格';
    $('#sSave').disabled = true;
    try {
      const res = await api('stockUpdate', { sku: r.sku, status, sale, expected: r.status });
      stockCache[stockCache.findIndex(x => x.sku === r.sku)] = res.item;
      toast('已儲存'); closeDrawer(); stockPage();
    } catch (e) { if (e.auth) return start(); $('#sErr').textContent = e.message; $('#sSave').disabled = false; }
  };
}
function exportCsv() {
  const cell = v => { const s = String(v ?? ''); return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'; };
  const cost = P('view_cost');
  const head = ['庫存編號', '來源', '來源單號', '入庫時間', '類別', '品名型號', '容量', '顏色', 'IMEI序號', '狀況', ...(cost ? ['收購成本'] : []), '庫存狀態', '銷售日期', '銷售管道', '銷售價格'];
  const rows = stockVisible().map(r => [r.sku, r.source, r.ref, r.inAt, r.category, r.model, r.capacity, r.color, r.serial, r.notes, ...(cost ? [r.cost] : []), r.status, r.saleDate, r.channel, r.salePrice ?? '']);
  const blob = new Blob(['﻿' + [head, ...rows].map(x => x.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `庫存盤點-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ============================== 匯款工作區 ============================== */
let rmFilter = '待匯款';
async function remitPage(refresh) {
  app.innerHTML = pagesNav('remit') + '<div class="spinner"></div>';
  try {
    if (refresh || !intakes.length) await loadIntakes();
    if (!orders.length) orders = (await api('adminList')).orders;
  } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('remit') + `<div class="card empty">${esc(e.message)}</div>`; return; }
  if (refresh) toast('已更新');
  const pend = intakes.filter(o => o.remit === '待匯款');
  const delivery = orders.filter(o => o.status === '客戶同意');
  app.innerHTML = `${pagesNav('remit')}
    <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat hot" style="--c:#FF9F0A"><div class="n num">${pend.length}</div><div class="l">門市待匯款</div></div>
      <div class="stat" style="--c:#FF9F0A"><div class="n num">${nt(pend.reduce((t, o) => t + (o.total || 0), 0))}</div><div class="l">門市待匯款金額</div></div>
      <a class="stat ${delivery.length ? 'hot' : ''}" style="--c:#30D158;text-decoration:none;color:inherit" href="#" id="goDel"><div class="n num">${delivery.length}</div><div class="l">宅配待匯款 →</div></a>
    </div>
    <div class="toolbar"><div class="tabs">${['待匯款', '已匯款'].map(k => `<button data-rf="${k}" class="${rmFilter === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>
    <div id="rmTbl"></div>`;
  $$('[data-rf]').forEach(b => b.onclick = () => { rmFilter = b.dataset.rf; remitPage(); });
  $('#goDel').onclick = e => { e.preventDefault(); filter = 'g-pay'; location.hash = ''; };
  drawRemitTable();
}
function drawRemitTable() {
  const list = intakes.filter(o => o.payment === '轉帳' && o.remit === rmFilter);
  $('#rmTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>單號</th><th>出售人</th><th>收款帳戶</th><th>金額</th><th class="hide-m">期限</th></tr></thead><tbody>
    ${list.map(o => `<tr data-rm="${esc(o.id)}"><td><b class="num">${esc(o.id)}</b><div class="sub">${esc(o.createdAt)}</div></td><td>${esc(o.seller)}</td>
      <td class="num">${esc(o.bank)}<div class="sub">${esc(o.account)}</div></td><td class="num"><b>${nt(o.total)}</b></td>
      <td class="sub hide-m">${o.remit === '已匯款' ? esc(o.remitAt) : esc(o.period === '指定日期' ? o.payDate : o.period)}</td></tr>`).join('')}
    </tbody></table>` : `<div class="card empty">沒有${rmFilter}的門市收購單</div>`;
  $$('[data-rm]').forEach(tr => tr.onclick = () => intakeDrawer(intakes.find(o => o.id === tr.dataset.rm)));
}
