/* =====================================================================
 * 門市收購單、庫存、匯款（後台）
 * 依賴 admin.html 的 app、me、P()、pagesNav()、closeDrawer()、start()，與 shared.js 的工具函式
 * ===================================================================== */
const COMPANY = CFG.COMPANY || '丰格科技有限公司';
const IN_CATS = {
  '手機': [...IPHONE_MODELS].reverse().concat(['iPhone SE（第 3 代）', 'iPhone SE（第 2 代）']),
  '平板': IPAD_MODELS.filter(m => m !== '其他 iPad'),
  '筆電': ['MacBook Air 13吋', 'MacBook Air 15吋', 'MacBook Pro 13吋', 'MacBook Pro 14吋', 'MacBook Pro 15吋', 'MacBook Pro 16吋', 'iMac 24吋', 'iMac 27吋', 'Mac mini', 'Mac Studio', 'Studio Display'],
  '其他 3C': ['Apple Watch S6', 'Apple Watch S7／SE2', 'Apple Watch S8', 'Apple Watch S9／SE3', 'Apple Watch S10', 'Apple Watch S11', 'Apple Watch S12', 'Apple Watch Ultra', 'Apple Watch Ultra 2', 'Apple Watch Ultra 3',
    'AirPods 3', 'AirPods 4', 'AirPods 5', 'AirPods Pro', 'AirPods Pro 2', 'AirPods Pro 3', 'AirPods Max', 'Apple Pencil', '巧控鍵盤', 'HomePod mini', 'HomePod'],
  '其他商品': [],
};
const IN_CAPS = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const IN_COLORS = ['黑色', '白色', '銀色', '灰色', '金色', '藍色', '綠色', '粉紅色', '紫色', '紅色', '原色鈦金屬', '沙漠色鈦金屬'];
const IN_NOTES = ['螢幕刮傷', '螢幕破裂', '邊框刮傷', '邊框凹傷', '背蓋破裂', '電池需更換', '無法充電', '無法開機', '相機異常', 'Face ID 異常', '附原盒', '附充電線'];
const IN_BANKS = ['004 臺灣銀行', '005 臺灣土地銀行', '006 合作金庫', '007 第一銀行', '008 華南銀行', '009 彰化銀行', '012 台北富邦', '013 國泰世華',
  '017 兆豐銀行', '700 中華郵政', '803 聯邦銀行', '805 遠東銀行', '806 元大銀行', '807 永豐銀行', '808 玉山銀行', '809 凱基銀行', '812 台新銀行',
  '822 中國信託', '823 將來銀行', '824 LINE Bank'];
const IN_PERIODS = ['收購當日', '收購後 1 個工作天內', '收購後 3 個工作天內', '收購後 7 個工作天內', '指定日期'];
const SALE_CHANNELS = ['門市銷售', '蝦皮銷售'];
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

const isStoreRoute = page => ['intake', 'intake/new', 'repair', 'repair/new', 'stock', 'remit', 'prices', 'report', 'audit'].includes(page);
function storeRoute(page) {
  $('#refresh').hidden = page === 'intake/new';
  if (page === 'intake/new' && P('create_intake')) return intakeForm();
  if (page === 'repair/new' && P('repair')) return repairForm();
  if (page === 'repair' && (P('repair') || P('view_cost'))) { $('#refresh').onclick = () => repairPage(true); return repairPage(); }
  if (page === 'intake' && canStoreView()) { $('#refresh').onclick = () => intakePage(true); return intakePage(); }
  if (page === 'stock' && canStoreView()) { $('#refresh').onclick = () => stockPage(true); return stockPage(); }
  if (page === 'prices' && (P('edit_prices') || P('edit_stock'))) { $('#refresh').onclick = () => pricesPage(true); return pricesPage(); }
  if (page === 'remit' && P('edit_payment')) { $('#refresh').onclick = () => remitPage(true); return remitPage(); }
  if (page === 'report' && showCost()) { $('#refresh').onclick = () => reportPage(true); return reportPage(); }
  if (page === 'audit' && canAudit() && !SHOP) { $('#refresh').onclick = () => auditPage(true); return auditPage(); }
  location.hash = '';
}
/** 成本、毛利：只在完整後台顯示（門市工作台不顯示） */
const showCost = () => P('view_cost') && !SHOP;
const canStoreView = () => ['create_intake', 'edit_stock', 'edit_payment', 'view_cost'].some(P);
const canAudit = () => ['manage_users', 'edit_intake', 'delete_intake', 'edit_repair', 'delete_repair', 'edit_order', 'delete_order', 'hr_manage', 'payroll'].some(P);
const localDay = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }; // 台灣本地日期（不用 UTC）
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
  const today = localDay();
  const todays = intakes.filter(o => o.createdAt.slice(0, 10) === today);
  app.innerHTML = `${pagesNav('intake')}
    ${SHOP && P('create_intake') ? '<a class="shop-cta" href="#intake/new"><div><b>＋ 新增收購單</b><small>客人在現場：填商品 → 核對證件 → 雙方簽名 → 列印收購聯</small></div><span class="go">→</span></a>' : ''}
    <div class="toolbar" style="align-items:center">
      <input class="input" id="inQ" placeholder="搜尋 手機號碼／單號／出售人／型號／IMEI" value="${esc(inQuery)}">
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
  const q = inQuery.trim().toLowerCase(), qp = q.replace(/\D/g, '');
  const isPhone = /^0\d{3,9}$/.test(q.replace(/[\s-]/g, '')); // 輸入的是手機號碼（可以只打前幾碼）
  const list = intakes.filter(o => !q || [o.id, o.seller, o.staff, ...o.items.map(it => it.model + ' ' + it.serial)].join(' ').toLowerCase().includes(q)
    || (qp.length >= 3 && String(o.phone || '').replace(/\D/g, '').includes(qp)));
  $('#inTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>單號</th><th>出售人</th><th>商品</th><th class="hide-m">金額</th><th>付款</th><th class="hide-m">經手</th></tr></thead><tbody>
    ${list.map(o => `<tr data-in="${esc(o.id)}"><td><b class="num">${esc(o.id)}</b><div class="sub">${esc(o.createdAt)}</div></td>
      <td>${esc(o.seller)}<div class="sub num">${esc(o.phone)}</div></td>
      <td>${esc(o.items[0]?.model || '')}${o.items.length > 1 ? ` <span class="sub">+${o.items.length - 1}</span>` : ''}</td>
      <td class="num hide-m">${nt(o.total)}</td>
      <td>${o.payment === '轉帳' ? `<span class="pill ${o.remit === '已匯款' ? '' : 'warn'}">${esc(o.remit)}</span>` : '<span class="pill off">現金</span>'}</td>
      <td class="sub hide-m">${esc(o.staff)}</td></tr>`).join('')}
    </tbody></table>` : `<div class="card empty">${intakes.length ? '沒有符合的收購單' : '還沒有門市收購單'}${isPhone && P('create_intake') ? `<br><br><button class="btn btn-dark" id="inNewPhone">＋ 用 ${esc(q)} 新增收購單</button>` : ''}</div>`;
  if (list.length && isPhone && P('create_intake')) $('#inTbl').insertAdjacentHTML('beforeend', `<p style="margin:8px 4px;text-align:center"><button class="link" id="inNewPhone">＋ 用 ${esc(q)} 再新增一張收購單</button></p>`);
  if ($('#inNewPhone')) $('#inNewPhone').onclick = () => { inPrefill = { phone: q.replace(/[\s-]/g, ''), seller: (list[0] || {}).seller || '' }; location.hash = '#intake/new'; };
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
        <button class="btn btn-ghost btn-sm" data-rc="customer">列印客戶聯</button>
        ${editBarHTML(P('edit_intake'), P('delete_intake'))}</div>
        ${o.masked.cost ? '<p class="small muted" style="margin:8px 0 0">您沒有查看金額的權限，收購聯上的金額會隱藏</p>' : ''}</div>
      <div class="card"><h3>交易</h3><dl class="kv">
        <dt>建立時間</dt><dd>${esc(o.createdAt)}</dd><dt>經手人</dt><dd>${esc(o.staff)}</dd>
        <dt>出售人</dt><dd>${esc(o.seller)}</dd><dt>電話</dt><dd class="num">${esc(o.phone || '未填')}${o.masked.phone ? ' <span class="no-perm">🔒</span>' : ''}</dd>
        <dt>電子信箱</dt><dd>${esc(o.email || '未填')}${o.masked.email ? ' <span class="no-perm">🔒</span>' : ''}</dd>
        <dt>付款</dt><dd>${esc(o.payment)}</dd>
        ${o.payment === '轉帳' ? `<dt>收款帳戶</dt><dd class="num">${esc(o.bank)}<br>${esc(o.account)}${o.masked.account ? ' <span class="no-perm">🔒</span>' : ''}</dd><dt>匯款期限</dt><dd>${esc(o.period)}${o.payDate ? ' ' + esc(o.payDate) : ''}</dd>` : ''}
        ${o.remitAt ? `<dt>已匯款</dt><dd>${esc(o.remitAt)}・${esc(o.remitBy)}</dd>` : ''}
        <dt>合計</dt><dd class="num"><b>${nt(o.total)}</b></dd></dl></div>
      <div class="card"><h3>商品（${o.items.length}）</h3>
        ${o.items.map((it, i) => `<div style="padding:10px 0;border-top:${i ? '1px solid var(--line)' : '0'}">
          <b>${i + 1}. ${esc(itemName(it))}</b> <span class="num" style="float:right">${nt(it.price)}</span>
          <div class="small muted">${esc(it.category)}${it.serial ? '・' + esc(it.serial) : ''}${it.notes ? '・' + esc(it.notes) : ''}</div>
          <div class="ph-grid" style="margin-top:8px">${it.photos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="商品照片"></div>`).join('')}</div></div>`).join('')}</div>
      ${intakeEvalHTML(o) ? `<div class="card">${intakeEvalHTML(o)}</div>` : ''}
      <div class="card"><h3>證件與簽名</h3>
        <p class="small" style="margin:0 0 8px">${o.verified ? '✓ 門市已核對證件' : ''}${o.noticeAt ? `・出售人已確認個資告知（${esc(fmtTime(o.noticeAt))}）` : ''}</p>
        ${o.masked.id ? `<p>${NOPE}　<span class="small muted">已附 ${o.masked.id} 張證件照</span></p>` : o.idPhotos.length ? `<div class="ph-grid">${o.idPhotos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="證件"></div>`).join('')}</div>` : '<p class="small muted">未附證件照片</p>'}
        <div class="grid2" style="margin-top:10px"><div><div class="small muted">出售人簽名</div><img class="sig-img" data-photo="${esc(o.sellerSign)}" alt="出售人簽名"></div>
          <div><div class="small muted">經手人</div>${o.staffSign ? `<img class="sig-img" data-photo="${esc(o.staffSign)}" alt="經手人簽名">` : `<p style="margin:6px 0 0">${esc(o.staff)}</p>`}</div></div></div>
      ${P('create_intake') ? mailBox(o) : ''}
      ${P('edit_payment') && o.payment === '轉帳' ? remitBox(o) : ''}
      ${editLogHTML(o)}
    </div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  $$('[data-rc]', d).forEach(b => b.onclick = () => showReceipt(o, b.dataset.rc));
  loadPhotos(d);
  bindRemit(d, o, () => intakeDrawer(intakes.find(x => x.id === o.id)));
  if ($('[data-edit]', d)) $('[data-edit]', d).onclick = () => intakeEdit(o);
  if ($('[data-del]', d)) $('[data-del]', d).onclick = async () => {
    const reason = await askReason(`刪除收購單 ${o.id}（${o.seller}）？\n\n庫存中的商品會一併移除，並留下刪除紀錄。`, '確定刪除');
    if (!reason) return;
    try {
      await api('intakeDelete', { id: o.id, reason });
      intakes = intakes.filter(x => x.id !== o.id); stockCache = null; rpData = null; // 統計、報表、庫存都重新計算
      closeDrawer(); toast('已刪除收購單 ' + o.id);
      if (location.hash === '#intake') intakePage(); else if (location.hash === '#remit' && $('#rmTbl')) drawRemitTable();
    } catch (e) { if (e.auth) return start(); toast(e.message); }
  };
  const ms = $('#mailSend', d);
  if (ms) ms.onclick = async () => {
    const email = $('#mailTo', d).value.trim();
    if (email && !IN_EMAIL_RE.test(email)) return toast('電子信箱格式不正確');
    if (!email && !o.email) return toast('請填寫客人的電子信箱');
    ms.disabled = true; ms.textContent = '寄送中…';
    try {
      const r = await api('intakeMail', { id: o.id, email });
      const i = intakes.findIndex(x => x.id === o.id); if (i >= 0) intakes[i] = r.intake;
      toast('已寄出收購單'); intakeDrawer(r.intake);
    } catch (e) { if (e.auth) return start(); toast(e.message); ms.disabled = false; ms.textContent = '寄送'; }
  };
}
/* ---------- 修改／刪除與修改紀錄（收購單、維修單共用） ---------- */
function editBarHTML(canEdit, canDel) {
  if (!canEdit && !canDel) return '';
  return `<div class="edit-bar">${canEdit ? '<button class="btn btn-ghost btn-sm" data-edit>✏️ 修改</button>' : ''}${canDel ? '<button class="btn btn-danger btn-sm" data-del>🗑 刪除</button>' : ''}</div>`;
}
function editLogHTML(o) {
  const l = o.edits || [];
  if (!l.length) return '';
  return `<div class="card"><h3>操作紀錄（${l.length}）</h3><ul class="edit-log">${l.map(x => `<li>
    <div class="small"><b>${esc(x.action)}</b>・${esc(x.at)}・${esc(x.by)}</div>${x.lines.map(t => `<div>${esc(t)}</div>`).join('')}
    ${x.reason ? `<div class="small muted">原因：${esc(x.reason)}</div>` : ''}</li>`).join('')}</ul></div>`;
}
/** 刪除前填原因（必填），取消回傳 null */
function askReason(message, okText) {
  return new Promise(res => {
    const w = document.createElement('div');
    w.className = 'ask-wrap';
    w.innerHTML = `<div class="ask-box" role="dialog" aria-modal="true"><p>${esc(message).replace(/\n/g, '<br>')}</p>
      <textarea class="input" rows="3" placeholder="刪除原因（必填），例：重複建單、客人取消交易"></textarea><p class="err" style="margin:6px 0 10px;text-align:left"></p>
      <div class="ask-btns"><button type="button" class="btn btn-ghost" data-v="0">返回</button><button type="button" class="btn btn-dark" data-v="1" style="background:var(--red, #e5484d)">${esc(okText)}</button></div></div>`;
    const ta = w.querySelector('textarea');
    w.onclick = e => {
      const v = e.target.dataset && e.target.dataset.v;
      if (e.target === w || v === '0') { w.remove(); res(null); }
      else if (v === '1') { if (!ta.value.trim()) { w.querySelector('.err').textContent = '請填寫刪除原因'; ta.focus(); return; } w.remove(); res(ta.value.trim()); }
    };
    document.body.appendChild(w); ta.focus();
  });
}
/** 收購單修改（在抽屜裡編輯） */
function intakeEdit(o) {
  const d = $('#drawer'), cost = P('view_cost') && !o.masked.cost;
  const inp = (label, attr, val, extra = '') => `<label class="field"><span>${label}</span><input class="input" ${attr} value="${esc(val == null ? '' : val)}" ${extra}></label>`;
  $('.d-body', d).innerHTML = `
    <div class="card"><h3>✏️ 修改收購單</h3><p class="small muted" style="margin:-4px 0 12px">照片、證件與簽名不能修改。儲存後會留下操作紀錄（經手人、時間、改了什麼）。</p>
      ${inp('出售人姓名 *', 'data-ef="seller"', o.seller)}
      <div class="grid2">${o.masked.phone ? '' : inp('聯絡電話', 'data-ef="phone" inputmode="tel"', o.phone)}${o.masked.email ? '' : inp('電子信箱', 'data-ef="email" type="email" autocapitalize="off"', o.email)}</div>
      <div class="field"><span>付款方式</span>${o.remit === '已匯款' ? `<p style="margin:4px 0 0">${esc(o.payment)}<span class="small muted">（已匯款，不能修改）</span></p>` : chips('efpay', ['現金', '轉帳'], o.payment)}</div>
      <div id="efBank" ${o.payment === '轉帳' ? '' : 'hidden'}>
        <div class="grid2">${inp('收款銀行', 'data-ef="bank"', o.bank)}${o.masked.account ? '' : inp('收款帳號', 'data-ef="account" inputmode="numeric"', o.account)}</div>
        <div class="grid2"><label class="field"><span>匯款期限</span><select class="input" data-ef="period">${opts(IN_PERIODS, o.period)}</select></label>${inp('指定日期', 'data-ef="payDate" type="date"', o.payDate)}</div></div></div>
    ${o.items.map((it, i) => `<div class="card"><h3>商品 ${i + 1}</h3>
      ${inp('品名／型號 *', `data-ei="${i}" data-k="model"`, it.model)}
      <div class="grid2">${inp('容量／規格', `data-ei="${i}" data-k="capacity"`, it.capacity)}${inp('顏色', `data-ei="${i}" data-k="color"`, it.color)}</div>
      ${inp('IMEI／序號', `data-ei="${i}" data-k="serial"`, it.serial)}
      ${inp('狀況說明', `data-ei="${i}" data-k="notes"`, it.notes)}
      ${cost ? inp('收購金額（NT$）', `data-ei="${i}" data-k="price" inputmode="numeric"`, it.price) : ''}</div>`).join('')}
    <div class="card"><label class="field"><span>修改原因（選填）</span><textarea class="input" id="efReason" rows="2" placeholder="例：IMEI 打錯、客人更正電話"></textarea></label>
      <div style="display:flex;gap:8px"><button class="btn btn-ghost" id="efCancel" style="flex:1">取消</button><button class="btn btn-dark" id="efSave" style="flex:2">儲存修改</button></div>
      <p class="err" id="efErr"></p></div>`;
  $('.d-body', d).scrollTop = 0;
  $$('input[name=efpay]', d).forEach(r => r.onchange = () => { $('#efBank', d).hidden = r.value !== '轉帳'; });
  $('#efCancel', d).onclick = () => intakeDrawer(o);
  $('#efSave', d).onclick = async e => {
    const btn = e.currentTarget, fields = {}, items = o.items.map(() => ({}));
    $$('[data-ef]', d).forEach(el => { fields[el.dataset.ef] = el.value.trim(); });
    const pay = $('input[name=efpay]:checked', d); if (pay) fields.payment = pay.value;
    $$('[data-ei]', d).forEach(el => { items[+el.dataset.ei][el.dataset.k] = el.value.trim(); });
    btn.disabled = true; btn.textContent = '儲存中…';
    try {
      const r = await api('intakeEdit', { id: o.id, fields, items, reason: $('#efReason', d).value.trim() });
      const i = intakes.findIndex(x => x.id === o.id); if (i >= 0) intakes[i] = r.intake;
      stockCache = null; rpData = null; toast('已儲存修改');
      if (location.hash === '#intake') intakePage(); // 金額改了：上方今日統計一起更新
      intakeDrawer(r.intake);
    } catch (x) { if (x.auth) return start(); $('#efErr', d).textContent = x.message; btn.disabled = false; btn.textContent = '儲存修改'; }
  };
}

