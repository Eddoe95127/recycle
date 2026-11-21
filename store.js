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

const isStoreRoute = page => ['intake', 'intake/new', 'stock', 'remit', 'prices'].includes(page);
function storeRoute(page) {
  $('#refresh').hidden = page === 'intake/new';
  if (page === 'intake/new' && P('create_intake')) return intakeForm();
  if (page === 'intake' && canStoreView()) { $('#refresh').onclick = () => intakePage(true); return intakePage(); }
  if (page === 'stock' && canStoreView()) { $('#refresh').onclick = () => stockPage(true); return stockPage(); }
  if (page === 'prices' && P('edit_prices')) { $('#refresh').onclick = () => pricesPage(true); return pricesPage(); }
  if (page === 'remit' && P('edit_payment')) { $('#refresh').onclick = () => remitPage(true); return remitPage(); }
  location.hash = '';
}
const canStoreView = () => ['create_intake', 'edit_stock', 'edit_payment', 'view_cost'].some(P);
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
        <dt>電子信箱</dt><dd>${esc(o.email || '未填')}${o.masked.email ? ' <span class="no-perm">🔒</span>' : ''}</dd>
        <dt>付款</dt><dd>${esc(o.payment)}</dd>
        ${o.payment === '轉帳' ? `<dt>收款帳戶</dt><dd class="num">${esc(o.bank)}<br>${esc(o.account)}${o.masked.account ? ' <span class="no-perm">🔒</span>' : ''}</dd><dt>匯款期限</dt><dd>${esc(o.period)}${o.payDate ? ' ' + esc(o.payDate) : ''}</dd>` : ''}
        ${o.remitAt ? `<dt>已匯款</dt><dd>${esc(o.remitAt)}・${esc(o.remitBy)}</dd>` : ''}
        <dt>合計</dt><dd class="num"><b>${nt(o.total)}</b></dd></dl></div>
      <div class="card"><h3>商品（${o.items.length}）</h3>
        ${o.items.map((it, i) => `<div style="padding:10px 0;border-top:${i ? '1px solid var(--line)' : '0'}">
          <b>${i + 1}. ${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</b> <span class="num" style="float:right">${nt(it.price)}</span>
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
    </div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  $$('[data-rc]', d).forEach(b => b.onclick = () => showReceipt(o, b.dataset.rc));
  loadPhotos(d);
  bindRemit(d, o, () => intakeDrawer(intakes.find(x => x.id === o.id)));
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
const newItem = () => ({ category: '手機', model: '', capacity: '', color: '', serial: '', base: '', price: '', notes: '', photos: [],
  grade: '', battery: '', checks: CHECK_ITEMS.map(c => ({ k: c.k, label: c.label, r: 'ok', note: '' })), deductions: [] });
/** 收購金額 = 基本收購價 − 扣減 */
const itemPrice = it => Math.max(0, numv(it.base) - (it.deductions || []).reduce((s, d) => s + numv(d.amount), 0));

/** 表單裡的「檢測評估」區塊（同宅配檢測報告） */
function evalBlock(it, i) {
  const bad = it.checks.filter(c => c.r === 'bad').length, na = it.checks.filter(c => c.r === 'na').length;
  return `<div class="eval-box">
    <div class="eval-h">檢測評估</div>
    <div class="grid2">
      <div class="field"><span>外觀等級</span><div class="chips">${['A', 'B', 'C', 'D'].map(g => `<label class="chip"><input type="radio" name="g${i}" data-grade value="${g}" ${it.grade === g ? 'checked' : ''}><span>${g} ${GRADE_TEXT[g]}</span></label>`).join('')}</div></div>
      <label class="field"><span>電池健康度（%）</span><input class="input num" data-f="battery" inputmode="numeric" maxlength="3" value="${esc(it.battery)}" placeholder="例：86"></label>
    </div>
    <details class="ck-wrap" data-ckwrap ${it._open ? 'open' : ''}><summary><b>功能檢測 ${it.checks.length} 項</b><span data-cksum class="tag ${bad ? 'bad' : 'ok'}">${bad ? bad + ' 項異常' : '全部正常'}${na ? `・${na} 項未檢測` : ''}</span></summary>
      <div style="text-align:right"><button type="button" class="link" data-allok style="font-size:13px">全部設為正常</button></div>
      ${it.checks.map((c, j) => `<div class="ck-row ${c.r}">
        <div class="ck-lbl">${esc(c.label)}</div>
        <div class="seg">${['ok', 'bad', 'na'].map(r => `<button type="button" class="${c.r === r ? 'on' : ''}" data-ck="${j}" data-r="${r}">${RES[r][0]}</button>`).join('')}</div>
        <input class="input ck-note" data-cknote="${j}" value="${esc(c.note)}" placeholder="${c.k === 'water' ? '例：泡水指示貼片正常（白色）' : '說明（選填）'}">
      </div>`).join('')}
    </details>
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
  const items = o.items.filter(it => Array.isArray(it.checks) && it.checks.length);
  if (!items.length) return '';
  return `<div class="in-eval${compact ? ' compact' : ''}"><h3 style="margin:${compact ? '14px 0 6px' : '0 0 8px'}">檢測評估報告</h3>
    ${items.map(it => {
      const bad = it.checks.filter(c => c.r === 'bad').length;
      const n = o.items.indexOf(it) + 1;
      return `<div class="rep-item">
        <div class="rep-title">${o.items.length > 1 ? n + '. ' : ''}${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</div>
        <div class="rep-sn">IMEI／序號：<b class="num">${esc(it.serial || '未填')}</b></div>
        <div class="rep-tags">
          ${it.grade ? `<span class="tag">外觀 ${esc(it.grade)}・${esc(GRADE_TEXT[it.grade] || '')}</span>` : ''}
          ${it.battery ? `<span class="tag">電池 ${esc(it.battery)}%</span>` : ''}
          <span class="tag ${bad ? 'bad' : 'ok'}">${bad ? bad + ' 項異常' : '功能檢測皆正常'}</span>
        </div>
        <div class="rep-checks">${it.checks.map(c => `<div class="chk ${c.r}"><span class="ico">${RES[c.r][2]}</span><span class="lbl">${esc(c.label)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span><span class="res">${RES[c.r][0]}</span></div>`).join('')}</div>
        ${it.price == null ? '' : `<table class="rep-price">
          <tr><td>基本收購價</td><td>NT$ ${money(it.base ?? it.price)}</td></tr>
          ${(it.deductions || []).map(d => `<tr class="minus"><td>${esc(d.reason)}</td><td>− NT$ ${money(d.amount)}</td></tr>`).join('')}
          <tr class="sub"><td>收購金額</td><td>NT$ ${money(it.price)}</td></tr></table>`}
      </div>`;
    }).join('')}</div>`;
}
const newDraft = () => ({ requestId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random(), seller: '', phone: '', email: '', payment: '', bank: '', account: '', period: IN_PERIODS[1], payDate: '',
  items: [newItem()], idPhotos: [], noticeAt: '', verified: false, agreed: false, sellerSign: '', staffSign: '' });

function intakeForm() {
  if (!dr || drDone) { dr = newDraft(); drStep = 1; drDone = null; }
  drawForm();
}
window.addEventListener('beforeunload', e => { if (dr && !drDone && location.hash === '#intake/new' && (dr.seller || dr.items[0].model)) { e.preventDefault(); e.returnValue = ''; } });

function drawForm() {
  if (drDone) return drawDone();
  const keepY = window.scrollY;
  const steps = ['商品與交易', '證件核對', '確認與簽名'];
  app.innerHTML = `${pagesNav('intake')}
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
      ${dr.email ? `<dt>寄送收購單</dt><dd>${esc(dr.email)}</dd>` : ''}
      <dt>付款</dt><dd>${esc(dr.payment)}${dr.payment === '轉帳' ? `　${esc(dr.bank)} ${esc(dr.account)}（${esc(dr.period === '指定日期' ? dr.payDate : dr.period)}）` : ''}</dd>
      ${dr.items.map((it, i) => { const bad = it.checks.filter(c => c.r === 'bad'); return `<dt>商品 ${i + 1}</dt><dd>${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}${it.serial ? `<br><span class="small muted">${esc(it.serial)}</span>` : ''}<span class="num" style="float:right">NT$ ${money(it.price)}</span>
        <div class="small muted" style="margin-top:2px">${[it.grade && '外觀 ' + it.grade + ' ' + GRADE_TEXT[it.grade], it.battery && '電池 ' + it.battery + '%', bad.length ? '異常：' + bad.map(c => c.label).join('、') : '功能檢測皆正常', it.deductions.filter(d => numv(d.amount)).map(d => `${d.reason} −${money(d.amount)}`).join('、')].filter(Boolean).map(esc).join('｜')}</div></dd>`; }).join('')}
      <dt>合計</dt><dd class="num"><b style="font-size:18px">NT$ ${money(sumDraft())}</b></dd></dl></div>
    <div class="card"><h3>二手商品收購條款</h3><ol class="terms-ol">${IN_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
      <label class="check"><input type="checkbox" id="agreeOk" ${dr.agreed ? 'checked' : ''}> 雙方已核對商品、金額與付款方式，同意上述條款，並以電子方式簽署 *</label></div>
    <div class="card"><h3>簽名</h3><div>
      <div><div style="display:flex;justify-content:space-between;align-items:center"><b>出售人簽名（請出售人在框內簽名）</b><button type="button" class="link" data-clear="sellerSign" style="font-size:14px">清除重簽</button></div>
        <canvas class="sig-pad sig-big" data-sig="sellerSign" width="1200" height="480"></canvas></div>
      <p class="small muted" style="margin:10px 0 0">經手人：<b style="color:var(--ink)">${esc(me.name)}</b>（依登入帳號自動記錄，不需簽名）</p></div>`;
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
      it.checks[+b.dataset.ck].r = b.dataset.r;
      const row = b.closest('.ck-row'); row.className = 'ck-row ' + b.dataset.r; $$('button', row).forEach(x => x.classList.toggle('on', x === b));
      ckSum();
    });
    $$('[data-cknote]', card).forEach(el => el.oninput = () => { it.checks[+el.dataset.cknote].note = el.value; });
    $('[data-allok]', card).onclick = () => { it.checks.forEach(c => { c.r = 'ok'; }); it._open = true; drawForm(); };
    $('[data-ckwrap]', card).ontoggle = e => { it._open = e.target.open; };
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
    const items = dr.items.map(({ _m, _est, _estSel, _open, ...it }) => ({ ...it, deductions: (it.deductions || []).map(({ _other, ...d }) => d) }));
    const r = await api('intakeCreate', { ...dr, items, account: dr.account.replace(/[\s-]/g, '') });
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
  it.grade = isNew ? 'A' : apIdx >= 0 ? 'ABCD'[Math.min(apIdx, 3)] : it.grade;
  it.checks.forEach(c => { c.r = 'ok'; c.note = ''; });
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
async function scanDevice(it) {
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
  $('[data-file]', w).onchange = e => { const f = e.target.files[0]; if (f) { close(); runOcr(f, it); } };
  const show = () => {
    Object.keys(found).forEach(k => $(`[data-c="${k}"]`, w).classList.toggle('ok', !!found[k]));
    $('[data-use]', w).disabled = !(found.imei || found.serial);
  };
  const finish = () => { const snap = last; close(); confirmOcr(it, { ...found }, snap); };
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
function confirmOcr(it, r, img) {
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
    w.remove(); drawForm(); toast('已帶入辨識結果');
  };
}

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
    close(); confirmOcr(it, r, null);
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
      ${o.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc([it.model, it.capacity, it.color].filter(Boolean).join(' '))}</td><td class="num">${esc(it.serial || '—')}</td><td>${esc(it.notes || '')}</td><td class="num" style="text-align:right">${it.price == null ? '—' : 'NT$ ' + money(it.price)}</td></tr>`).join('')}
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
let stockCache = null, stQuery = '', stStatus = 'active', stSource = '';
async function stockPage(refresh) {
  if (refresh || !stockCache) {
    app.innerHTML = pagesNav('stock') + '<div class="spinner"></div>';
    try { stockCache = (await api('stockList')).items; } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('stock') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const active = stockCache.filter(r => r.status !== '已售出');
  const month = localDay().slice(0, 7);
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
  const cost = P('view_cost');
  const head = ['庫存編號', '來源', '來源單號', '入庫時間', '類別', '品名型號', '容量', '顏色', 'IMEI序號', '狀況', ...(cost ? ['收購成本'] : []), '庫存狀態', '銷售日期', '銷售管道', '銷售價格'];
  const rows = stockVisible().map(r => [r.sku, r.source, r.ref, r.inAt, r.category, r.model, r.capacity, r.color, r.serial, r.notes, ...(cost ? [r.cost] : []), r.status, r.saleDate, r.channel, r.salePrice ?? '']);
  const blob = new Blob(['﻿' + [head, ...rows].map(x => x.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `庫存盤點-${localDay()}.csv`; a.click();
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

/* ============================== 線上估價表（後台） ============================== */
let pr = null, prDirty = false, prFilter = '';
window.addEventListener('beforeunload', e => { if (prDirty && location.hash === '#prices') { e.preventDefault(); e.returnValue = ''; } });
async function pricesPage(refresh) {
  if (prDirty && refresh && !(await ask('有尚未儲存的修改，確定要重新載入？', '重新載入'))) return;
  app.innerHTML = pagesNav('prices') + '<div class="spinner"></div>';
  try { pr = await api('adminPrices'); prDirty = false; } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('prices') + `<div class="card empty">${esc(e.message)}</div>`; return; }
  drawPrices();
}
function drawPrices() {
  const q = prFilter.trim().toLowerCase();
  const filled = pr.rows.filter(r => Number(r.price) > 0 || Number(r.newPrice) > 0).length;
  pr.rules.accessories = pr.rules.accessories || [];
  const ruleRows = (key, withInspect) => pr.rules[key].map((x, i) => `<div class="pr-rule" data-rk="${key}" data-ri="${i}">
      <input class="input" data-rf="label" value="${esc(x.label)}" placeholder="選項名稱">
      ${key === 'battery' ? `<label class="pr-pct"><span>下限</span><input class="input num" data-rf="min" inputmode="numeric" value="${esc(x.min ?? '')}"><span>%</span></label>` : ''}
      ${key === 'accessories' ? '' : `<label class="pr-pct">${key === 'battery' ? '<span>未達標準</span>' : ''}<input class="input num" data-rf="pct" inputmode="numeric" value="${esc(x.pct ?? '')}" ${x.inspect ? 'disabled' : ''}><span>${key === 'issues' ? '% 扣' : '%'}</span></label>`}
      ${withInspect ? `<label class="check small"><input type="checkbox" data-rf="inspect" ${x.inspect ? 'checked' : ''}> 需檢測</label>` : ''}
      <button type="button" class="ph-del static" data-rdel aria-label="刪除">✕</button></div>`).join('') +
    `<button type="button" class="link" data-radd="${key}" style="font-size:13px">＋ 新增選項</button>`;
  app.innerHTML = `${pagesNav('prices')}
    <div class="card"><h3>線上估價表 <span class="small muted" style="font-weight:400">已填價格 ${filled} / ${pr.rows.length} 列（空白的不會顯示給客戶）</span></h3>
      <p class="small muted" style="margin:0">「最高收購價」＝外觀無刮傷、電池 90% 以上、功能都正常的價格。客戶看到的預估價＝最高收購價 × 外觀% × 電池% ×（1 − 故障扣%），電池達到型號要求不扣；再往下顯示 ${esc(pr.rules.spread)}% 的區間。</p></div>
    <div class="grid2 pr-grid">
      <div class="card"><h3>價格</h3>
        <div class="toolbar" style="margin-bottom:8px"><input class="input" id="prQ" placeholder="搜尋型號" value="${esc(prFilter)}"><button class="btn btn-ghost btn-sm" id="prAdd">＋ 新增一列</button></div>
        <table class="table pr-table"><thead><tr><th>類別</th><th>型號</th><th>容量</th><th>最高收購價</th><th>全新價</th><th>電池要求%</th><th>配件扣款</th><th>配件項目</th><th></th></tr></thead><tbody>
        ${pr.rows.map((r, i) => !q || (r.model + ' ' + r.capacity + ' ' + r.category).toLowerCase().includes(q) ? `<tr data-pi="${i}" class="${i && pr.rows[i - 1].model === r.model ? 'same' : ''}">
          <td><select class="input" data-pf="category">${[...new Set(['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods／配件', 'Samsung', 'OPPO', 'Google', '其他', ...pr.rows.map(x => x.category)])].map(c => `<option ${r.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
          <td><input class="input" data-pf="model" value="${esc(r.model)}"></td>
          <td><input class="input" data-pf="capacity" value="${esc(r.capacity)}" style="max-width:90px"></td>
          <td><input class="input num" data-pf="price" inputmode="numeric" value="${esc(r.price || '')}" placeholder="未填" style="max-width:110px"></td>
          <td><input class="input num" data-pf="newPrice" inputmode="numeric" value="${esc(r.newPrice || '')}" placeholder="—" title="全新未拆封收購價（空白＝不收全新）" style="max-width:100px"></td>
          <td><input class="input num" data-pf="battery" inputmode="numeric" value="${esc(r.battery ?? '')}" placeholder="${esc(pr.rules.batteryDefault ?? 90)}" title="0＝不看電池；空白＝預設" style="max-width:70px"></td>
          <td><input class="input num" data-pf="acc" inputmode="numeric" value="${esc(r.acc || '')}" placeholder="0" title="每缺一項盒子／配件扣多少" style="max-width:80px"></td>
          <td><input class="input" data-pf="accItems" value="${esc(r.accItems || '')}" placeholder="全部" title="只扣哪些項目（用逗號分隔），空白＝全部" style="max-width:130px"></td>
          <td><button type="button" class="ph-del static" data-pdel="${i}" aria-label="刪除">✕</button></td></tr>` : '').join('')}
        </tbody></table></div>
      <div>
        <div class="card"><h3>外觀</h3>${ruleRows('appearance')}</div>
        <div class="card"><h3>電池健康度</h3><p class="small muted" style="margin:-4px 0 10px">客戶選的級距「下限」達到該型號的「電池要求%」就不扣；未達才乘「未達標準 %」。型號的電池要求填在左邊價格表（0＝不看電池，空白＝預設 ${esc(pr.rules.batteryDefault ?? 90)}%）。</p>${ruleRows('battery')}</div>
        <div class="card"><h3>盒子與配件</h3><p class="small muted" style="margin:-4px 0 10px">客戶勾選缺少的項目，每項扣該型號的「配件扣款」金額。左邊「配件項目」空白＝下面全部項目都算；只扣某幾項就填項目名稱（例：沒有原廠盒子）；各項金額不同可寫「沒有原廠盒子:1500,沒有原廠充電器:2000」；填「無」＝不扣。iPhone／iPad／Mac 以外的類別不問配件。</p>${ruleRows('accessories')}</div>
        <div class="card"><h3>故障</h3><p class="small muted" style="margin:-4px 0 10px">勾「需檢測」＝不顯示價格，改顯示「需實際檢測後報價」</p>${ruleRows('issues', true)}</div>
        <div class="card"><h3>其他</h3>
          <div class="grid2"><label class="field"><span>價格區間（%）</span><input class="input num" id="prSpread" inputmode="numeric" value="${esc(pr.rules.spread)}" style="max-width:100px"></label>
          <label class="field"><span>預設電池要求（%）</span><input class="input num" id="prBatDef" inputmode="numeric" value="${esc(pr.rules.batteryDefault ?? 90)}" style="max-width:100px"></label></div>
          <label class="field" style="margin:0"><span>給客戶的說明</span><textarea class="input" id="prNote">${esc(pr.rules.note)}</textarea></label></div>
      </div>
    </div>
    <div class="in-foot"><span class="err" id="prErr" style="flex:1;margin:0">${prDirty ? '有尚未儲存的修改' : ''}</span>
      <a class="btn btn-ghost" href="index.html#/estimate" target="_blank">看客戶畫面 ↗</a><button class="btn btn-dark" id="prSave">儲存並上線</button></div>`;
  const dirty = () => { prDirty = true; $('#prErr').textContent = '有尚未儲存的修改'; };
  $('#prQ').oninput = e => { prFilter = e.target.value; const pos = e.target.selectionStart; drawPrices(); const n = $('#prQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-pi]').forEach(tr => { const r = pr.rows[+tr.dataset.pi]; $$('[data-pf]', tr).forEach(el => el.oninput = el.onchange = () => { r[el.dataset.pf] = ['price', 'battery', 'acc', 'newPrice'].includes(el.dataset.pf) ? el.value.replace(/[^\d]/g, '') : el.value; dirty(); }); });
  $$('[data-pdel]').forEach(b => b.onclick = () => { pr.rows.splice(+b.dataset.pdel, 1); prDirty = true; drawPrices(); });
  $('#prAdd').onclick = () => { pr.rows.unshift({ category: 'iPhone', model: prFilter || '', capacity: '', price: '', note: '' }); prDirty = true; drawPrices(); $('[data-pi="0"] [data-pf=model]')?.focus(); };
  $$('[data-rk]').forEach(row => {
    const x = pr.rules[row.dataset.rk][+row.dataset.ri];
    $$('[data-rf]', row).forEach(el => el.oninput = el.onchange = () => {
      if (el.dataset.rf === 'inspect') { x.inspect = el.checked; prDirty = true; drawPrices(); return; }
      x[el.dataset.rf] = ['pct', 'min'].includes(el.dataset.rf) ? el.value.replace(/[^\d]/g, '') : el.value; dirty();
    });
    $('[data-rdel]', row).onclick = () => { pr.rules[row.dataset.rk].splice(+row.dataset.ri, 1); prDirty = true; drawPrices(); };
  });
  $$('[data-radd]').forEach(b => b.onclick = () => { pr.rules[b.dataset.radd].push(b.dataset.radd === 'accessories' ? { label: '' } : b.dataset.radd === 'battery' ? { label: '', min: 0, pct: 80 } : { label: '', pct: b.dataset.radd === 'issues' ? 10 : 90 }); prDirty = true; drawPrices(); });
  $('#prSpread').oninput = e => { pr.rules.spread = e.target.value.replace(/[^\d]/g, ''); dirty(); };
  $('#prBatDef').oninput = e => { pr.rules.batteryDefault = e.target.value.replace(/[^\d]/g, ''); dirty(); };
  $('#prNote').oninput = e => { pr.rules.note = e.target.value; dirty(); };
  $('#prSave').onclick = async () => {
    const b = $('#prSave'); b.disabled = true; $('#prErr').textContent = '儲存中…';
    try { pr = await api('adminSavePrices', { rows: pr.rows, rules: pr.rules }); prDirty = false; toast('已儲存，客戶網站 10 分鐘內更新'); drawPrices(); }
    catch (e) { if (e.auth) return start(); $('#prErr').textContent = e.message; b.disabled = false; }
  };
}