/* ---------- 操作紀錄總表（完整後台・系統設定） ---------- */
let auditLogs = null, auQuery = '', auKind = '';
async function auditPage(refresh) {
  if (refresh || !auditLogs) {
    app.innerHTML = pagesNav('audit') + '<div class="spinner"></div>';
    try { auditLogs = (await api('auditList')).logs; } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('audit') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  app.innerHTML = `${pagesNav('audit')}
    <div class="toolbar" style="align-items:center"><input class="input" id="auQ" placeholder="搜尋 單號／經手人／內容" value="${esc(auQuery)}">
      <select class="input" id="auK" style="max-width:140px">${opts(['收購單', '維修單', '庫存', '宅配訂單', '員工帳號', '估價表'], auKind, '全部類別')}</select></div>
    <p class="small muted" style="margin:0 0 10px">後台每一次操作（建立、修改、刪除、匯款、進度、取件、列印、登入…）都會記錄時間與經手人，也存在試算表「操作紀錄」分頁。紀錄無法從後台修改或刪除。</p>
    <div id="auTbl"></div>`;
  $('#auQ').oninput = e => { auQuery = e.target.value; drawAudit(); };
  $('#auK').onchange = e => { auKind = e.target.value; drawAudit(); };
  drawAudit();
}
function drawAudit() {
  const q = auQuery.trim().toLowerCase();
  const list = auditLogs.filter(x => (!auKind || x.kind === auKind) && (!q || [x.ref, x.by, x.action, x.reason, ...x.lines].join(' ').toLowerCase().includes(q)));
  $('#auTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>時間</th><th>單號</th><th>動作</th><th>內容</th><th class="hide-m">經手人</th></tr></thead><tbody>
    ${list.map(x => `<tr class="${x.action === '刪除' ? 'au-del' : ''}"><td class="sub num" style="white-space:nowrap">${esc(x.at)}</td>
      <td><b class="num">${esc(x.ref)}</b><div class="sub">${esc(x.kind)}</div></td>
      <td><span class="pill ${x.action === '刪除' || x.action === '登入失敗' ? 'warn' : x.action === '修改' ? '' : 'off'}">${esc(x.action)}</span></td>
      <td class="small">${x.lines.map(t => `<div>${esc(t)}</div>`).join('')}${x.reason ? `<div class="sub">原因：${esc(x.reason)}</div>` : ''}<div class="sub show-m">${esc(x.by)}</div></td>
      <td class="sub hide-m">${esc(x.by)}</td></tr>`).join('')}</tbody></table>`
    : `<div class="card empty">${auditLogs.length ? '沒有符合的紀錄' : '還沒有任何操作紀錄'}</div>`;
}

/** 寄送紀錄（第一行是最新的） */
const mailLines = o => String(o.mailLog || '').split('\n').filter(Boolean);
function mailNote(o) {
  const l = mailLines(o)[0];
  if (!l) return '';
  const ok = l.includes('已寄送');
  return `<p class="small" style="margin:4px 0 0;color:${ok ? 'var(--ok, #1a7f37)' : 'var(--danger, #c9372c)'}">${ok ? '✉️ 收購單已寄到 ' + esc(o.email) : '⚠️ 收購單寄送失敗，可到收購單明細重新寄送'}</p>`;
}
function mailBox(o) {
  const log = mailLines(o);
  return `<div class="card"><h3>寄送收購單給客人</h3>
    <div style="display:flex;gap:8px"><input class="input" id="mailTo" type="email" inputmode="email" autocapitalize="off" spellcheck="false" style="flex:1"
      value="${o.masked.email ? '' : esc(o.email)}" placeholder="${o.masked.email ? '留空＝寄到原本的信箱' : '客人的電子信箱'}">
      <button class="btn btn-dark btn-sm" id="mailSend">${log.length ? '重新寄送' : '寄送'}</button></div>
    <p class="small muted" style="margin:8px 0 0">寄出客戶聯（PDF 附件）。電話、帳號只顯示末碼，不含證件照片。</p>
    ${log.length ? `<ul class="small muted" style="margin:8px 0 0;padding-left:18px">${log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`;
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
const IN_NEW = '全新未拆封', IN_USED = '二手';
const isNewItem = it => it.cond === IN_NEW;
/** 商品名稱（全新機加註） */
const itemName = it => [it.model, it.capacity, it.color].filter(Boolean).join(' ') + (isNewItem(it) ? '（全新未拆封）' : '');
const newItem = () => ({ category: '手機', cond: IN_USED, model: '', capacity: '', color: '', serial: '', base: '', price: '', notes: '', photos: [],
  grade: '', battery: '', checks: CHECK_ITEMS.map(c => ({ k: c.k, label: c.label, r: 'ok', note: '' })), deductions: [] });
/** 收購金額 = 基本收購價 − 扣減 */
const itemPrice = it => Math.max(0, numv(it.base) - (it.deductions || []).reduce((s, d) => s + numv(d.amount), 0));

/** 表單裡的「檢測評估」區塊（同宅配檢測報告） */
function evalBlock(it, i) {
  const bad = it.checks.filter(c => c.r === 'bad').length, na = it.checks.filter(c => c.r === 'na').length;
  const fresh = isNewItem(it);
  return `<div class="eval-box">
    <div class="eval-h">${fresh ? '全新機（未拆封）・估價' : '檢測評估'}</div>
    ${fresh ? '<p class="small muted" style="margin:0 0 8px">全新未拆封不需外觀、電池與功能檢測；請確認外盒、封膜完整，未開通。拆封或外封膜破損請改選「二手機」或加扣款。</p>' : `<div class="grid2">
      <div class="field"><span>外觀等級</span><div class="chips">${['A', 'B', 'C', 'D'].map(g => `<label class="chip"><input type="radio" name="g${i}" data-grade value="${g}" ${it.grade === g ? 'checked' : ''}><span>${g} ${GRADE_TEXT[g]}</span></label>`).join('')}</div></div>
      <label class="field"><span>電池健康度（%）</span><input class="input num" data-f="battery" inputmode="numeric" maxlength="3" value="${esc(it.battery)}" placeholder="例：86"></label>
    </div>
    <details class="ck-wrap" data-ckwrap ${it._open !== false ? 'open' : ''}><summary><b>功能檢測 ${it.checks.length} 項</b><span data-cksum class="tag ${bad ? 'bad' : 'ok'}">${bad ? bad + ' 項異常' : '全部正常'}${na ? `・${na} 項未檢測` : ''}</span></summary>
      <div style="text-align:right"><button type="button" class="link" data-allok style="font-size:13px">全部設為正常</button></div>
      ${it.checks.map((c, j) => `<div class="ck-row ${c.r}">
        <div class="ck-lbl">${esc(c.label)}</div>
        <div class="seg">${['ok', 'bad', 'na'].map(r => `<button type="button" class="${c.r === r ? 'on' : ''}" data-ck="${j}" data-r="${r}">${RES[r][0]}</button>`).join('')}</div>
        <input class="input ck-note" data-cknote="${j}" value="${esc(c.note)}" placeholder="${c.k === 'water' ? '例：泡水指示貼片正常（白色）' : '說明（選填）'}">
      </div>`).join('')}
    </details>`}
    <div class="field" style="margin-top:12px"><span>估價</span>
      <div class="price-row"><span>基本收購價 *</span><input class="input num" data-f="base" inputmode="numeric" value="${esc(it.base)}" placeholder="例：13800"></div>
      ${it.deductions.map((d, j) => { const manual = d._other || (d.reason && !DEDUCT_SUGGEST.includes(d.reason)); return `<div class="price-row minus"><div class="ded-reason">
          <select class="input" data-drs="${j}"><option value="" ${!d.reason && !manual ? 'selected' : ''}>選擇扣減原因</option>
            ${DEDUCT_SUGGEST.map(s => `<option ${!manual && d.reason === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            <option value="${IN_OTHER}" ${manual ? 'selected' : ''}>其他（手動輸入）</option></select>
          <input class="input" data-dr="${j}" value="${esc(manual ? d.reason : '')}" placeholder="輸入扣減原因" ${manual ? '' : 'hidden'}></div>
        <input class="input num" data-da="${j}" inputmode="numeric" value="${esc(d.amount)}" placeholder="金額"><button type="button" class="ph-del static" data-deld="${j}" aria-label="刪除">✕</button></div>`; }).join('')}
      <button type="button" class="link" data-addd>＋ 新增扣減項目</button>
      <div class="price-row sub"><span>收購金額</span><b class="num" data-sub>NT$ ${money(itemPrice(it))}</b></div>
    </div></div>`;
}

/** 收購單上的檢測評估報告（抽屜、列印、模擬共用）。compact：列印用 */
function intakeEvalHTML(o, compact) {
  const items = o.items.filter(it => (Array.isArray(it.checks) && it.checks.length) || isNewItem(it));
  if (!items.length) return '';
  return `<div class="in-eval${compact ? ' compact' : ''}"><h3 style="margin:${compact ? '14px 0 6px' : '0 0 8px'}">檢測評估報告</h3>
    ${items.map(it => {
      const bad = it.checks.filter(c => c.r === 'bad').length;
      const n = o.items.indexOf(it) + 1;
      return `<div class="rep-item">
        <div class="rep-title">${o.items.length > 1 ? n + '. ' : ''}${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</div>
        <div class="rep-sn">IMEI／序號：<b class="num">${esc(it.serial || '未填')}</b></div>
        ${isNewItem(it) ? '<div class="rep-tags"><span class="tag ok">全新未拆封</span><span class="tag">外盒、封膜完整，未開通</span></div>' : `<div class="rep-tags">
          ${it.grade ? `<span class="tag">外觀 ${esc(it.grade)}・${esc(GRADE_TEXT[it.grade] || '')}</span>` : ''}
          ${it.battery ? `<span class="tag">電池 ${esc(it.battery)}%</span>` : ''}
          <span class="tag ${bad ? 'bad' : 'ok'}">${bad ? bad + ' 項異常' : '功能檢測皆正常'}</span>
        </div>
        <div class="rep-checks">${it.checks.map(c => `<div class="chk ${c.r}"><span class="ico">${RES[c.r][2]}</span><span class="lbl">${esc(c.label)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span><span class="res">${RES[c.r][0]}</span></div>`).join('')}</div>`}
        ${it.price == null ? '' : `<table class="rep-price">
          <tr><td>基本收購價</td><td>NT$ ${money(it.base ?? it.price)}</td></tr>
          ${(it.deductions || []).map(d => `<tr class="minus"><td>${esc(d.reason)}</td><td>− NT$ ${money(d.amount)}</td></tr>`).join('')}
          <tr class="sub"><td>收購金額</td><td>NT$ ${money(it.price)}</td></tr></table>`}
      </div>`;
    }).join('')}</div>`;
}
const newDraft = () => ({ requestId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random(), seller: '', phone: '', email: '', payment: '', bank: '', account: '', period: IN_PERIODS[1], payDate: '',
  items: [newItem()], idPhotos: [], noticeAt: '', verified: false, agreed: false, sellerSign: '', staffSign: '' });

let inPrefill = null; // 從搜尋手機號碼帶過來
function intakeForm() {
  if (!dr || drDone) { dr = newDraft(); drStep = 1; drDone = null; }
  if (inPrefill) { if (!dr.phone) dr.phone = inPrefill.phone; if (!dr.seller && inPrefill.seller) dr.seller = inPrefill.seller; inPrefill = null; }
  drawForm();
}
window.addEventListener('beforeunload', e => { if (dr && !drDone && location.hash === '#intake/new' && (dr.seller || dr.items[0].model)) { e.preventDefault(); e.returnValue = ''; } });

function drawForm() {
  if (drDone) return drawDone();
  const keepY = window.scrollY;
  const steps = ['商品與交易', '證件核對', '確認與簽名'];
  app.innerHTML = `${pagesNav('intake/new')}
    <div class="in-wrap${drStep === 3 ? ' sign-step' : ''}">
      <div class="in-steps">${steps.map((s, i) => `<div class="${i + 1 === drStep ? 'on' : i + 1 < drStep ? 'done' : ''}"><i>${i + 1 < drStep ? '✓' : i + 1}</i>${s}</div>`).join('')}</div>
      <div id="inBody">${drStep === 1 ? stepItems() : drStep === 2 ? stepId() : stepSign()}</div>
      <div class="in-foot"><span class="err" id="inErr" style="flex:1;margin:0"></span>
        ${drStep > 1 ? '<button class="btn btn-ghost" id="inBack">上一步</button>' : '<a class="btn btn-ghost" href="#intake" id="inCancel">取消</a>'}
        <button class="btn btn-dark" id="inNext">${drStep < 3 ? '下一步' : '完成並建立收購單'}</button></div>
    </div>`;
  bindForm();
  // 同一張單、同一步驟重畫（新增扣款、換選項…）：保持原本位置；換步驟或新單才回到最上面
  const same = drawForm._dr === dr && drawForm._step === drStep;
  window.scrollTo(0, same ? keepY : 0);
  drawForm._dr = dr; drawForm._step = drStep;
}
const IN_OTHER = '__other';
/** 下拉選單；選「其他（手動輸入）」或原本的值不在清單裡時，下面出現輸入框。attr：'data-f="model"' 或 'data-k="bank"' */
function pickField(label, attr, val, options, manual, ph = '') {
  const isManual = manual || (val && !options.includes(val));
  return `<label class="field"><span>${label}</span>
    <select class="input" data-pick ${attr}>
      <option value="" ${!val && !isManual ? 'selected' : ''}>請選擇</option>
      ${options.map(o => `<option ${!isManual && val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      <option value="${IN_OTHER}" ${isManual ? 'selected' : ''}>其他（手動輸入）</option>
    </select>
    ${isManual ? `<input class="input" ${attr} value="${esc(val)}" placeholder="${esc(ph || '請輸入')}" style="margin-top:6px" data-manual>` : ''}</label>`;
}
const IN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fld = (label, key, val, extra = '') => `<label class="field"><span>${label}</span><input class="input" data-k="${key}" value="${esc(val)}" ${extra}></label>`;
function stepItems() {
  return `<div class="card"><h3>出售人與付款</h3>
      <div class="grid2">${fld('出售人姓名 *', 'seller', dr.seller, 'autocomplete="off"')}${fld('聯絡電話', 'phone', dr.phone, 'type="tel" inputmode="tel" placeholder="選填"')}</div>
      ${fld('電子信箱', 'email', dr.email, 'type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="選填，填寫後收購單完成會自動寄給客人"')}
      <div class="field"><span>付款方式 *</span><div class="chips">${['現金', '轉帳'].map(p => `<label class="chip"><input type="radio" name="pay" value="${p}" ${dr.payment === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div></div>
      ${dr.payment === '轉帳' ? `<div class="grid2">
        ${pickField('收款銀行 *', 'data-k="bank"', dr.bank, IN_BANKS, dr._mbank, '例：700 中華郵政')}
        ${fld('收款帳號 *', 'account', dr.account, 'inputmode="numeric" autocomplete="off"')}
        <label class="field"><span>匯款期限</span><select class="input" data-k="period">${IN_PERIODS.map(p => `<option ${dr.period === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        ${dr.period === '指定日期' ? fld('指定日期', 'payDate', dr.payDate, 'type="date"') : ''}</div>
        <p class="small muted" style="margin:0">戶名須與出售人相同</p>` : ''}
    </div>
    ${dr.items.map((it, i) => `<div class="card" data-i="${i}">
      <h3 style="display:flex;justify-content:space-between">商品 ${i + 1}${dr.items.length > 1 ? `<button class="link" data-del-item="${i}" style="font-size:13px">移除</button>` : ''}</h3>
      <div class="cond-seg">${[[IN_USED, '二手機', '需檢測外觀、電池、功能'], [IN_NEW, '全新機（未拆封）', '免檢測，只填收購價']].map(([v, l, s]) => `<label><input type="radio" name="cond${i}" data-cond value="${v}" ${(it.cond || IN_USED) === v ? 'checked' : ''}><span><b>${l}</b><small>${s}</small></span></label>`).join('')}</div>
      <button type="button" class="btn ${it.model ? 'btn-ghost' : 'btn-dark'} btn-block est-open" data-est>🧮 用估價表填寫（同線上估價）${it._est ? `<small>已帶入：${esc(it._est)}</small>` : ''}</button>
      <div class="chips" style="margin-bottom:10px">${Object.keys(IN_CATS).map(c => `<label class="chip"><input type="radio" name="cat${i}" data-cat value="${c}" ${it.category === c ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div>
      <div class="grid2">
        ${IN_CATS[it.category].length ? pickField('品名／型號 *', 'data-f="model"', it.model, IN_CATS[it.category], it._m && it._m.model, '輸入完整型號') : `<label class="field"><span>品名／型號 *</span><input class="input" data-f="model" value="${esc(it.model)}" placeholder="例：Switch 主機、相機"></label>`}
        ${pickField(it.category === '筆電' ? '年份／規格' : '容量／規格', 'data-f="capacity"', it.capacity, it.category === '筆電' ? [] : IN_CAPS, it._m && it._m.capacity, it.category === '筆電' ? '例：2023 M3 / 16GB / 512GB' : '')}
        ${pickField('顏色', 'data-f="color"', it.color, it.category === '手機' || it.category === '平板' || it.category === '筆電' ? colorsFor(it.model) : IN_COLORS, it._m && it._m.color)}
      </div>
      <label class="field"><span style="display:flex;justify-content:space-between;align-items:center">IMEI／序號
        <button type="button" class="link" style="font-size:14px" data-scan>📷 掃描自動辨識</button></span>
        <input class="input num" data-f="serial" value="${esc(it.serial)}" autocomplete="off" spellcheck="false"></label>
      <div class="field"><span>狀況／配件</span>
        <div class="chips small-chips">${IN_NOTES.map(n => `<button type="button" class="chip-btn" data-note="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <textarea class="input" data-f="notes" style="margin-top:8px" placeholder="可自行補充">${esc(it.notes)}</textarea></div>
      ${evalBlock(it, i)}
      <div class="field"><span>外觀照片 *（最多 8 張）</span>
        <div class="ph-grid">${it.photos.map((p, j) => `<div class="ph"><img src="${p}" alt="商品照片"><button class="ph-del" data-delph="${j}" aria-label="刪除">✕</button></div>`).join('')}
          ${it.photos.length < 8 ? `<label class="ph-add">📷 拍照<input type="file" accept="image/*" capture="environment" hidden data-photo-add></label>
          <label class="ph-add">＋ 相簿<input type="file" accept="image/*" multiple hidden data-photo-add></label>` : ''}</div></div>
    </div>`).join('')}
    <datalist id="dedList">${DEDUCT_SUGGEST.map(s => `<option value="${esc(s)}">`).join('')}</datalist>
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
    <div class="card"><h3>證件照片（正面、反面）</h3>
      <p class="small muted" style="margin:0 0 8px">會自動加上「僅限收購使用」與日期浮水印</p>
      <div class="id-slots">${['正面', '反面'].map((l, j) => `<div class="id-slot"><b>${l}</b>
        ${dr.idPhotos[j] ? `<div class="ph"><img src="${dr.idPhotos[j]}" alt="證件${l}"><button class="ph-del" data-delid="${j}" aria-label="刪除">✕</button></div>`
          : `<label class="ph-add ${dr.noticeAt ? '' : 'disabled'}">📷 拍${l}<input type="file" accept="image/*" capture="environment" hidden data-id-slot="${j}" ${dr.noticeAt ? '' : 'disabled'}></label>`}</div>`).join('')}</div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="verifiedOk" ${dr.verified ? 'checked' : ''}> 我已當面核對出售人證件與本人相符 *</label>
    </div>`;
}
function stepSign() {
  return `<div class="card"><h3>核對內容</h3><dl class="kv">
      <dt>出售人</dt><dd>${esc(dr.seller)}${dr.phone ? '　' + esc(dr.phone) : ''}</dd>
      ${dr.email ? `<dt>寄送收購單</dt><dd>${esc(dr.email)}</dd>` : ''}
      <dt>付款</dt><dd>${esc(dr.payment)}${dr.payment === '轉帳' ? `　${esc(dr.bank)} ${esc(dr.account)}（${esc(dr.period === '指定日期' ? dr.payDate : dr.period)}）` : ''}</dd>
      ${dr.items.map((it, i) => { const bad = it.checks.filter(c => c.r === 'bad'); return `<dt>商品 ${i + 1}</dt><dd>${esc(itemName(it))}${it.serial ? `<br><span class="small muted">${esc(it.serial)}</span>` : ''}<span class="num" style="float:right">NT$ ${money(it.price)}</span>
        <div class="small muted" style="margin-top:2px">${[...(isNewItem(it) ? ['全新未拆封'] : [it.grade && '外觀 ' + it.grade + ' ' + GRADE_TEXT[it.grade], it.battery && '電池 ' + it.battery + '%', bad.length ? '異常：' + bad.map(c => c.label).join('、') : '功能檢測皆正常']), it.deductions.filter(d => numv(d.amount)).map(d => `${d.reason} −${money(d.amount)}`).join('、')].filter(Boolean).map(esc).join('｜')}</div></dd>`; }).join('')}
      <dt>合計</dt><dd class="num"><b style="font-size:18px">NT$ ${money(sumDraft())}</b></dd></dl></div>
    <div class="card"><h3>二手商品收購條款</h3><ol class="terms-ol">${IN_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
      <label class="check"><input type="checkbox" id="agreeOk" ${dr.agreed ? 'checked' : ''}> 雙方已核對商品、金額與付款方式，同意上述條款，並以電子方式簽署 *</label></div>
    <div class="card"><h3>簽名</h3><div>
      <div><div style="display:flex;justify-content:space-between;align-items:center"><b>出售人簽名（請出售人在框內簽名）</b><button type="button" class="link" data-clear="sellerSign" style="font-size:14px">清除重簽</button></div>
        <canvas class="sig-pad sig-big" data-sig="sellerSign" width="1200" height="480"></canvas></div>
      <p class="small muted" style="margin:10px 0 0">經手人：<b style="color:var(--ink)">${esc(me.name)}</b></p></div>`;
}

function bindForm() {
  const body = $('#inBody'), err = m => { $('#inErr').textContent = m || ''; };
  $$('[data-k]:not([data-pick])', body).forEach(el => el.oninput = el.onchange = () => { dr[el.dataset.k] = el.value; if (el.dataset.k === 'period') drawForm(); });
  $$('select[data-pick][data-k]', body).forEach(el => el.onchange = () => {
    const k = el.dataset.k, other = el.value === IN_OTHER;
    dr['_m' + k] = other; dr[k] = other ? '' : el.value; drawForm();
    if (other) $(`input[data-k="${k}"][data-manual]`)?.focus();
  });
  $$('input[name=pay]', body).forEach(r => r.onchange = () => { dr.payment = r.value; drawForm(); });
  $$('[data-i]', body).forEach(card => {
    const it = dr.items[+card.dataset.i];
    $$('select[data-pick][data-f]', card).forEach(el => el.onchange = () => {
      const f = el.dataset.f, other = el.value === IN_OTHER;
      it._m = it._m || {}; it._m[f] = other; it[f] = other ? '' : el.value;
      if (other) { drawForm(); $(`[data-i="${card.dataset.i}"] input[data-f="${f}"][data-manual]`)?.focus(); }
      else if (f === 'model') drawForm(); // 換型號：顏色選項跟著換
    });
    const updPrice = () => {
      it.price = String(itemPrice(it));
      $('[data-sub]', card).textContent = 'NT$ ' + money(it.price);
      if ($('#inTotal')) $('#inTotal').textContent = 'NT$ ' + money(sumDraft());
    };
    $$('[data-f]:not(select)', card).forEach(el => el.oninput = () => { it[el.dataset.f] = el.value; if (el.dataset.f === 'base') updPrice(); });
    $$('[data-grade]', card).forEach(r => r.onchange = () => { it.grade = r.value; });
    const ckSum = () => {
      const bad = it.checks.filter(c => c.r === 'bad').length, na = it.checks.filter(c => c.r === 'na').length, s = $('[data-cksum]', card);
      s.className = 'tag ' + (bad ? 'bad' : 'ok'); s.textContent = (bad ? bad + ' 項異常' : '全部正常') + (na ? `・${na} 項未檢測` : '');
    };
    $$('[data-ck]', card).forEach(b => b.onclick = () => {
      const c = it.checks[+b.dataset.ck];
      c.r = b.dataset.r;
      const idx = it.deductions.findIndex(d => d._auto === c.k);
      if (c.r === 'bad' && idx < 0) { // 異常：自動加一筆扣款，金額由人員填
        it.deductions.push({ reason: CHECK_DEDUCT[c.k] || c.label + '異常', amount: '', _auto: c.k });
        it.price = String(itemPrice(it)); drawForm();
        $(`[data-i="${card.dataset.i}"] [data-da="${it.deductions.length - 1}"]`)?.focus({ preventScroll: true });
        return;
      }
      if (c.r !== 'bad' && idx >= 0) { it.deductions.splice(idx, 1); it.price = String(itemPrice(it)); drawForm(); return; }
      const row = b.closest('.ck-row'); row.className = 'ck-row ' + b.dataset.r; $$('button', row).forEach(x => x.classList.toggle('on', x === b));
      ckSum();
    });
    $$('[data-cknote]', card).forEach(el => el.oninput = () => { it.checks[+el.dataset.cknote].note = el.value; });
    if ($('[data-allok]', card)) $('[data-allok]', card).onclick = () => { it.checks.forEach(c => { c.r = 'ok'; }); it.deductions = it.deductions.filter(d => !d._auto); it.price = String(itemPrice(it)); it._open = true; drawForm(); };
    if ($('[data-ckwrap]', card)) $('[data-ckwrap]', card).ontoggle = e => { it._open = e.target.open; };
    $$('[data-dr]', card).forEach(el => el.oninput = () => { it.deductions[+el.dataset.dr].reason = el.value; });
    $$('[data-drs]', card).forEach(el => el.onchange = () => {
      const d = it.deductions[+el.dataset.drs], inp = el.parentElement.querySelector('[data-dr]');
      d._other = el.value === IN_OTHER;
      d.reason = d._other ? inp.value.trim() : el.value;
      inp.hidden = !d._other;
      if (d._other) inp.focus({ preventScroll: true });
      else el.closest('.price-row').querySelector('[data-da]').focus({ preventScroll: true }); // 選好原因 → 直接填金額
    });
    $$('[data-da]', card).forEach(el => el.oninput = () => { it.deductions[+el.dataset.da].amount = el.value; updPrice(); });
    $('[data-addd]', card).onclick = () => { it.deductions.push({ reason: '', amount: '' }); drawForm(); $$(`[data-i="${card.dataset.i}"] [data-drs]`).pop()?.focus({ preventScroll: true }); };
    $$('[data-deld]', card).forEach(b => b.onclick = () => { it.deductions.splice(+b.dataset.deld, 1); it.price = String(itemPrice(it)); drawForm(); });
    $$('[data-cond]', card).forEach(r => r.onchange = () => {
      it.cond = r.value;
      if (isNewItem(it)) { it.grade = 'A'; it.battery = ''; it.checks.forEach(c => { c.r = 'na'; c.note = ''; }); it.deductions = it.deductions.filter(d => !d._auto); }
      else { it.grade = ''; it.checks.forEach(c => { c.r = 'ok'; }); }
      drawForm();
    });
    $$('[data-cat]', card).forEach(r => r.onchange = () => { it.category = r.value; it.model = ''; it.capacity = ''; it._m = {}; drawForm(); });
    $$('[data-note]', card).forEach(b => b.onclick = () => { if (!it.notes.includes(b.dataset.note)) it.notes = (it.notes ? it.notes + '、' : '') + b.dataset.note; $('[data-f=notes]', card).value = it.notes; });
    $$('[data-delph]', card).forEach(b => b.onclick = () => { it.photos.splice(+b.dataset.delph, 1); drawForm(); });
    $$('[data-photo-add]', card).forEach(inp => inp.onchange = async () => {
      const files = [...inp.files].slice(0, 8 - it.photos.length);
      err('處理照片中…');
      for (const f of files) { try { it.photos.push(await resizeImage(f, 1280, 0.8)); } catch (e) { toast(e.message); } }
      err(); drawForm();
    });
    const scan = $('[data-scan]', card);
    if (scan) scan.onclick = () => scanDevice(it);
    $('[data-est]', card).onclick = () => estPick(it);
  });
  $$('[data-del-item]', body).forEach(b => b.onclick = async () => { if (await ask(`移除商品 ${+b.dataset.delItem + 1}？`, '移除')) { dr.items.splice(+b.dataset.delItem, 1); drawForm(); } });
  if ($('#addItem')) $('#addItem').onclick = () => { dr.items.push(newItem()); drawForm(); setTimeout(() => $$('[data-i]').pop()?.scrollIntoView({ behavior: 'smooth' }), 50); };
  if ($('#noticeOk')) $('#noticeOk').onchange = e => { dr.noticeAt = e.target.checked ? new Date().toISOString() : ''; if (!e.target.checked) dr.idPhotos = []; drawForm(); };
  if ($('#verifiedOk')) $('#verifiedOk').onchange = e => { dr.verified = e.target.checked; };
  $$('[data-delid]', body).forEach(b => b.onclick = () => { dr.idPhotos[+b.dataset.delid] = ''; drawForm(); });
  $$('[data-id-slot]', body).forEach(inp => inp.onchange = async () => { // 正面＝第 1 張、反面＝第 2 張
    try { dr.idPhotos[+inp.dataset.idSlot] = await watermarkImage(inp.files[0], 1400); } catch (e) { toast(e.message); } drawForm();
  });
  if ($('#agreeOk')) $('#agreeOk').onchange = e => { dr.agreed = e.target.checked; };
  $$('[data-sig]', body).forEach(c => sigPad(c, dr[c.dataset.sig], url => { dr[c.dataset.sig] = url; }));
  $$('[data-clear]', body).forEach(b => b.onclick = () => { dr[b.dataset.clear] = ''; drawForm(); });
  if ($('#inBack')) $('#inBack').onclick = () => { drStep--; drawForm(); };
  $('#inNext').onclick = () => nextStep(err);
}

function nextStep(err) {
  if (drStep === 1) {
    if (!dr.seller.trim()) return err('請填寫出售人姓名');
    dr.email = (dr.email || '').trim();
    if (dr.email && !IN_EMAIL_RE.test(dr.email)) return err('電子信箱格式不正確，不寄送請留空');
    if (!dr.payment) return err('請選擇付款方式');
    if (dr.payment === '轉帳') {
      if (!dr.bank.trim()) return err('請填寫收款銀行');
      if (!/^\d{6,24}$/.test(dr.account.replace(/[\s-]/g, ''))) return err('收款帳號請輸入 6–24 位數字');
      if (dr.period === '指定日期' && !dr.payDate) return err('請選擇指定匯款日期');
    }
    for (let i = 0; i < dr.items.length; i++) {
      const it = dr.items[i];
      if (!it.model.trim()) return err(`請填寫商品 ${i + 1} 的品名／型號`);
      it.price = String(itemPrice(it));
      if (!(numv(it.base) > 0)) return err(`請填寫商品 ${i + 1} 的基本收購價`);
      if (it.deductions.some(d => numv(d.amount) > 0 && !d.reason.trim())) return err(`請填寫商品 ${i + 1} 的扣減原因`);
      const noAmt = it.deductions.find(d => d.reason.trim() && String(d.amount).trim() === '');
      if (noAmt) return err(`請填寫商品 ${i + 1}「${noAmt.reason}」的扣款金額（不扣款請填 0）`);
      if (!(Number(it.price) > 0)) return err(`商品 ${i + 1} 扣減後的收購金額需大於 0`);
      if (!it.photos.length) return err(`請拍攝商品 ${i + 1} 的外觀照片`);
    }
  }
  if (drStep === 2 && !dr.verified) return err('請勾選「已當面核對出售人證件」');
  if (drStep < 3) { drStep++; return drawForm(); }
  if (!dr.agreed) return err('請勾選同意條款與電子簽署');
  if (!dr.sellerSign) return err('請出售人完成簽名');
  submitIntake(err);
}
async function submitIntake(err) {
  if (drBusy) return;
  drBusy = true;
  const btn = $('#inNext'); btn.disabled = true; btn.textContent = '上傳中，請勿關閉…';
  try {
    const items = dr.items.map(({ _m, _est, _estSel, _open, ...it }) => ({ ...it, deductions: (it.deductions || []).map(({ _other, _auto, ...d }) => d) }));
    const ids = [dr.idPhotos[0], dr.idPhotos[1]].filter(Boolean);
    const r = await api('intakeCreate', { ...dr, items, idPhotos: ids, account: dr.account.replace(/[\s-]/g, '') });
    drDone = r.intake;
    drDone._local = { items: dr.items.map(it => it.photos), ids, sellerSign: dr.sellerSign, staffSign: dr.staffSign };
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
  photoCache[o.sellerSign] = o._local.sellerSign;
  app.innerHTML = `${pagesNav('intake')}<div class="card staff-login rise" style="text-align:center">
    <div style="font-size:44px">✅</div><h2 class="card-title">收購單已建立</h2>
    <p class="num" style="font-size:22px;margin:6px 0">${esc(o.id)}</p>
    <p class="muted">${esc(o.seller)}・${o.items.length} 件${o.total != null ? `・NT$ ${money(o.total)}` : ''}${o.payment === '轉帳' ? '・待匯款' : '・現金'}</p>
    ${mailNote(o)}
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
  if (canvas.classList.contains('sig-big')) { // 平板簽名：畫布解析度跟著實際顯示大小，筆跡不變形
    const r = canvas.getBoundingClientRect(), k = Math.min(2, window.devicePixelRatio || 1);
    if (r.width > 0) { canvas.width = Math.round(r.width * k); canvas.height = Math.round(r.height * k); }
  }
  g.lineWidth = Math.max(3.2, canvas.width / 190); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111';
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
/* ---------- 用估價表填寫（和網站「線上估價」相同的選法） ---------- */
let inEst = null;
const EST_CAT_MAP = { iPhone: '手機', iPad: '平板', Mac: '筆電' };
const EST_ISSUE_CHECK = [[/螢幕|顯示|觸控/, 'display'], [/相機|鏡頭/, 'camera'], [/按鍵|按鈕/, 'buttons'], [/水/, 'water'], [/Face ?ID|Touch ?ID/i, 'faceid'],
  [/喇叭|麥克風|聲音/, 'audio'], [/充電|連接埠/, 'charge'], [/訊號|網路/, 'signal'], [/維修|非原廠/, 'repair'], [/帳號|尋找|鎖/, 'lock'], [/背蓋/, 'back'], [/邊框|機身/, 'body']];
async function estPick(it) {
  const w = document.createElement('div');
  w.className = 'ask-wrap';
  w.innerHTML = '<div class="ask-box est-box"><div class="spinner"></div></div>';
  document.body.appendChild(w);
  const box = $('.est-box', w);
  if (!inEst) {
    try { inEst = await api('priceTable'); } catch (e) { box.innerHTML = `<p>估價表載入失敗：${esc(e.message)}</p><div class="ask-btns"><button class="btn btn-ghost" data-x>關閉</button></div>`; $('[data-x]', w).onclick = () => w.remove(); return; }
  }
  const { rows, rules } = inEst;
  if (!rows.length) { box.innerHTML = '<p>估價表還沒有資料，請到「完整後台 → 估價表」填寫。</p><div class="ask-btns"><button class="btn btn-ghost" data-x>關閉</button></div>'; $('[data-x]', w).onclick = () => w.remove(); return; }
  const sel = it._estSel || { category: '', cond: '', model: '', capacity: '', appearance: '', battery: '', issues: [], missing: [] };
  const draw = () => {
    const cats = [...new Set(rows.map(r => r.category))];
    if (!cats.includes(sel.category)) sel.category = cats[0];
    const inCat = rows.filter(r => r.category === sel.category);
    const hasNew = inCat.some(r => r.newPrice > 0), hasUsed = inCat.some(r => r.price > 0);
    if (!hasNew) sel.cond = '二手'; else if (!hasUsed) sel.cond = '全新未拆封'; else if (!sel.cond) sel.cond = '二手';
    const isNew = sel.cond === '全新未拆封';
    const pool = inCat.filter(r => isNew ? r.newPrice > 0 : r.price > 0);
    const models = [...new Set(pool.map(r => r.model))];
    if (!models.includes(sel.model)) { sel.model = ''; sel.capacity = ''; }
    const caps = pool.filter(r => r.model === sel.model);
    if (caps.length === 1) sel.capacity = caps[0].capacity;
    if (!caps.some(r => r.capacity === sel.capacity)) sel.capacity = '';
    const row = caps.find(r => r.capacity === sel.capacity);
    const detail = !isNew && ['iPhone', 'iPad', 'Mac'].includes(sel.category);
    const req = row ? batteryReq(row, rules) : 0;
    const accList = row && detail ? accItemsFor(row, rules) : [];
    sel.missing = sel.missing.filter(l => accList.some(a => a.label === l));
    if (detail && !sel.appearance && rules.appearance[0]) sel.appearance = rules.appearance[0].label;
    if (detail && !sel.battery && rules.battery[0]) sel.battery = rules.battery[0].label;
    const plan = row ? estPlan(row, sel, rules, req, accList, isNew, detail) : null;
    const chips = (key, list, multi, okLabel) => `<div class="chips">${(okLabel ? [okLabel, ...list] : list).map(l => `<label class="chip"><input type="${multi ? 'checkbox' : 'radio'}" name="ie_${key}" value="${esc(l)}" ${multi ? ((l === okLabel ? !sel[key].length : sel[key].includes(l)) ? 'checked' : '') : (sel[key] === l ? 'checked' : '')}><span>${esc(l)}</span></label>`).join('')}</div>`;
    box.innerHTML = `<h3 style="margin:0 0 12px">用估價表填寫</h3>
      ${cats.length > 1 ? `<div class="field"><span>類別</span>${chips('category', cats)}</div>` : ''}
      ${hasNew && hasUsed ? `<div class="field"><span>商品狀態</span>${chips('cond', ['二手', '全新未拆封'])}</div>` : ''}
      <label class="field"><span>型號</span><select class="input" id="ieModel"><option value="">請選擇型號</option>${models.map(m => `<option ${sel.model === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      ${sel.model && caps.length > 1 ? `<div class="field"><span>${sel.category === 'Mac' ? '年份／晶片' : sel.category === 'iPad' ? '容量／網路' : '容量／規格'}</span>${chips('capacity', caps.map(r => r.capacity))}</div>` : ''}
      ${row && detail ? `<div class="field"><span>外觀</span>${chips('appearance', rules.appearance.map(x => x.label))}</div>
        <div class="field"><span>電池健康度 <small class="muted" style="font-weight:400">${req ? `標準 ${req}% 以上` : '此型號不看電池'}</small></span>${chips('battery', rules.battery.map(x => x.label))}</div>
        ${accList.length ? `<div class="field"><span>盒子與配件</span>${chips('missing', accList.map(a => a.label), true, '盒子配件都有')}</div>` : ''}
        <div class="field"><span>功能狀況（可複選）</span>${chips('issues', rules.issues.map(x => x.label), true, '功能都正常')}</div>` : ''}
      ${plan ? `<table class="rep-price">
          <tr><td>基本收購價${isNew ? '（全新）' : ''}</td><td>NT$ ${money(plan.base)}</td></tr>
          ${plan.deductions.map(d => `<tr class="minus"><td>${esc(d.reason)}</td><td>${d.amount === '' ? '需實際檢測' : '− NT$ ' + money(d.amount)}</td></tr>`).join('')}
          <tr class="sub"><td>收購金額</td><td>NT$ ${money(Math.max(0, plan.base - plan.deductions.reduce((s, d) => s + numv(d.amount), 0)))}</td></tr></table>
        ${plan.inspect ? '<p class="small" style="color:#8a5300;margin:8px 0 0">⚠ 有需檢測的故障，扣款金額請依實際狀況填寫</p>' : ''}` : `<p class="small muted">${sel.model ? '請選擇規格' : '選擇型號後顯示價格'}</p>`}
      <div class="ask-btns" style="margin-top:14px"><button class="btn btn-ghost" data-x>取消</button><button class="btn btn-dark" data-ok ${plan ? '' : 'disabled'}>帶入此商品</button></div>`;
    $('[data-x]', box).onclick = () => w.remove();
    $('#ieModel', box).onchange = e => { sel.model = e.target.value; sel.capacity = ''; draw(); };
    ['category', 'cond', 'capacity', 'appearance', 'battery'].forEach(k => $$(`input[name=ie_${k}]`, box).forEach(r => r.onchange = () => {
      sel[k] = r.value;
      if (k === 'category') { sel.model = ''; sel.cond = ''; sel.appearance = ''; sel.battery = ''; }
      if (k === 'cond') sel.model = '';
      draw();
    }));
    [['issues', '功能都正常'], ['missing', '盒子配件都有']].forEach(([key, ok]) => $$(`input[name=ie_${key}]`, box).forEach(c => c.onchange = () => {
      sel[key] = c.value === ok ? [] : $$(`input[name=ie_${key}]:checked`, box).map(x => x.value).filter(v => v !== ok);
      draw();
    }));
    if (plan) $('[data-ok]', box).onclick = () => { estApply(it, sel, row, plan, isNew, rules); w.remove(); drawForm(); toast('已依估價表帶入'); };
  };
  draw();
}
/** 把線上估價的計算拆成「基本價 − 各項扣減」，每項取整到百元 */
function estPlan(row, sel, rules, req, accList, isNew, detail) {
  const base = isNew ? row.newPrice : row.price;
  if (!detail) return { base, deductions: [], inspect: false };
  const find = (list, label) => (list || []).find(x => x.label === label);
  const r100 = v => Math.max(0, Math.round(v / 100) * 100);
  const deductions = [];
  let v = base;
  const ap = find(rules.appearance, sel.appearance);
  if (ap && ap.pct < 100) { const nv = v * ap.pct / 100; deductions.push({ reason: '外觀：' + ap.label, amount: r100(v - nv) }); v = nv; }
  const bt = find(rules.battery, sel.battery);
  const btPct = !bt ? 100 : (bt.min != null && bt.min >= req) ? 100 : bt.pct;
  if (bt && btPct < 100) { const nv = v * btPct / 100; deductions.push({ reason: '電池健康度 ' + bt.label, amount: r100(v - nv) }); v = nv; }
  let inspect = false;
  sel.issues.map(l => find(rules.issues, l)).filter(Boolean).forEach(i => {
    if (i.inspect) { inspect = true; deductions.push({ reason: '故障：' + i.label, amount: '' }); return; }
    const nv = v * (100 - i.pct) / 100; deductions.push({ reason: '故障：' + i.label, amount: r100(v - nv) }); v = nv;
  });
  sel.missing.forEach(l => { const a = accList.find(x => x.label === l); if (a && a.amount) deductions.push({ reason: l, amount: a.amount }); });
  return { base, deductions: deductions.filter(d => d.amount === '' || d.amount > 0), inspect };
}
function estApply(it, sel, row, plan, isNew, rules) {
  const cat = EST_CAT_MAP[sel.category] || '其他 3C';
  it.category = cat; it._m = {};
  it.model = sel.model; it._m.model = !IN_CATS[cat].includes(sel.model);
  it.capacity = sel.capacity || ''; it._m.capacity = !!it.capacity && !IN_CAPS.includes(it.capacity);
  it.base = String(plan.base);
  it.deductions = plan.deductions.map(d => ({ reason: d.reason, amount: d.amount === '' ? '' : String(d.amount) }));
  it.price = String(itemPrice(it));
  const apIdx = rules.appearance.findIndex(x => x.label === sel.appearance);
  it.cond = isNew ? IN_NEW : IN_USED;
  it.grade = isNew ? 'A' : apIdx >= 0 ? 'ABCD'[Math.min(apIdx, 3)] : it.grade;
  it.checks.forEach(c => { c.r = isNew ? 'na' : 'ok'; c.note = ''; });
  sel.issues.forEach(l => {
    const hit = EST_ISSUE_CHECK.find(([re]) => re.test(l));
    const c = hit && it.checks.find(x => x.k === hit[1]);
    if (c) { c.r = 'bad'; c.note = c.note ? c.note + '、' + l : l; }
  });
  if (sel.issues.length) it._open = true;
  const notes = [isNew ? '全新未拆封' : '', sel.missing.length ? '缺：' + sel.missing.join('、') : (!isNew && accItemsFor(row, rules).length ? '盒子配件齊全' : ''), sel.battery ? '電池 ' + sel.battery : ''].filter(Boolean);
  it.notes = [...new Set([...(it.notes ? it.notes.split('、') : []), ...notes])].join('、');
  it._est = [sel.model, sel.capacity, sel.cond].filter(Boolean).join(' ');
  it._estSel = JSON.parse(JSON.stringify(sel));
}

/** 掃描框：開相機，只辨識框內，連續掃到型號＋IMEI／序號就停 */
async function scanDevice(it, onDone) {
  if (typeof deviceOcr === 'undefined') return toast('辨識功能載入失敗');
  const w = document.createElement('div');
  w.className = 'scan-wrap';
  w.innerHTML = `<video playsinline muted autoplay></video>
    <div class="scan-frame"><i></i><i></i><i></i><i></i><div class="scan-line"></div></div>
    <div class="scan-top"><b>把 IMEI 或序號那一行對準框框</b><span>設定 → 一般 → 關於本機，或盒子上的標籤；靠近一點、拿穩、避免反光</span></div>
    <div class="scan-bottom">
      <div class="scan-chips"><span data-c="imei">IMEI</span><span data-c="serial">序號</span></div>
      <p class="scan-msg">正在開啟相機…</p>
      <div class="scan-btns">
        <button type="button" class="btn scan-ghost" data-x>關閉</button>
        <label class="btn scan-ghost">從相簿選<input type="file" accept="image/*" hidden data-file></label>
        <button type="button" class="btn scan-ghost" data-torch hidden>💡 補光</button>
        <button type="button" class="btn btn-dark scan-use" data-use disabled>使用結果</button>
      </div></div>`;
  document.body.appendChild(w);
  const video = $('video', w), msg = t => { const m = $('.scan-msg', w); if (m) m.textContent = t; };
  let stream, eng, alive = true, last = null;
  const found = { imei: '', serial: '' }, votes = {};
  const close = () => { alive = false; stream && stream.getTracks().forEach(t => t.stop()); eng && eng.end(); w.remove(); };
  $('[data-x]', w).onclick = close;
  $('[data-file]', w).onchange = e => { const f = e.target.files[0]; if (f) { close(); runOcr(f, it, onDone); } };
  const show = () => {
    Object.keys(found).forEach(k => $(`[data-c="${k}"]`, w).classList.toggle('ok', !!found[k]));
    $('[data-use]', w).disabled = !(found.imei || found.serial);
  };
  const finish = () => { const snap = last; close(); confirmOcr(it, { ...found }, snap, onDone); };
  $('[data-use]', w).onclick = finish;
  // 相機
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    if (!alive) return stream.getTracks().forEach(t => t.stop());
    video.srcObject = stream; await video.play();
    const track = stream.getVideoTracks()[0], cap = track.getCapabilities ? track.getCapabilities() : {};
    if (cap.focusMode && cap.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    if (cap.torch) { const b = $('[data-torch]', w); b.hidden = false; let on = false; b.onclick = () => { on = !on; track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {}); b.classList.toggle('on', on); }; }
  } catch (e) {
    msg('無法開啟相機（請允許相機權限），可改用「從相簿選」照片辨識。'); return;
  }
  msg('正在載入辨識工具，第一次使用需要幾秒…');
  try { eng = await deviceOcr.session({ codes: true }); } catch (e) { msg(e.message || '辨識工具載入失敗，請改用「從相簿選」'); return; }
  if (!alive) return eng.end();
  msg('掃描中…對準框框，保持不動');
  // 框框在影片上的位置 → 換算成影片原始像素
  const crop = () => {
    const vr = video.getBoundingClientRect(), fr = $('.scan-frame', w).getBoundingClientRect();
    const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(vr.width / vw, vr.height / vh);
    const ox = (vw * k - vr.width) / 2, oy = (vh * k - vr.height) / 2;
    const sx = Math.max(0, (fr.left - vr.left + ox) / k), sy = Math.max(0, (fr.top - vr.top + oy) / k);
    return [sx, sy, Math.min(vw - sx, fr.width / k), Math.min(vh - sy, fr.height / k)];
  };
  // 有條碼辨識的裝置（例如 Android Chrome）也讀盒子上的條碼
  let bd = null;
  try { if ('BarcodeDetector' in window) bd = new BarcodeDetector({ formats: ['code_128', 'code_39', 'qr_code', 'data_matrix'] }); } catch (e) { bd = null; }
  let rounds = 0;
  while (alive) {
    if (!video.videoWidth) { await new Promise(r => setTimeout(r, 200)); continue; }
    const [sx, sy, sw, sh] = crop();
    const cv = deviceOcr.enhance(video, sx, sy, sw, sh, 1800);
    const r = { imei: '', serial: '' };
    if (bd) {
      try {
        (await bd.detect(cv)).forEach(b => {
          const v = String(b.rawValue || '').trim().toUpperCase();
          if (deviceOcr.luhn(v.replace(/\D/g, '')) && v.replace(/\D/g, '').length === 15) r.imei = r.imei || v.replace(/\D/g, '');
          else { const m = v.match(/^S?([A-Z0-9]{10,12})$/); if (m && /\d/.test(m[1]) && /[A-Z]/.test(m[1])) r.serial = r.serial || m[1]; }
        });
      } catch (e) { bd = null; }
    }
    if (!r.imei) {
      // 輪流用「高對比」和「黑白二值化」兩種影像，提高成功率
      const img = rounds % 2 ? deviceOcr.binarize(cv) : cv;
      let o;
      try { o = await eng.read(img); } catch (e) { if (!alive) return; msg('辨識失敗，重試中…'); continue; }
      r.imei = r.imei || o.imei; r.serial = r.serial || o.serial;
    }
    if (!alive) return;
    rounds++;
    let got = false;
    if (r.imei && !found.imei) { found.imei = r.imei; got = true; } // IMEI 有檢查碼，讀到一次就可信
    if (r.serial && !found.serial) { // 序號：讀到兩次一樣才採用
      votes[r.serial] = (votes[r.serial] || 0) + 1;
      if (votes[r.serial] >= 2) { found.serial = r.serial; got = true; }
    }
    if (got) { last = cv.toDataURL('image/jpeg', 0.85); if (navigator.vibrate) navigator.vibrate(40); }
    show();
    if (found.imei || found.serial) { msg('辨識完成'); await new Promise(r => setTimeout(r, 300)); if (alive) finish(); return; }
    msg(rounds > 8 ? '還沒讀到：請把 IMEI 或序號那一行放在框中間、靠近一點讓字變大，或改用「從相簿選」' : '掃描中…把 IMEI 或序號那一行對準框框');
  }
}

/** 辨識結果確認框（可修改後帶入） */
function confirmOcr(it, r, img, onDone) {
  const w = document.createElement('div');
  w.className = 'ask-wrap';
  w.innerHTML = `<div class="ask-box" style="max-width:420px">${img ? `<img src="${img}" style="width:100%;max-height:200px;object-fit:contain;border-radius:10px;background:#f2f2f4">` : ''}
    <p class="small" style="margin:10px 0">請對照確認，可直接修改：</p>
    ${r.model ? `<label class="field"><span>品名／型號</span><input class="input" id="oM" value="${esc(r.model)}"></label>` : ''}
    <label class="field"><span>IMEI／序號</span><input class="input num" id="oS" value="${esc(r.imei || r.serial)}"></label>
    ${r.imei && r.serial ? `<p class="small muted" style="text-align:left;margin:0 0 10px">也讀到序號 ${esc(r.serial)}</p>` : ''}
    <div class="ask-btns"><button class="btn btn-ghost" data-x>取消</button><button class="btn btn-dark" data-ok>帶入表單</button></div></div>`;
  document.body.appendChild(w);
  $('[data-x]', w).onclick = () => w.remove();
  $('[data-ok]', w).onclick = () => {
    const m = $('#oM', w) ? $('#oM', w).value.trim() : '', s = $('#oS', w).value.trim();
    if (m) { it.model = m; it._m = it._m || {}; it._m.model = !IN_CATS[it.category]?.includes(m); }
    if (s) it.serial = s;
    w.remove(); (onDone || drawForm)(); toast('已帶入辨識結果');
  };
}

async function runOcr(file, it, onDone) {
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
    close(); confirmOcr(it, r, null, onDone);
  } catch (e) { if ($('#ocrMsg', w)) $('#ocrMsg', w).textContent = e.message || '辨識失敗，請手動輸入'; }
}

/* ============================== 收購聯（列印） ============================== */
/** 加到主畫面的 App 模式（iPad 常不能用瀏覽器列印），改用 PDF 分享 */
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const canPrint = () => typeof window.print === 'function' && !isStandalone();
const canSharePdf = f => !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] }));
function downloadFile(f) {
  const url = URL.createObjectURL(f), a = document.createElement('a');
  a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
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
      ${o.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(itemName(it))}</td><td class="num">${esc(it.serial || '—')}</td><td>${esc(it.notes || '')}</td><td class="num" style="text-align:right">${it.price == null ? '—' : 'NT$ ' + money(it.price)}</td></tr>`).join('')}
      <tr class="rc-total"><td colspan="4">合計</td><td class="num" style="text-align:right">${o.total == null ? '—' : 'NT$ ' + money(o.total)}</td></tr></tbody></table>
    ${intakeEvalHTML(o, true)}
    <ol class="terms-ol small">${IN_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
    <p class="small">✓ 門市已當面核對出售人證件　✓ 雙方同意上述條款並以電子方式簽署（${esc(o.terms)}）</p>
    ${o.idPhotos.length ? `<div class="rc-ids">${o.idPhotos.map(p => `<img data-photo="${esc(p)}" alt="證件（浮水印）">`).join('')}</div>` : ''}
    <div class="rc-sign"><div><img data-photo="${esc(o.sellerSign)}" alt="出售人簽名"><span>出售人 ${esc(o.seller)}</span></div>
      <div>${o.staffSign ? `<img data-photo="${esc(o.staffSign)}" alt="經手人簽名">` : `<div class="rc-staff">${esc(o.staff)}</div>`}<span>經手人${o.staffSign ? ' ' + esc(o.staff) : ''}</span></div></div>
  </div><div class="no-print" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
    <button class="btn" style="flex:1;background:#fff;color:#111;min-width:180px" data-pdf disabled>📄 PDF 準備中…</button>
    ${canPrint() ? '<button class="btn" style="background:#fff;color:#111" data-print>🖨 列印</button>' : ''}
    <button class="btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)" data-close>關閉</button></div>
    <p class="no-print small" style="color:rgba(255,255,255,.75);margin:8px 0 0;text-align:center">在平板上按「PDF」會打開分享選單，可選「列印」「儲存到檔案」「AirDrop」或「郵件」</p></div>`;
  document.body.appendChild(w);
  w.onclick = e => { if (e.target === w || e.target.dataset.close !== undefined) w.remove(); };
  // 列印：直接在點擊當下呼叫（iPad 需要），不用等照片
  const pr = $('[data-print]', w);
  if (pr) pr.onclick = () => {
    document.body.classList.add('printing');
    window.print();
    setTimeout(() => document.body.classList.remove('printing'), 1500);
  };
  // PDF：先在背景產生好，按下去馬上分享／下載
  const pb = $('[data-pdf]', w);
  let pdfFile = null;
  api('intakePdf', { id: o.id, kind: customer ? 'customer' : 'shop' }).then(r => {
    const bin = atob(r.data), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    pdfFile = new File([bytes], r.name, { type: 'application/pdf' });
    pb.disabled = false; pb.textContent = canSharePdf(pdfFile) ? '📄 PDF（列印／存檔／分享）' : '📄 下載 PDF';
  }).catch(e => { if (e.auth) return start(); pb.textContent = 'PDF 產生失敗：' + e.message; });
  pb.onclick = async () => {
    if (!pdfFile) return;
    if (canSharePdf(pdfFile)) {
      try { await navigator.share({ files: [pdfFile], title: pdfFile.name }); } catch (e) { if (e.name !== 'AbortError') downloadFile(pdfFile); }
    } else downloadFile(pdfFile);
  };
  loadPhotos(w);
}

/* ============================== 庫存 ============================== */
let stockCache = null, stQuery = '', stStatus = 'active', stSource = '', stView = 'list', stModel = '';
const byName = (a, b) => a.localeCompare(b, 'zh-Hant', { numeric: true });
async function stockPage(refresh) {
  if (refresh || !stockCache) {
    app.innerHTML = pagesNav('stock') + '<div class="spinner"></div>';
    try { const res = await api('stockList'); stockCache = res.items; if (res.cardFee != null) stFee = res.cardFee; } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('stock') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const active = stockCache.filter(r => r.status !== '已售出');
  const month = localDay().slice(0, 7);
  const soldM = stockCache.filter(r => r.status === '已售出' && (r.saleDate || '').slice(0, 7) === month);
  app.innerHTML = `${pagesNav('stock')}
    <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat" style="--c:#0A84FF"><div class="n num">${active.length}</div><div class="l">在庫（含整理中）</div></div>
      <div class="stat" style="--c:#BF5AF2"><div class="n num">${stockCache.filter(r => r.status === '整理中').length}</div><div class="l">整理中</div></div>
      ${showCost() ? `<div class="stat" style="--c:#30D158"><div class="n num">${nt(active.reduce((t, r) => t + (r.cost || 0), 0))}</div><div class="l">在庫成本</div></div>` : ''}
      <div class="stat" style="--c:#1d1d1f"><div class="n num">${soldM.length}</div><div class="l">本月售出</div></div>
      ${showCost() ? `<div class="stat" style="--c:#FF9F0A"><div class="n num">${nt(soldM.reduce((t, r) => t + ((r.salePrice || 0) - (r.cost || 0)), 0))}</div><div class="l">本月毛利</div></div>` : ''}
    </div>
    <div class="tabs st-view">${[['list', '📋 明細'], ['model', '📊 依型號總清單']].map(([k, l]) => `<button data-view="${k}" class="${stView === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="toolbar">
      <input class="input" id="stQ" placeholder="搜尋 型號／IMEI／單號" value="${esc(stQuery)}">
      ${stView === 'list' ? `<select class="input st-model" id="stModel"><option value="">全部型號</option>${modelOptions()}</select>` : ''}
      <div class="tabs">${stView === 'list' ? [['active', '在庫'], ['整理中', '整理中'], ['已售出', '已售出'], ['all', '全部']].map(([k, l]) => `<button data-st="${k}" class="${stStatus === k ? 'on' : ''}">${l}</button>`).join('') : ''}
        ${[['', '全部來源'], ['門市', '門市'], ['宅配', '宅配']].map(([k, l]) => `<button data-src="${k}" class="${stSource === k ? 'on' : ''}">${l}</button>`).join('')}
        ${P('edit_stock') ? `<button id="csv">⬇ 匯出盤點 CSV</button><button id="feeBtn">💳 刷卡手續費 ${esc(stFee)}%</button>` : ''}</div>
    </div><div id="stTbl"></div>`;
  $('#stQ').oninput = e => { stQuery = e.target.value; drawStock(); };
  $$('[data-view]').forEach(b => b.onclick = () => { stView = b.dataset.view; stockPage(); });
  if ($('#stModel')) $('#stModel').onchange = e => { stModel = e.target.value; drawStock(); };
  $$('[data-st]').forEach(b => b.onclick = () => { stStatus = b.dataset.st; stockPage(); });
  $$('[data-src]').forEach(b => b.onclick = () => { stSource = b.dataset.src; stockPage(); });
  if ($('#csv')) $('#csv').onclick = exportCsv;
  if ($('#feeBtn')) $('#feeBtn').onclick = () => setCardFee();
  drawStock();
}
/** 型號下拉：每個型號後面標在庫數量 */
function modelOptions() {
  const m = {};
  stockCache.filter(r => !stSource || r.source === stSource).forEach(r => { const k = r.model || '（未填型號）'; m[k] = m[k] || { n: 0, a: 0 }; m[k].n++; if (r.status !== '已售出') m[k].a++; });
  return Object.keys(m).sort(byName).map(k => `<option value="${esc(k)}" ${stModel === k ? 'selected' : ''}>${esc(k)}（在庫 ${m[k].a}／共 ${m[k].n}）</option>`).join('');
}
function stockVisible(ignoreStatus) {
  const q = stQuery.trim().toLowerCase();
  return stockCache.filter(r => (ignoreStatus || stStatus === 'all' || (stStatus === 'active' ? r.status !== '已售出' : r.status === stStatus))
    && (!stSource || r.source === stSource)
    && (ignoreStatus || !stModel || (r.model || '（未填型號）') === stModel)
    && (!q || [r.sku, r.ref, r.model, r.serial, r.capacity, r.color, r.category].join(' ').toLowerCase().includes(q)));
}
/** 依型號總清單 */
function drawModelSummary() {
  const g = {};
  stockVisible(true).forEach(r => {
    const k = r.model || '（未填型號）';
    const x = g[k] = g[k] || { model: k, cat: r.category || '', a: 0, p: 0, s: 0, cost: 0, caps: {}, sg: [], noSg: 0 };
    if (r.status === '在庫') x.a++; else if (r.status === '整理中') x.p++; else x.s++;
    if (r.status !== '已售出') { if (r.suggestCash) x.sg.push(r.suggestCash); else x.noSg++; }
    if (r.status !== '已售出') { x.cost += r.cost || 0; const c = r.capacity || '—'; x.caps[c] = (x.caps[c] || 0) + 1; }
  });
  const rows = Object.values(g).sort((a, b) => byName(a.cat, b.cat) || byName(a.model, b.model));
  const cost = showCost();
  const tot = rows.reduce((t, x) => ({ a: t.a + x.a, p: t.p + x.p, s: t.s + x.s, cost: t.cost + x.cost }), { a: 0, p: 0, s: 0, cost: 0 });
  const sgRange = x => x.sg.length ? `NT$ ${money(Math.min(...x.sg))}${Math.max(...x.sg) !== Math.min(...x.sg) ? '–' + money(Math.max(...x.sg)) : ''}${x.noSg ? `<div class="sub">${x.noSg} 台未設定</div>` : ''}` : (x.a + x.p ? '<span class="sub">未設定</span>' : '—');
  $('#stTbl').innerHTML = rows.length ? `<table class="st-sum"><thead><tr><th>型號</th><th class="hide-m">在庫規格</th><th class="c">在庫</th><th class="c">整理中</th><th class="c">已售出</th><th>建議售價（現金）</th>${cost ? '<th class="hide-m" style="text-align:right">在庫成本</th>' : ''}</tr></thead><tbody>
    ${rows.map(x => `<tr data-model="${esc(x.model)}"><td><b>${esc(x.model)}</b><div class="sub">${esc(x.cat)}</div></td>
      <td class="sub hide-m">${Object.keys(x.caps).sort(byName).map(c => `${esc(c)}×${x.caps[c]}`).join('、') || '—'}</td>
      <td class="c num"><b>${x.a || '—'}</b></td><td class="c num">${x.p || '—'}</td><td class="c num sub">${x.s || '—'}</td>
      <td class="num">${sgRange(x)}${P('edit_stock') && x.a + x.p ? `<div><button class="link" data-sgb="${esc(x.model)}" style="font-size:13px">設定售價</button></div>` : ''}</td>
      ${cost ? `<td class="num hide-m" style="text-align:right">${x.cost ? nt(x.cost) : '—'}</td>` : ''}</tr>`).join('')}
    <tr class="st-tot"><td><b>合計 ${rows.length} 個型號</b></td><td class="hide-m"></td><td class="c num"><b>${tot.a}</b></td><td class="c num">${tot.p}</td><td class="c num">${tot.s}</td><td></td>${cost ? `<td class="num hide-m" style="text-align:right"><b>${nt(tot.cost)}</b></td>` : ''}</tr>
    </tbody></table><p class="small muted" style="margin:8px 4px">點型號可查看該型號的每一台明細</p>` : '<div class="card empty">沒有符合的庫存</div>';
  $$('[data-model]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-sgb]')) return; stModel = tr.dataset.model; stView = 'list'; stStatus = 'all'; stockPage(); });
  $$('[data-sgb]').forEach(b => b.onclick = () => suggestBatch(b.dataset.sgb));
}
function drawStock() {
  if (stView === 'model') return drawModelSummary();
  const list = stockVisible();
  $('#stTbl').innerHTML = list.length ? `<table class="table"><thead><tr><th>商品</th><th class="hide-m">IMEI／序號</th><th class="hide-m">來源</th>${showCost() ? '<th class="hide-m">成本</th>' : ''}<th>建議售價</th><th>狀態</th></tr></thead><tbody>
    ${list.map(r => `<tr data-sku="${esc(r.sku)}"><td><b>${esc(r.model)}</b> <span class="sub">${esc([r.capacity, r.color].filter(Boolean).join(' '))}</span><div class="sub">${esc(r.sku)}・入庫 ${esc(r.inAt.slice(0, 10))}</div></td>
      <td class="num sub hide-m">${esc(r.serial || '—')}</td>
      <td class="hide-m"><span class="pill ${r.source === '宅配' ? '' : 'off'}">${esc(r.source)}</span></td>
      ${showCost() ? `<td class="num hide-m">${nt(r.cost)}</td>` : ''}
      <td>${r.status === '已售出' ? '<span class="sub">—</span>' : suggestHTML(r)}</td>
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
        <dt>狀況</dt><dd>${esc(r.notes || '—')}</dd>${showCost() ? `<dt>收購成本</dt><dd class="num">${nt(r.cost)}</dd>` : ''}<dt>入庫</dt><dd>${esc(r.inAt)}</dd>
        <dt>最後更新</dt><dd>${esc(r.updatedAt)}・${esc(r.updatedBy)}</dd></dl>
        ${r.photos.length ? `<div class="ph-grid" style="margin-top:10px">${r.photos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="商品照片"></div>`).join('')}</div>` : ''}</div>
      ${suggestCard(r)}
      ${can ? `<div class="card"><h3>庫存狀態</h3>
        <div class="chips">${['在庫', '整理中', '已售出'].map(s => `<label class="chip"><input type="radio" name="sst" value="${s}" ${r.status === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div>
        <div id="saleBox" ${r.status === '已售出' ? '' : 'hidden'} style="margin-top:12px"><div class="grid2">
          <label class="field"><span>銷售日期</span><input class="input" type="date" id="sDate" value="${esc(r.saleDate || localDay())}"></label>
          ${(() => { const manual = r.channel && !SALE_CHANNELS.includes(r.channel); return `<label class="field"><span>銷售管道</span>
            <select class="input" id="sChSel"><option value="" ${!r.channel ? 'selected' : ''}>請選擇</option>
              ${SALE_CHANNELS.map(c => `<option ${r.channel === c ? 'selected' : ''}>${c}</option>`).join('')}
              <option value="${IN_OTHER}" ${manual ? 'selected' : ''}>其他（自行填寫）</option></select>
            <input class="input" id="sCh" value="${esc(manual ? r.channel : '')}" placeholder="例：露天、Facebook、同業批發" style="margin-top:6px" ${manual ? '' : 'hidden'}></label>`; })()}
          <label class="field"><span>銷售價格（NT$）</span><input class="input num" id="sPrice" inputmode="numeric" value="${esc(r.salePrice ?? '')}"></label></div></div></div>` : ''}
    </div>
    ${can ? '<div class="d-foot"><span class="err" id="sErr" style="flex:1;margin:0"></span><button class="btn btn-dark" id="sSave">儲存</button></div>' : ''}`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  loadPhotos(d);
  bindSuggest(d, r, it => { stockDrawer(it); if ($('#stTbl')) drawStock(); });
  const ref = $('[data-ref]', d);
  ref.onclick = async e => {
    e.preventDefault();
    if (r.source === '宅配') { closeDrawer(); window.openAfterLoad = r.ref; filter = 'all'; location.hash = ''; return; }
    if (!intakes.length) { try { await loadIntakes(); } catch (x) { return toast(x.message); } }
    const o = intakes.find(x => x.id === r.ref); if (o) intakeDrawer(o);
  };
  if (!can) return;
  $$('input[name=sst]', d).forEach(x => x.onchange = () => { $('#saleBox').hidden = x.value !== '已售出'; });
  $('#sChSel').onchange = e => { const inp = $('#sCh'); inp.hidden = e.target.value !== IN_OTHER; if (!inp.hidden) inp.focus(); };
  $('#sSave').onclick = async () => {
    const status = $('input[name=sst]:checked', d).value;
    const chSel = $('#sChSel'), chOther = chSel && chSel.value === IN_OTHER;
    const sale = { date: $('#sDate').value, channel: chOther ? $('#sCh').value.trim() : (chSel ? chSel.value : ''), price: $('#sPrice').value.replace(/[^\d]/g, '') };
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
  const cost = showCost();
  const head = ['庫存編號', '來源', '來源單號', '入庫時間', '類別', '品名型號', '容量', '顏色', 'IMEI序號', '狀況', ...(cost ? ['收購成本'] : []), '建議售價現金', '建議售價刷卡', '庫存狀態', '銷售日期', '銷售管道', '銷售價格'];
  const rows = stockVisible().map(r => [r.sku, r.source, r.ref, r.inAt, r.category, r.model, r.capacity, r.color, r.serial, r.notes, ...(cost ? [r.cost] : []), r.suggestCash || '', r.suggestCard || '', r.status, r.saleDate, r.channel, r.salePrice ?? '']);
  const blob = new Blob(['﻿' + [head, ...rows].map(x => x.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `庫存盤點-${localDay()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ============================== 報表（日報表／日收購表／明細） ============================== */
let rpFrom = '', rpTo = '', rpView = 'daily', rpDetail = 'buy', rpData = null;
const dayOf = s => String(s || '').slice(0, 10);
const ymd = t => t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + n); return ymd(t); };
function rpPreset(k) {
  const t = localDay();
  if (k === 'yday') { const y = addDays(t, -1); return [y, y]; }
  if (k === 'week') { const dow = (new Date(t + 'T00:00:00').getDay() + 6) % 7; return [addDays(t, -dow), t]; }
  if (k === 'month') return [t.slice(0, 8) + '01', t];
  if (k === 'lmonth') { const last = addDays(t.slice(0, 8) + '01', -1); return [last.slice(0, 8) + '01', last]; }
  return [t, t];
}
function csvDownload(name, head, rows) {
  const cell = v => { const s = String(v ?? ''); return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'; };
  const blob = new Blob(['﻿' + [head, ...rows].map(x => x.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function reportPage(refresh) {
  if (!rpFrom) [rpFrom, rpTo] = rpPreset('today');
  if (refresh || !rpData) {
    app.innerHTML = pagesNav('report') + '<div class="spinner"></div>';
    try {
      const [st, it] = await Promise.all([api('stockList'), api('intakeList')]);
      let ords = orders;
      if (!ords.length) { try { ords = (await api('adminList')).orders; } catch (e) { ords = []; } }
      let reps = [];
      try { reps = (await api('repairList')).repairs; } catch (e) { reps = []; }
      rpData = { stock: st.items, intakes: it.intakes, orders: ords, repairs: reps };
      stockCache = st.items; intakes = it.intakes;
    } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('report') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const presets = [['today', '今天'], ['yday', '昨天'], ['week', '本週'], ['month', '本月'], ['lmonth', '上月']];
  const on = k => { const [f, t] = rpPreset(k); return f === rpFrom && t === rpTo; };
  app.innerHTML = `${pagesNav('report')}
    <div class="card rp-bar">
      <div class="tabs">${presets.map(([k, l]) => `<button data-pre="${k}" class="${on(k) ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="rp-dates"><input class="input" type="date" id="rpFrom" value="${rpFrom}"><span>至</span><input class="input" type="date" id="rpTo" value="${rpTo}"></div>
    </div>
    <div class="tabs st-view">${[['daily', '📅 日報表'], ['tx', '🧾 日收購表'], ['detail', '📋 明細']].map(([k, l]) => `<button data-rv="${k}" class="${rpView === k ? 'on' : ''}">${l}</button>`).join('')}
      <button id="rpCsv" style="margin-left:auto">⬇ 匯出 CSV</button></div>
    <div id="rpBody"></div>`;
  $$('[data-pre]').forEach(b => b.onclick = () => { [rpFrom, rpTo] = rpPreset(b.dataset.pre); reportPage(); });
  const setRange = () => { const f = $('#rpFrom').value, t = $('#rpTo').value; if (!f || !t) return; [rpFrom, rpTo] = f <= t ? [f, t] : [t, f]; reportPage(); };
  $('#rpFrom').onchange = setRange; $('#rpTo').onchange = setRange;
  $$('[data-rv]').forEach(b => b.onclick = () => { rpView = b.dataset.rv; reportPage(); });
  drawRpt();
}
/** 依期間整理：收購（依入庫日）、交易（依單號）、銷售（依銷售日） */
function rpCompute() {
  const { stock, intakes: ins, orders: ords } = rpData;
  const inR = d => d && d >= rpFrom && d <= rpTo;
  const buys = stock.filter(r => inR(dayOf(r.inAt))).sort((a, b) => a.inAt.localeCompare(b.inAt));
  const sales = stock.filter(r => r.status === '已售出' && inR(dayOf(r.saleDate))).sort((a, b) => String(a.saleDate).localeCompare(String(b.saleDate)));
  const txm = {};
  buys.forEach(r => {
    const t = txm[r.ref] = txm[r.ref] || { ref: r.ref, source: r.source, time: r.inAt, items: [], amount: 0 };
    t.items.push(r); t.amount += r.cost || 0; if (r.inAt < t.time) t.time = r.inAt;
  });
  const tx = Object.values(txm).map(t => {
    if (t.source === '門市') {
      const o = ins.find(x => x.id === t.ref) || {};
      return { ...t, seller: o.seller || '', payment: o.payment || '', staff: o.staff || '', remit: o.payment === '轉帳' ? o.remit : '' };
    }
    const o = ords.find(x => x.id === t.ref) || {};
    return { ...t, seller: o.name || '', payment: '轉帳', staff: t.items[0].updatedBy || '', remit: '已付款' };
  }).sort((a, b) => a.time.localeCompare(b.time));
  const fixes = (rpData.repairs || []).filter(o => o.status === '已取件' && inR(dayOf(o.pickupAt))).sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  return { buys, sales, tx, fixes };
}
function drawRpt() {
  const { buys, sales, tx, fixes } = rpCompute();
  const fixProfit = o => (o.fee || 0) - (o.partsCost || 0);
  const box = $('#rpBody');
  const range = rpFrom === rpTo ? rpFrom : `${rpFrom} ～ ${rpTo}`;
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  // 總覽
  const head = `<div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat" style="--c:#0A84FF"><div class="n num">${tx.length}</div><div class="l">收購筆數（${buys.length} 件）</div></div>
      <div class="stat" style="--c:#30D158"><div class="n num">${nt(sum(buys, r => r.cost))}</div><div class="l">收購金額</div></div>
      <div class="stat" style="--c:#1d1d1f"><div class="n num">${sales.length}</div><div class="l">售出件數</div></div>
      <div class="stat" style="--c:#BF5AF2"><div class="n num">${nt(sum(sales, r => r.salePrice))}</div><div class="l">銷售金額</div></div>
      <div class="stat" style="--c:#FF9F0A"><div class="n num">${nt(sum(sales, r => (r.salePrice || 0) - (r.cost || 0)))}</div><div class="l">銷售毛利</div></div>
      <div class="stat" style="--c:#64D2FF"><div class="n num">${nt(sum(fixes, o => o.fee))}</div><div class="l">維修收入（${fixes.length} 件）</div></div>
      <div class="stat" style="--c:#FF375F"><div class="n num">${nt(sum(fixes, fixProfit))}</div><div class="l">維修毛利</div></div>
    </div><p class="small muted" style="margin:-6px 4px 10px">期間：${esc(range)}・收購以入庫時間計（宅配為付款入庫日），銷售以銷售日期計</p>`;
  let html = '', csv = null;
  if (rpView === 'daily') {
    const days = [];
    const n = Math.round((new Date(rpTo) - new Date(rpFrom)) / 864e5);
    for (let i = n; i >= 0; i--) days.push(addDays(rpFrom, i));
    const rows = days.map(d => {
      const b = buys.filter(r => dayOf(r.inAt) === d), t = tx.filter(x => dayOf(x.time) === d), s = sales.filter(r => dayOf(r.saleDate) === d), f = fixes.filter(o => dayOf(o.pickupAt) === d);
      return { d, tx: t.length, items: b.length, store: sum(b.filter(r => r.source === '門市'), r => r.cost), home: sum(b.filter(r => r.source !== '門市'), r => r.cost),
        cash: sum(t.filter(x => x.payment === '現金'), x => x.amount), transfer: sum(t.filter(x => x.payment !== '現金'), x => x.amount),
        sold: s.length, rev: sum(s, r => r.salePrice), profit: sum(s, r => (r.salePrice || 0) - (r.cost || 0)),
        fix: f.length, fixRev: sum(f, o => o.fee), fixProfit: sum(f, fixProfit) };
    }).filter(r => n <= 62 || r.tx || r.sold || r.fix);
    const T = rows.reduce((a, r) => { Object.keys(r).forEach(k => { if (k !== 'd') a[k] = (a[k] || 0) + r[k]; }); return a; }, {});
    const m = v => v ? money(v) : '—';
    html = `<div class="rp-wrap"><table class="st-sum rp-tbl"><thead><tr><th>日期</th><th class="r">收購筆數</th><th class="r">件數</th><th class="r">門市收購</th><th class="r">宅配收購</th><th class="r">收購合計</th><th class="r">現金</th><th class="r">轉帳</th><th class="r">售出</th><th class="r">銷售金額</th><th class="r">銷售毛利</th><th class="r">維修件數</th><th class="r">維修收入</th><th class="r">維修毛利</th></tr></thead><tbody>
      ${rows.map(r => `<tr data-day="${r.d}" class="${r.tx || r.sold || r.fix ? '' : 'zero'}"><td><b>${r.d.slice(5)}</b> <span class="sub">${'日一二三四五六'[new Date(r.d + 'T00:00:00').getDay()]}</span></td><td class="r num">${r.tx || '—'}</td><td class="r num">${r.items || '—'}</td><td class="r num">${m(r.store)}</td><td class="r num">${m(r.home)}</td><td class="r num"><b>${m(r.store + r.home)}</b></td><td class="r num">${m(r.cash)}</td><td class="r num">${m(r.transfer)}</td><td class="r num">${r.sold || '—'}</td><td class="r num">${m(r.rev)}</td><td class="r num">${m(r.profit)}</td><td class="r num">${r.fix || '—'}</td><td class="r num">${m(r.fixRev)}</td><td class="r num">${m(r.fixProfit)}</td></tr>`).join('')}
      <tr class="st-tot"><td><b>合計</b></td><td class="r num"><b>${T.tx || 0}</b></td><td class="r num">${T.items || 0}</td><td class="r num">${money(T.store || 0)}</td><td class="r num">${money(T.home || 0)}</td><td class="r num"><b>${money((T.store || 0) + (T.home || 0))}</b></td><td class="r num">${money(T.cash || 0)}</td><td class="r num">${money(T.transfer || 0)}</td><td class="r num">${T.sold || 0}</td><td class="r num">${money(T.rev || 0)}</td><td class="r num"><b>${money(T.profit || 0)}</b></td><td class="r num">${T.fix || 0}</td><td class="r num">${money(T.fixRev || 0)}</td><td class="r num"><b>${money(T.fixProfit || 0)}</b></td></tr>
      </tbody></table></div><p class="small muted" style="margin:8px 4px">點日期可看當天的收購單</p>`;
    csv = [`日報表_${rpFrom}_${rpTo}.csv`, ['日期', '收購筆數', '收購件數', '門市收購', '宅配收購', '收購合計', '現金', '轉帳', '售出件數', '銷售金額', '銷售毛利', '維修件數', '維修收入', '維修毛利'],
      rows.slice().reverse().map(r => [r.d, r.tx, r.items, r.store, r.home, r.store + r.home, r.cash, r.transfer, r.sold, r.rev, r.profit, r.fix, r.fixRev, r.fixProfit])];
  } else if (rpView === 'tx') {
    const days = [...new Set(tx.map(x => dayOf(x.time)))].sort().reverse();
    html = days.length ? days.map(d => { const list = tx.filter(x => dayOf(x.time) === d).reverse(); return `<div class="rp-day"><div class="rp-dh"><b>${d}</b><span>${list.length} 筆・${list.reduce((t, x) => t + x.items.length, 0)} 件・NT$ ${money(sum(list, x => x.amount))}</span></div>
      <div class="rp-wrap"><table class="st-sum rp-tbl"><thead><tr><th>時間</th><th>單號</th><th>來源</th><th>出售人</th><th>商品</th><th class="r">金額</th><th>付款</th><th>經手人</th></tr></thead><tbody>
      ${list.map(x => `<tr data-ref="${esc(x.ref)}" data-src="${esc(x.source)}"><td class="num">${esc(x.time.slice(11, 16))}</td><td class="num">${esc(x.ref)}</td><td><span class="pill ${x.source === '宅配' ? '' : 'off'}">${esc(x.source)}</span></td><td>${esc(x.seller || '—')}</td>
        <td>${x.items.map(r => esc([r.model, r.capacity].filter(Boolean).join(' '))).join('<br>')}</td><td class="r num"><b>${money(x.amount)}</b></td><td>${esc(x.payment)}${x.remit && x.remit !== '已付款' ? `<div class="sub">${esc(x.remit)}</div>` : ''}</td><td>${esc(x.staff || '—')}</td></tr>`).join('')}
      </tbody></table></div></div>`; }).join('') : '<div class="card empty">這段期間沒有收購</div>';
    csv = [`日收購表_${rpFrom}_${rpTo}.csv`, ['日期時間', '單號', '來源', '出售人', '商品', '件數', '金額', '付款方式', '匯款狀態', '經手人'],
      tx.map(x => [x.time, x.ref, x.source, x.seller, x.items.map(r => [r.model, r.capacity, r.color].filter(Boolean).join(' ')).join('；'), x.items.length, x.amount, x.payment, x.remit, x.staff])];
  } else {
    html = `<div class="tabs" style="margin-bottom:10px">${[['buy', `收購明細（${buys.length}）`], ['sale', `銷售明細（${sales.length}）`], ['fix', `維修明細（${fixes.length}）`]].map(([k, l]) => `<button data-rd="${k}" class="${rpDetail === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (rpDetail === 'fix') {
      html += fixes.length ? `<div class="rp-wrap"><table class="st-sum rp-tbl"><thead><tr><th>取件時間</th><th>維修單</th><th>客戶</th><th>機型</th><th>維修項目</th><th class="r">實收</th><th>付款</th><th class="r">零件成本</th><th class="r">毛利</th></tr></thead><tbody>
        ${fixes.slice().reverse().map(o => `<tr data-fix="${esc(o.id)}"><td class="num">${esc(o.pickupAt)}</td><td class="num">${esc(o.id)}</td><td>${esc(o.customer)}</td><td><b>${esc(o.model)}</b></td><td class="sub">${esc(o.items.map(x => x.name).join('、'))}</td><td class="r num">${money(o.fee)}</td><td>${esc(o.payment || '—')}</td><td class="r num">${money(o.partsCost)}</td><td class="r num"><b>${money(fixProfit(o))}</b></td></tr>`).join('')}
        <tr class="st-tot"><td colspan="5"><b>合計 ${fixes.length} 件</b></td><td class="r num">${money(sum(fixes, o => o.fee))}</td><td></td><td class="r num">${money(sum(fixes, o => o.partsCost))}</td><td class="r num"><b>${money(sum(fixes, fixProfit))}</b></td></tr></tbody></table></div>` : '<div class="card empty">這段期間沒有完成取件的維修</div>';
      csv = [`維修明細_${rpFrom}_${rpTo}.csv`, ['取件時間', '維修單號', '客戶', '電話', '機型', 'IMEI序號', '維修項目', '實收', '付款方式', '零件', '零件成本', '毛利', '保固到期'],
        fixes.map(o => [o.pickupAt, o.id, o.customer, o.phone, [o.model, o.capacity, o.color].filter(Boolean).join(' '), o.serial, o.items.map(x => `${x.name} ${x.amount}`).join('；'), o.fee, o.payment, o.parts.map(p => p.name).join('；'), o.partsCost, fixProfit(o), o.warrantyEnd])];
    } else if (rpDetail === 'buy') {
      html += buys.length ? `<div class="rp-wrap"><table class="st-sum rp-tbl"><thead><tr><th>入庫時間</th><th>單號</th><th>來源</th><th>型號</th><th>規格</th><th>IMEI／序號</th><th>狀況</th><th class="r">成本</th><th>目前狀態</th></tr></thead><tbody>
        ${buys.slice().reverse().map(r => `<tr data-sku="${esc(r.sku)}"><td class="num">${esc(r.inAt)}</td><td class="num">${esc(r.ref)}</td><td>${esc(r.source)}</td><td><b>${esc(r.model)}</b></td><td class="sub">${esc([r.capacity, r.color].filter(Boolean).join(' '))}</td><td class="num sub">${esc(r.serial || '—')}</td><td class="sub">${esc(r.notes || '')}</td><td class="r num">${money(r.cost)}</td><td>${stockBadge(r)}</td></tr>`).join('')}
        <tr class="st-tot"><td colspan="7"><b>合計 ${buys.length} 件</b></td><td class="r num"><b>${money(sum(buys, r => r.cost))}</b></td><td></td></tr></tbody></table></div>` : '<div class="card empty">這段期間沒有收購</div>';
      csv = [`收購明細_${rpFrom}_${rpTo}.csv`, ['入庫時間', '庫存編號', '單號', '來源', '類別', '型號', '容量', '顏色', 'IMEI序號', '狀況', '成本', '目前狀態'],
        buys.map(r => [r.inAt, r.sku, r.ref, r.source, r.category, r.model, r.capacity, r.color, r.serial, r.notes, r.cost, r.status])];
    } else {
      html += sales.length ? `<div class="rp-wrap"><table class="st-sum rp-tbl"><thead><tr><th>銷售日期</th><th>型號</th><th>規格</th><th>IMEI／序號</th><th>管道</th><th class="r">成本</th><th class="r">售價</th><th class="r">毛利</th></tr></thead><tbody>
        ${sales.slice().reverse().map(r => { const p = (r.salePrice || 0) - (r.cost || 0); return `<tr data-sku="${esc(r.sku)}"><td class="num">${esc(r.saleDate)}</td><td><b>${esc(r.model)}</b><div class="sub">${esc(r.sku)}</div></td><td class="sub">${esc([r.capacity, r.color].filter(Boolean).join(' '))}</td><td class="num sub">${esc(r.serial || '—')}</td><td>${esc(r.channel || '—')}</td><td class="r num">${money(r.cost)}</td><td class="r num">${money(r.salePrice)}</td><td class="r num" style="color:${p < 0 ? 'var(--red, #e5484d)' : 'inherit'}"><b>${money(p)}</b></td></tr>`; }).join('')}
        <tr class="st-tot"><td colspan="5"><b>合計 ${sales.length} 件</b></td><td class="r num">${money(sum(sales, r => r.cost))}</td><td class="r num">${money(sum(sales, r => r.salePrice))}</td><td class="r num"><b>${money(sum(sales, r => (r.salePrice || 0) - (r.cost || 0)))}</b></td></tr></tbody></table></div>` : '<div class="card empty">這段期間沒有銷售</div>';
      csv = [`銷售明細_${rpFrom}_${rpTo}.csv`, ['銷售日期', '庫存編號', '型號', '容量', '顏色', 'IMEI序號', '銷售管道', '成本', '售價', '毛利', '來源', '來源單號'],
        sales.map(r => [r.saleDate, r.sku, r.model, r.capacity, r.color, r.serial, r.channel, r.cost, r.salePrice, (r.salePrice || 0) - (r.cost || 0), r.source, r.ref])];
    }
  }
  box.innerHTML = head + html;
  $('#rpCsv').onclick = () => csv && csvDownload(...csv);
  $$('[data-rd]', box).forEach(b => b.onclick = () => { rpDetail = b.dataset.rd; drawRpt(); });
  $$('tr[data-day]', box).forEach(tr => tr.onclick = () => { rpFrom = rpTo = tr.dataset.day; rpView = 'tx'; reportPage(); });
  $$('tr[data-sku]', box).forEach(tr => tr.onclick = () => stockDrawer(rpData.stock.find(r => r.sku === tr.dataset.sku)));
  $$('tr[data-fix]', box).forEach(tr => tr.onclick = () => repairDrawer(rpData.repairs.find(o => o.id === tr.dataset.fix)));
  $$('tr[data-ref]', box).forEach(tr => tr.onclick = () => {
    if (tr.dataset.src === '門市') { const o = rpData.intakes.find(x => x.id === tr.dataset.ref); if (o) intakeDrawer(o); }
    else { window.openAfterLoad = tr.dataset.ref; location.hash = ''; }
  });
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
