/* ============================== 門市維修作業 ==============================
 * 維修單：送修登記（客人簽名）→ 進度（待維修／維修中／待取件）→ 取件（收款、客人簽名、保固起算）
 * 保固查詢：輸入 IMEI／電話／姓名，找出所有維修紀錄與保固狀態
 * 依賴 store.js 的共用元件：pagesNav、pickField、sigPad、scanDevice、canSharePdf、downloadFile、showCost…
 */
const REPAIR_ITEMS = ['更換螢幕', '更換電池', '更換尾插（充電孔）', '更換背蓋', '更換後鏡頭', '更換前鏡頭', '更換喇叭', '更換聽筒', '更換按鍵／排線',
  'Face ID 維修', '主機板維修', '進水處理', '軟體／刷機', '清潔保養', '檢測費'];
const REPAIR_WARRANTY = [[0, '無保固'], [30, '30 天'], [90, '90 天'], [180, '180 天'], [365, '1 年']];
const REPAIR_ISSUES = ['螢幕破裂', '螢幕顯示異常', '觸控失靈', '電池耗電快／膨脹', '無法充電', '無法開機', '相機異常', '喇叭／麥克風異常', 'Face ID 失效', '進水', '按鍵失靈', '訊號異常'];
const REPAIR_COND = ['螢幕刮傷', '邊框磕碰', '背蓋破裂', '機身彎曲', '有貼保護貼', '附充電線', '附保護殼', '未附任何配件'];
const REPAIR_PROMISE = ['今天', '明天', '3 天內', '待料（另行通知）'];
const REPAIR_PAY = ['現金', '轉帳', '刷卡'];
const REPAIR_ENTITY = '佛斯特先生獨立維修中心-永和店（信宇通訊有限公司）';
const REPAIR_TERMS = [
  ['資料備份', '送修前請自行備份資料並記下解鎖密碼。維修過程可能需要重置、刷機或更換零件，資料遺失本店恕不負責。'],
  ['關閉「尋找」', '更換原廠零件或需軟體校正的項目，請於送修前關閉「尋找我的 iPhone／iPad」；無法關閉時，部分項目可能無法進行。'],
  ['檢測與報價', '報價以門市實際檢測為準。拆機後如發現其他故障需追加費用，本店會先聯繫並取得您的同意才進行。'],
  ['檢測費', '選擇「檢測後另行報價」者，如之後確認後維修報價，則不收取檢測費；決定不維修則收取本單所列的檢測費。'],
  ['零件說明', '依您選擇的零件（原廠／副廠／BSMI 認證電池）施工。更換非原廠零件後，系統可能顯示「未知零件」等訊息，屬正常現象。'],
  ['原廠保固與防水', '本店為獨立維修中心，非 Apple 授權服務供應商。裝置經拆機後將失去原廠保固與原有防水性能，且無法恢復至送修前狀態，如有疑慮請勿送修。'],
  ['維修風險', '曾進水、摔落、主機板受損或曾經他處拆修的裝置，拆修過程可能出現其他功能異常或無法開機；本店會事先告知風險，並經您同意後施工。'],
  ['保固範圍', '保固自取件日起算，以本單所列天數為準，僅限本次更換的零件與施工項目。人為損壞、摔落、擠壓、進水、自行或他處拆修，不在保固範圍內。'],
  ['取件與付款', '完修後以電話或 Email 通知，請於 30 日內攜帶本單或報上電話取件，並於取件時付清費用（現金、轉帳、刷卡）。逾期未取件，本店得酌收保管費。'],
  ['個人資料', '佛斯特先生獨立維修中心-永和店（信宇通訊有限公司）僅於本次維修、保固查詢與聯繫範圍內蒐集、處理及利用您的資料，並妥善保管。']
];
const RP_STATE_COLOR = { '待維修': 'warn', '維修中': '', '待取件': 'ok', '已取件': 'off', '無法維修': 'off', '已取消': 'off' };

const REPAIR_EXTRA = ['檢測費', '清潔保養', '軟體／刷機', '資料備份轉移', '進水處理', '主機板維修'];
const REPAIR_PARTS = ['原廠螢幕', '副廠螢幕', '原廠拆機螢幕', '電池（BSMI）', '尾插排線', '後相機模組', '前相機模組', '背蓋玻璃', '聽筒', '揚聲器', '按鍵排線', 'SSD', '鍵盤', '觸控板'];
const REPAIR_NOTES = ['螢幕密碼已告知', '已關閉尋找', '客人已備份資料', '零件待訂', '需追加報價', '客人自備零件', '急件'];
/** 型號的維修價目：[[項目, 價格], …] */
const priceListOf = (cat, model) => ((typeof REPAIR_PRICES !== 'undefined' && REPAIR_PRICES[cat]) || {})[model] || [];
const repairModelsOf = cat => Object.keys((typeof REPAIR_PRICES !== 'undefined' && REPAIR_PRICES[cat]) || {});
let repairs = [], rpQuery = '', rpStatus = 'open', rp = null, rpBusy = false, rpDone = null;
async function loadRepairs() { ensureRepairPrices(); repairs = (await api('repairList')).repairs; }

/** 保固狀態 */
function warrantyOf(o) {
  if (o.status !== '已取件') return null;
  if (!o.warrantyEnd) return { on: false, text: '無保固' };
  return localDay() <= o.warrantyEnd ? { on: true, text: `保固中（至 ${o.warrantyEnd}）` } : { on: false, text: `已過保（${o.warrantyEnd} 到期）` };
}
const wBadge = o => { const w = warrantyOf(o); return w ? `<span class="pill ${w.on ? 'ok' : 'off'}">${esc(w.text)}</span>` : ''; };
const rpBadge = o => `<span class="pill ${RP_STATE_COLOR[o.status] || ''}">${esc(o.status)}</span>`;
const rpDev = o => [o.model, o.capacity, o.color].filter(Boolean).join(' ');
const normSn = v => String(v || '').replace(/[\s-]/g, '').toUpperCase();
const normPhone = v => String(v || '').replace(/\D/g, '');

/* ---------- 列表＋保固查詢 ---------- */
async function repairPage(refresh) {
  if (refresh || !repairs.length) {
    app.innerHTML = pagesNav('repair') + '<div class="spinner"></div>';
    try { await loadRepairs(); } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('repair') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  const today = localDay();
  const cnt = s => repairs.filter(o => o.status === s).length;
  app.innerHTML = `${pagesNav('repair')}
    <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
      <div class="stat" style="--c:#FF9F0A"><div class="n num">${cnt('待維修')}</div><div class="l">待維修</div></div>
      <div class="stat" style="--c:#0A84FF"><div class="n num">${cnt('維修中')}</div><div class="l">維修中</div></div>
      <div class="stat" style="--c:#30D158"><div class="n num">${cnt('待取件') + cnt('無法維修')}</div><div class="l">待取件${cnt('無法維修') ? `（含無法維修 ${cnt('無法維修')}）` : ''}</div></div>
      <div class="stat" style="--c:#1d1d1f"><div class="n num">${repairs.filter(o => o.status === '已取件' && (o.pickupAt || '').slice(0, 10) === today).length}</div><div class="l">今日取件</div></div>
    </div>
    ${P('repair') ? '<a class="btn btn-dark btn-block" href="#repair/new" style="margin-bottom:14px">＋ 新增維修單</a>' : ''}
    <div class="toolbar">
      <input class="input" id="rpQ" placeholder="搜尋 手機號碼／IMEI／序號／姓名／單號（保固查詢）" value="${esc(rpQuery)}">
      <div class="tabs">${[['open', '處理中'], ['待取件', '待取件'], ['已取件', '已取件'], ['all', '全部']].map(([k, l]) => `<button data-rs="${k}" class="${rpStatus === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    </div><div id="rpTbl"></div>`;
  $('#rpQ').oninput = e => { rpQuery = e.target.value; drawRepairList(); };
  $$('[data-rs]').forEach(b => b.onclick = () => { rpStatus = b.dataset.rs; repairPage(); });
  drawRepairList();
}
function repairMatches(o, q) {
  if (!q) return true;
  const n = normSn(q), p = normPhone(q);
  return (n.length >= 4 && normSn(o.serial).includes(n)) || (p.length >= 4 && normPhone(o.phone).includes(p))
    || [o.id, o.customer, o.model].join(' ').toLowerCase().includes(q.toLowerCase());
}
function drawRepairList() {
  const q = rpQuery.trim();
  const list = repairs.filter(o => repairMatches(o, q) && (q || rpStatus === 'all' || (rpStatus === 'open' ? ['待維修', '維修中', '待取件', '無法維修'].includes(o.status) : rpStatus === '待取件' ? ['待取件', '無法維修'].includes(o.status) : o.status === rpStatus)));
  $('#rpTbl').innerHTML = (q ? `<p class="small muted" style="margin:0 4px 8px">搜尋「${esc(q)}」：找到 ${list.length} 筆維修紀錄（含所有狀態）</p>` : '')
    + (list.length ? `<table class="table"><thead><tr><th>維修單</th><th>客戶</th><th>機型／項目</th><th>狀態</th></tr></thead><tbody>
    ${list.map(o => `<tr data-rid="${esc(o.id)}"><td><b class="num">${esc(o.id)}</b><div class="sub">${esc(o.createdAt.slice(0, 16))}</div></td>
      <td>${esc(o.customer)}<div class="sub num">${esc(o.phone)}</div></td>
      <td><b>${esc(rpDev(o))}</b>${o.serial ? `<div class="sub num">${esc(o.serial)}</div>` : ''}<div class="sub">${esc(rpItemText(o))}</div></td>
      <td>${rpBadge(o)}${wBadge(o) ? '<div style="margin-top:4px">' + wBadge(o) + '</div>' : ''}${o.promise && !['已取件', '已取消'].includes(o.status) ? `<div class="sub">預計：${esc(o.promise)}</div>` : ''}</td></tr>`).join('')}
    </tbody></table>` : `<div class="card empty">${q ? '查無維修紀錄' : '目前沒有維修單'}</div>`);
  const isPhone = /^0\d{3,9}$/.test(q.replace(/[\s-]/g, ''));
  if (isPhone && P('repair')) {
    $('#rpTbl').insertAdjacentHTML('beforeend', `<p style="margin:8px 4px;text-align:center"><button class="${list.length ? 'link' : 'btn btn-dark'}" id="rpNewPhone">＋ 用 ${esc(q)} ${list.length ? '再' : ''}新增維修單</button></p>`);
    $('#rpNewPhone').onclick = () => {
      const last = list[0] || {}; // 老客人：帶入上次的姓名與信箱
      if (!rp || rpDone) rp = newRepair();
      if (!rp.phone) rp.phone = q.replace(/[\s-]/g, '');
      if (!rp.customer && last.customer) rp.customer = last.customer;
      if (!rp.email && last.email) rp.email = last.email;
      location.hash = '#repair/new';
    };
  }
  $$('[data-rid]').forEach(tr => tr.onclick = () => repairDrawer(repairs.find(o => o.id === tr.dataset.rid)));
}

/* ---------- 新增維修單 ---------- */
const newRepair = () => ({ requestId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random(), customer: '', phone: '', email: '',
  category: '手機', model: '', capacity: '', color: '', serial: '', issue: '', condition: '', photos: [],
  items: [{ name: '', amount: '', warranty: 90 }], inspect: false, inspectFee: '', promise: '', note: '', agreed: false, dropSign: '', _m: {} });
const INSPECT_NOTE = '如之後確認後維修報價，則不收取檢測費';
/** 列表、紀錄上的項目文字 */
const rpItemText = o => o.items.map(x => x.name).join('、') || (o.inspect ? '檢測後另行報價' : o.issue);
async function repairForm() {
  await ensureRepairPrices();
  if (!rp) rp = newRepair();
  rpDone = null;
  if (!repairs.length) { try { await loadRepairs(); } catch (e) { /* 查不到歷史紀錄不影響登記 */ } }
  drawRepairForm();
}
function rpHistory() {
  const sn = normSn(rp.serial), ph = normPhone(rp.phone);
  if (sn.length < 6 && ph.length < 8) return [];
  return repairs.filter(o => (sn.length >= 6 && normSn(o.serial) === sn) || (ph.length >= 8 && normPhone(o.phone) === ph));
}
function rpHistoryHTML() {
  const h = rpHistory();
  if (!h.length) return '';
  const inW = h.filter(o => (warrantyOf(o) || {}).on);
  return `<div class="card rp-hist ${inW.length ? 'warn' : ''}"><b>${inW.length ? '⚠️ 這台／這位客人有保固中的維修紀錄' : '📋 找到過去的維修紀錄'}</b>
    ${h.slice(0, 5).map(o => `<div class="rp-hrow" data-rid="${esc(o.id)}"><span class="num">${esc(o.id)}</span> ${esc(rpDev(o))}・${esc(rpItemText(o))} ${rpBadge(o)} ${wBadge(o)}</div>`).join('')}
    ${inW.length ? '<p class="small" style="margin:6px 0 0">如果是同一個項目再故障，請確認是否屬於保固範圍。</p>' : ''}</div>`;
}
function rpTotal() { return rp.items.reduce((t, x) => t + numv(x.amount), 0); }
function drawRepairForm() {
  const keepY = window.scrollY, same = drawRepairForm._rp === rp;
  const chipToggle = (key, list) => `<div class="chips small-chips">${list.map(n => `<button type="button" class="chip-btn" data-add-${key}="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
  app.innerHTML = `${pagesNav('repair/new')}<div class="in-wrap">
    <div class="card"><h3>客戶</h3>
      <div class="grid2">
        <label class="field"><span>姓名 *</span><input class="input" data-r="customer" value="${esc(rp.customer)}" autocomplete="off"></label>
        <label class="field"><span>電話 *</span><input class="input num" data-r="phone" value="${esc(rp.phone)}" type="tel" inputmode="tel" placeholder="09xxxxxxxx"></label>
      </div>
      <label class="field"><span>電子信箱</span><input class="input" data-r="email" value="${esc(rp.email)}" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="選填，填寫後收件、完修、取件都會自動寄信通知"></label>
    </div>
    <div id="rpHist">${rpHistoryHTML()}</div>
    <div class="card"><h3>裝置</h3>
      <div class="chips" style="margin-bottom:10px">${Object.keys(IN_CATS).map(c => `<label class="chip"><input type="radio" name="rpcat" data-rcat value="${c}" ${rp.category === c ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div>
      <div class="grid2">
        ${repairModelsOf(rp.category).length ? pickField('型號 *', 'data-rf="model"', rp.model, repairModelsOf(rp.category), rp._m.model, '輸入完整型號') : `<label class="field"><span>型號 *</span><input class="input" data-rf="model" value="${esc(rp.model)}" placeholder="例：AirPods Pro 2、Switch"></label>`}
        ${pickField('容量／規格', 'data-rf="capacity"', rp.capacity, rp.category === '筆電' ? [] : IN_CAPS, rp._m.capacity)}
        ${pickField('顏色', 'data-rf="color"', rp.color, ['手機', '平板', '筆電'].includes(rp.category) ? colorsFor(rp.model) : IN_COLORS, rp._m.color)}
      </div>
      <label class="field"><span style="display:flex;justify-content:space-between;align-items:center">IMEI／序號
        <button type="button" class="link" style="font-size:14px" id="rpScan">📷 掃描自動辨識</button></span>
        <input class="input num" data-r="serial" value="${esc(rp.serial)}" autocomplete="off" spellcheck="false"></label>
    </div>
    <div class="card"><h3>故障與外觀</h3>
      <div class="field"><span>故障描述 *</span>${chipToggle('issue', REPAIR_ISSUES)}
        <textarea class="input" data-r="issue" style="margin-top:8px" placeholder="客人描述的狀況">${esc(rp.issue)}</textarea></div>
      <div class="field"><span>外觀與附帶配件</span>${chipToggle('cond', REPAIR_COND)}
        <textarea class="input" data-r="condition" style="margin-top:8px" placeholder="收件時的外觀狀況、附帶的配件">${esc(rp.condition)}</textarea></div>
      <div class="field"><span>收件照片（最多 8 張）</span>
        <div class="ph-grid">${rp.photos.map((p, j) => `<div class="ph"><img src="${p}" alt="收件照片"><button class="ph-del" data-rdelph="${j}" aria-label="刪除">✕</button></div>`).join('')}
          ${rp.photos.length < 8 ? `<label class="ph-add">📷 拍照<input type="file" accept="image/*" capture="environment" hidden data-rph></label><label class="ph-add">＋ 相簿<input type="file" accept="image/*" multiple hidden data-rph></label>` : ''}</div></div>
    </div>
    <div class="card"><h3>維修項目與報價</h3>
      <p class="small muted" style="margin:-4px 0 10px">${priceListOf(rp.category, rp.model).length ? `已載入 ${esc(rp.model)} 的官網維修價目，選項目會自動帶入價格` : '先選型號會自動帶入官網價目；不確定的話可以先留空，檢測後再補'}</p>
      <label class="check rp-inspect"><input type="checkbox" id="rpInspect" ${rp.inspect ? 'checked' : ''}> <b>檢測後再另行報價</b></label>
      ${rp.inspect ? `<div class="rp-inspect-box">
        <label class="field" style="margin:0"><span>檢測費（NT$）</span><input class="input num" data-r="inspectFee" inputmode="numeric" value="${esc(rp.inspectFee)}" placeholder="0"></label>
        <p class="small" style="margin:6px 0 0;color:#8a5300">※ ${INSPECT_NOTE}</p></div>
        <p class="small muted" style="margin:10px 0 6px">已知的維修項目可以先填（選填）：</p>` : ''}
      ${rpItemsEditor(rp.items, 'f', priceListOf(rp.category, rp.model))}
      <div class="field" style="margin-top:12px"><span>預計完成</span><div class="chips">${REPAIR_PROMISE.map(p => `<label class="chip"><input type="radio" name="rppro" data-rpro value="${p}" ${rp.promise === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div></div>
      <div class="field"><span>內部備註</span>${chipToggle('note', REPAIR_NOTES)}<input class="input" data-r="note" value="${esc(rp.note)}" style="margin-top:8px" placeholder="例：螢幕密碼已告知、零件待訂"></div>
    </div>
    <div class="card"><h3>維修條款</h3><ol class="terms-ol">${REPAIR_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
      <label class="check"><input type="checkbox" id="rpAgree" ${rp.agreed ? 'checked' : ''}> 客人已確認故障描述、報價與上述條款，並以電子方式簽署 *</label></div>
    <div class="card"><h3>送修簽名</h3>
      <div style="display:flex;justify-content:space-between;align-items:center"><b>客人簽名（請客人在框內簽名）</b><button type="button" class="link" id="rpClear" style="font-size:14px">清除重簽</button></div>
      <canvas class="sig-pad sig-big" id="rpSign" width="1200" height="480"></canvas>
      <p class="small muted" style="margin:10px 0 0">收件人員：<b style="color:var(--ink)">${esc(me.name)}</b></p></div>
    <div class="in-foot"><span class="err" id="rpErr" style="flex:1;margin:0"></span>
      <a class="btn btn-ghost" href="#repair">取消</a><button class="btn btn-dark" id="rpSubmit">建立維修單</button></div>
  </div>`;
  bindRepairForm();
  window.scrollTo(0, same ? keepY : 0);
  drawRepairForm._rp = rp;
}
/** 維修項目編輯（新增表單 f／抽屜 d 共用） */
function rpItemsEditor(items, ns, prices = []) {
  const names = prices.length ? [...prices.map(p => p[0]), ...REPAIR_EXTRA.filter(n => !prices.some(p => p[0] === n))] : REPAIR_ITEMS;
  const priceOf = n => (prices.find(p => p[0] === n) || [])[1];
  return `<div data-items="${ns}">${items.map((x, j) => { const manual = x._other || (x.name && !names.includes(x.name)); return `<div class="rp-item">
      <div class="ded-reason"><select class="input" data-iname="${j}"><option value="" ${!x.name && !manual ? 'selected' : ''}>選擇維修項目</option>
        ${names.map(n => `<option value="${esc(n)}" data-price="${priceOf(n) ?? ''}" ${!manual && x.name === n ? 'selected' : ''}>${esc(n)}${priceOf(n) != null ? '・NT$ ' + money(priceOf(n)) : ''}</option>`).join('')}<option value="${IN_OTHER}" ${manual ? 'selected' : ''}>其他（手動輸入）</option></select>
        <input class="input" data-iother="${j}" value="${esc(manual ? x.name : '')}" placeholder="輸入維修項目" ${manual ? '' : 'hidden'}></div>
      <input class="input num" data-iamt="${j}" inputmode="numeric" value="${esc(x.amount)}" placeholder="金額">
      <select class="input" data-iw="${j}">${REPAIR_WARRANTY.map(([d, l]) => `<option value="${d}" ${Number(x.warranty) === d ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="ph-del static" data-idel="${j}" aria-label="刪除">✕</button></div>`; }).join('')}
    <button type="button" class="link" data-iadd>＋ 新增維修項目</button>
    <div class="price-row sub"><span>報價合計</span><b class="num" data-itotal>NT$ ${money(items.reduce((t, x) => t + numv(x.amount), 0))}</b></div></div>`;
}
function bindItemsEditor(root, items, redraw) {
  const total = () => { const t = $('[data-itotal]', root); if (t) t.textContent = 'NT$ ' + money(items.reduce((s, x) => s + numv(x.amount), 0)); };
  $$('[data-iname]', root).forEach(el => el.onchange = () => {
    const x = items[+el.dataset.iname], inp = $(`[data-iother="${el.dataset.iname}"]`, root);
    x._other = el.value === IN_OTHER; x.name = x._other ? inp.value.trim() : el.value; inp.hidden = !x._other;
    const p = el.selectedOptions[0]?.dataset.price, amt = $(`[data-iamt="${el.dataset.iname}"]`, root);
    if (!x._other && p) { x.amount = p; amt.value = p; total(); } // 官網價目自動帶入
    if (x._other) inp.focus({ preventScroll: true }); else amt.focus({ preventScroll: true });
  });
  $$('[data-iother]', root).forEach(el => el.oninput = () => { items[+el.dataset.iother].name = el.value.trim(); });
  $$('[data-iamt]', root).forEach(el => el.oninput = () => { items[+el.dataset.iamt].amount = el.value; total(); });
  $$('[data-iw]', root).forEach(el => el.onchange = () => { items[+el.dataset.iw].warranty = Number(el.value); });
  $$('[data-idel]', root).forEach(b => b.onclick = () => { items.splice(+b.dataset.idel, 1); redraw(); });
  $('[data-iadd]', root).onclick = () => { items.push({ name: '', amount: '', warranty: 90 }); redraw(); $$('[data-iname]', root.isConnected ? root : document).pop()?.focus({ preventScroll: true }); };
}
const cleanItems = items => items.filter(x => (x.name || '').trim()).map(x => ({ name: x.name.trim(), amount: numv(x.amount), warranty: Number(x.warranty) || 0 }));
function bindRepairForm() {
  const err = m => { $('#rpErr').textContent = m || ''; };
  $$('[data-r]').forEach(el => el.oninput = () => {
    rp[el.dataset.r] = el.value;
    if (el.dataset.r === 'serial' || el.dataset.r === 'phone') { $('#rpHist').innerHTML = rpHistoryHTML(); bindHist(); }
  });
  const bindHist = () => $$('#rpHist [data-rid]').forEach(r => r.onclick = () => repairDrawer(repairs.find(o => o.id === r.dataset.rid)));
  bindHist();
  $$('[data-rcat]').forEach(r => r.onchange = () => { rp.category = r.value; rp.model = ''; rp.capacity = ''; rp.color = ''; rp._m = {}; drawRepairForm(); });
  $$('select[data-pick][data-rf]').forEach(el => el.onchange = () => {
    const f = el.dataset.rf, other = el.value === IN_OTHER;
    rp._m[f] = other; rp[f] = other ? '' : el.value;
    if (other || f === 'model') { drawRepairForm(); if (other) $(`input[data-rf="${f}"][data-manual]`)?.focus(); }
  });
  $$('input[data-rf]').forEach(el => el.oninput = () => { rp[el.dataset.rf] = el.value; });
  $('#rpScan').onclick = () => scanDevice(rp, () => drawRepairForm());
  const addText = (key, field) => $$(`[data-add-${key}]`).forEach(b => b.onclick = () => {
    const v = b.getAttribute(`data-add-${key}`);
    if (!rp[field].includes(v)) rp[field] = (rp[field] ? rp[field] + '、' : '') + v;
    $(`[data-r="${field}"]`).value = rp[field];
  });
  addText('issue', 'issue'); addText('cond', 'condition'); addText('note', 'note');
  $$('[data-rdelph]').forEach(b => b.onclick = () => { rp.photos.splice(+b.dataset.rdelph, 1); drawRepairForm(); });
  $$('[data-rph]').forEach(inp => inp.onchange = async () => {
    const files = [...inp.files].slice(0, 8 - rp.photos.length);
    err('處理照片中…');
    for (const f of files) { try { rp.photos.push(await resizeImage(f, 1280, 0.8)); } catch (e) { toast(e.message); } }
    err(); drawRepairForm();
  });
  bindItemsEditor($('[data-items="f"]'), rp.items, drawRepairForm);
  $$('[data-rpro]').forEach(r => r.onchange = () => { rp.promise = r.value; });
  $('#rpAgree').onchange = e => { rp.agreed = e.target.checked; };
  $('#rpInspect').onchange = e => { rp.inspect = e.target.checked; rp.inspectFee = rp.inspect ? (rp.inspectFee || '0') : ''; drawRepairForm(); };
  sigPad($('#rpSign'), rp.dropSign, v => { rp.dropSign = v; });
  $('#rpClear').onclick = () => { rp.dropSign = ''; drawRepairForm(); };
  $('#rpSubmit').onclick = () => submitRepair(err);
}
async function submitRepair(err) {
  if (rpBusy) return;
  if (!rp.customer.trim()) return err('請填寫客戶姓名');
  if (!/^0\d{8,9}$/.test(normPhone(rp.phone))) return err('請填寫正確的聯絡電話');
  if (rp.email.trim() && !IN_EMAIL_RE.test(rp.email.trim())) return err('電子信箱格式不正確，不寄送請留空');
  if (!rp.model.trim()) return err('請填寫型號');
  if (!rp.issue.trim()) return err('請填寫故障描述');
  if (rp.items.some(x => x.name && String(x.amount).trim() === '')) return err('請填寫維修項目的金額（免費請填 0）');
  if (!rp.agreed) return err('請客人確認維修條款');
  if (!rp.dropSign) return err('請客人完成送修簽名');
  rpBusy = true;
  const btn = $('#rpSubmit'); btn.disabled = true; btn.textContent = '上傳中，請勿關閉…';
  try {
    const { _m, items, ...data } = rp;
    data.inspectFee = rp.inspect ? numv(rp.inspectFee) : 0;
    const r = await api('repairCreate', { ...data, phone: normPhone(rp.phone), email: rp.email.trim(), items: cleanItems(items) });
    photoCache[r.repair.dropSign] = rp.dropSign;
    r.repair.photos.forEach((id, j) => { if (rp.photos[j]) photoCache[id] = rp.photos[j]; });
    repairs.unshift(r.repair); rpDone = r.repair; rp = null;
    drawRepairDone();
  } catch (e) {
    if (e.auth) return start();
    err(e.message); btn.disabled = false; btn.textContent = '建立維修單';
  } finally { rpBusy = false; }
}
function drawRepairDone() {
  const o = rpDone;
  app.innerHTML = `${pagesNav('repair')}<div class="card staff-login rise" style="text-align:center">
    <div style="font-size:44px">🔧</div><h2 class="card-title">維修單已建立</h2>
    <p class="num" style="font-size:22px;margin:6px 0">${esc(o.id)}</p>
    <p class="muted">${esc(o.customer)}・${esc(rpDev(o))}${o.quote ? `・報價 NT$ ${money(o.quote)}` : ''}</p>
    ${o.email ? `<p class="small" style="color:${o.mailLog.includes('已寄送') ? 'var(--ok, #1a7f37)' : 'var(--danger, #c9372c)'}">${o.mailLog.includes('已寄送') ? '✉️ 維修單已寄到 ' + esc(o.email) : '⚠️ 維修單寄送失敗'}</p>` : ''}
    <div style="display:grid;gap:10px;margin-top:18px">
      <button class="btn btn-dark btn-block" data-rpdf="drop">📄 檢視送修單（分享／列印）</button>
      <button class="btn btn-ghost btn-block" id="rpNext">＋ 下一位客人</button>
      <a class="btn btn-ghost btn-block" href="#repair">回維修列表</a></div></div>`;
  $('[data-rpdf]').onclick = () => rpPreview(o, 'drop');
  $('#rpNext').onclick = () => { rp = null; repairForm(); };
}

/** 維修單畫面（送修單／取件單）：先顯示單據，下方再分享／存 PDF、列印 */
function repairDocHTML(o, kind) {
  const pick = kind === 'pickup';
  const tail = (v, n) => v ? '*'.repeat(Math.max(0, v.length - n)) + v.slice(-n) : '';
  return `<div id="report" class="receipt">
    <div class="rc-head"><div><div class="small muted">${esc(REPAIR_ENTITY)}</div><h2>${pick ? '維修取件單（保固憑證）' : '維修送修單'}</h2></div>
      <div style="text-align:right"><b class="num">${esc(o.id)}</b><div class="small">客戶聯</div></div></div>
    <table class="rc-meta">
      <tr><th>送修日期</th><td>${esc(o.createdAt)}</td><th>收件人員</th><td>${esc(o.staff)}</td></tr>
      <tr><th>客戶</th><td>${esc(o.customer)}</td><th>電話</th><td class="num">${esc(tail(o.phone, 3))}</td></tr>
      <tr><th>機型</th><td>${esc(rpDev(o))}</td><th>IMEI／序號</th><td class="num">${esc(o.serial || '—')}</td></tr>
      <tr><th>故障描述</th><td colspan="3">${esc(o.issue)}</td></tr>
      <tr><th>外觀與配件</th><td colspan="3">${esc(o.condition || '—')}</td></tr>
      ${pick ? `<tr><th>取件日期</th><td>${esc(o.pickupAt)}</td><th>保固到期</th><td><b>${esc(o.warrantyEnd || '無保固')}</b></td></tr>`
        : `<tr><th>預計完成</th><td colspan="3">${esc(o.promise || '檢測後通知')}</td></tr>`}</table>
    <table class="rc-items"><thead><tr><th>#</th><th>維修項目</th><th>保固</th><th style="text-align:right">金額</th></tr></thead><tbody>
      ${o.inspect ? `<tr><td colspan="4" style="background:#fff8ec"><b>檢測後另行報價</b>　檢測費 NT$ ${money(o.inspectFee || 0)}<div class="small" style="color:#8a5300">※ ${INSPECT_NOTE}</div></td></tr>` : ''}
      ${o.items.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${x.warranty ? x.warranty + ' 天' : '無'}</td><td class="num" style="text-align:right">NT$ ${money(x.amount)}</td></tr>`).join('')}
      ${!o.items.length && !o.inspect ? '<tr><td colspan="4">檢測後報價</td></tr>' : ''}
      <tr class="rc-total"><td colspan="3">${pick ? '實收金額' : (o.items.length || !o.inspect ? '報價合計' : '檢測費（確認維修報價則不收取）')}</td>
        <td class="num" style="text-align:right">NT$ ${money(pick ? o.fee : (o.items.length || !o.inspect ? o.quote : o.inspectFee || 0))}${pick && o.payment ? '（' + esc(o.payment) + '）' : ''}</td></tr></tbody></table>
    <ol class="terms-ol small">${REPAIR_TERMS.map(([h, b]) => `<li><b>${esc(h)}</b>　${esc(b)}</li>`).join('')}</ol>
    <p class="small">✓ 客人已確認故障描述、報價與上述維修條款（${esc(o.terms || '')}）</p>
    <div class="rc-sign ${pick ? '' : 'rc-sign-drop'}"><div><img data-photo="${esc(o.dropSign)}" alt="送修簽名"><span>送修簽名 ${esc(o.customer)}</span></div>
      <div>${pick ? `<img data-photo="${esc(o.pickSign)}" alt="取件簽名"><span>取件簽名 ${esc(o.customer)}</span>` : `<div class="rc-staff-sm">${esc(o.staff)}</div><span class="rc-staff-lbl">收件人員</span>`}</div></div>
  </div>`;
}
function rpPreview(o, kind) {
  const w = document.createElement('div'); w.className = 'lightbox prev';
  w.innerHTML = `<div class="prev-box">${repairDocHTML(o, kind)}
    <div class="no-print" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn" style="flex:1;background:#fff;color:#111;min-width:180px" data-pdf disabled>📄 PDF 準備中…</button>
      ${canPrint() ? '<button class="btn" style="background:#fff;color:#111" data-print>🖨 列印</button>' : ''}
      <button class="btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)" data-close>關閉</button></div>
    <p class="no-print small" style="color:rgba(255,255,255,.75);margin:8px 0 0;text-align:center">在平板上按「分享」會打開分享選單，可選「列印」「儲存到檔案」「AirDrop」或「郵件」</p></div>`;
  document.body.appendChild(w);
  w.onclick = e => { if (e.target === w || e.target.dataset.close !== undefined) w.remove(); };
  const pr = $('[data-print]', w);
  if (pr) pr.onclick = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 1500); };
  const pb = $('[data-pdf]', w);
  let file = null;
  api('repairPdf', { id: o.id, kind }).then(r => {
    const bin = atob(r.data), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    file = new File([bytes], r.name, { type: 'application/pdf' });
    pb.disabled = false; pb.textContent = canSharePdf(file) ? '📤 分享／列印／存 PDF' : '📄 下載 PDF';
  }).catch(e => { if (e.auth) return start(); pb.textContent = 'PDF 產生失敗：' + e.message; });
  pb.onclick = async () => {
    if (!file) return;
    if (canSharePdf(file)) { try { await navigator.share({ files: [file], title: file.name }); } catch (e) { if (e.name !== 'AbortError') downloadFile(file); } }
    else downloadFile(file);
  };
  loadPhotos(w);
}

/* ---------- 維修單明細（進度、項目、零件、取件） ---------- */
/** 進度：步驟條＋一個主要按鈕（下一步），其他操作收在「其他操作」裡，避免誤按 */
function rpProgressHTML(o, can) {
  const steps = ['待維修', '維修中', '待取件', '已取件'];
  const side = ['無法維修', '已取消'].includes(o.status);
  const cur = side ? (o.status === '無法維修' ? 2 : -1) : steps.indexOf(o.status);
  const bar = `<div class="rp-steps">${steps.map((s, i) => `<div class="${i < cur ? 'done' : i === cur ? 'on' : ''}"><i>${i < cur ? '✓' : i + 1}</i><span>${i === 2 && o.status === '無法維修' ? '無法維修' : s}</span></div>`).join('')}</div>
    ${o.status === '已取消' ? '<p class="small" style="color:var(--red, #e5484d);margin:8px 0 0;text-align:center">此維修單已取消</p>' : ''}`;
  if (!can || ['已取件', '已取消'].includes(o.status)) return `<div class="card"><h3>維修進度</h3>${bar}</div>`;
  const next = { '待維修': ['維修中', '🔧 開始維修'], '維修中': ['待取件', `✅ 維修完成，通知取件${o.email ? '（寄信）' : ''}`] }[o.status];
  const back = { '維修中': '待維修', '待取件': '維修中', '無法維修': '維修中' }[o.status];
  const others = [
    o.status !== '無法維修' && o.status !== '待取件' && ['無法維修', `改為「無法維修」${o.email ? '（寄信）' : ''}`],
    back && [back, `退回「${back}」`],
    ['已取消', '取消維修單'],
  ].filter(Boolean);
  return `<div class="card"><h3>維修進度</h3>${bar}
    ${next ? `<button class="btn btn-dark btn-block rp-next" data-st="${next[0]}">${next[1]}</button>`
      : `<p class="small muted" style="margin:12px 0 0;text-align:center">${o.status === '待取件' ? '等待客人取件 ↓ 在下方「取件與收款」辦理' : '可在下方「取件與收款」辦理退回裝置'}</p>`}
    <details class="rp-more"><summary>其他操作</summary><div class="rp-more-btns">
      ${others.map(([st, l]) => `<button class="btn btn-ghost btn-sm" data-st="${st}" ${st === '已取消' ? 'style="color:var(--red, #e5484d);border-color:#f3c2c2"' : ''}>${l}</button>`).join('')}</div></details></div>`;
}
function repairDrawer(o) {
  if (!o) return;
  const can = P('repair'), d = $('#drawer');
  d.classList.add('wide'); // 維修單比較長、要簽名：抽屜加寬
  const ed = { items: o.items.map(x => ({ ...x })), parts: o.parts.map(x => ({ ...x })), note: o.note || '' };
  const pickable = ['待取件', '無法維修', '維修中', '待維修'].includes(o.status);
  const draw = () => {
    const keep = $('.d-body', d)?.scrollTop || 0;
    const partsCost = ed.parts.reduce((t, p) => t + numv(p.cost), 0), quote = ed.items.reduce((t, x) => t + numv(x.amount), 0);
    d.innerHTML = `<div class="d-head"><b class="num">${esc(o.id)}</b>${rpBadge(o)}<button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      ${wBadge(o) ? `<div class="card" style="text-align:center">${wBadge(o)}</div>` : ''}
      <div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-dark btn-sm" data-rpdf="drop">📄 送修單</button>
        ${o.status === '已取件' ? '<button class="btn btn-dark btn-sm" data-rpdf="pickup">📄 取件單／保固憑證</button>' : ''}
        ${editBarHTML(P('edit_repair'), P('delete_repair'))}</div></div>
      <div class="card"><h3>客戶與裝置</h3><dl class="kv">
        <dt>客戶</dt><dd>${esc(o.customer)}</dd><dt>電話</dt><dd class="num"><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></dd>
        ${o.email ? `<dt>信箱</dt><dd>${esc(o.email)}</dd>` : ''}
        <dt>機型</dt><dd>${esc(rpDev(o))}</dd><dt>IMEI／序號</dt><dd class="num">${esc(o.serial || '—')}</dd>
        <dt>故障</dt><dd>${esc(o.issue)}</dd><dt>外觀配件</dt><dd>${esc(o.condition || '—')}</dd>
        <dt>收件</dt><dd>${esc(o.createdAt)}・${esc(o.staff)}</dd>${o.promise ? `<dt>預計完成</dt><dd>${esc(o.promise)}</dd>` : ''}
        ${o.doneAt ? `<dt>完修</dt><dd>${esc(o.doneAt)}</dd>` : ''}${o.pickupAt ? `<dt>取件</dt><dd>${esc(o.pickupAt)}・${esc(o.pickupBy)}</dd><dt>實收</dt><dd class="num">NT$ ${money(o.fee)}${o.payment ? '（' + esc(o.payment) + '）' : ''}</dd>` : ''}</dl>
        ${o.photos.length ? `<div class="ph-grid" style="margin-top:10px">${o.photos.map(p => `<div class="ph"><img data-photo="${esc(p)}" alt="收件照片"></div>`).join('')}</div>` : ''}</div>
      ${rpProgressHTML(o, can)}
      <div class="card"><h3>維修項目與保固</h3>
        ${o.inspect ? `<div class="rp-inspect-box" style="margin-bottom:10px"><b>檢測後另行報價</b>・檢測費 NT$ ${money(o.inspectFee || 0)}<div class="small" style="color:#8a5300">※ ${INSPECT_NOTE}</div></div>` : ''}
        ${can && o.status !== '已取件' ? rpItemsEditor(ed.items, 'd', priceListOf(o.category, o.model)) : `${o.items.length ? `<table class="rep-price">${o.items.map(x => `<tr><td>${esc(x.name)}<div class="sub">${x.warranty ? '保固 ' + x.warranty + ' 天' : '無保固'}</div></td><td>NT$ ${money(x.amount)}</td></tr>`).join('')}<tr class="sub"><td>報價合計</td><td>NT$ ${money(o.quote)}</td></tr></table>` : '<p class="small muted">尚未填寫</p>'}`}</div>
      <div class="card"><h3>使用零件</h3>
        ${can && o.status !== '已取件' ? `<div data-parts>${ed.parts.map((p, j) => `<div class="rp-item rp-part ${showCost() ? '' : 'no-cost'}"><input class="input" data-pname="${j}" list="rpPartList" value="${esc(p.name)}" placeholder="選擇或輸入零件名稱">
            ${!showCost() ? '' : `<input class="input num" data-pcost="${j}" inputmode="numeric" value="${esc(p.cost ?? '')}" placeholder="成本">`}<button type="button" class="ph-del static" data-pdel="${j}" aria-label="刪除">✕</button></div>`).join('')}
          <button type="button" class="link" data-padd>＋ 新增零件</button>
          <datalist id="rpPartList">${[...REPAIR_PARTS, ...ed.items.map(x => x.name).filter(Boolean)].map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>`
          : (o.parts.length ? o.parts.map(p => `<div>${esc(p.name)}${showCost() && p.cost != null ? `<span class="num" style="float:right">NT$ ${money(p.cost)}</span>` : ''}</div>`).join('') : '<p class="small muted">未登記</p>')}
        ${showCost() ? `<div class="price-row sub" style="margin-top:10px"><span>零件成本 NT$ ${money(partsCost)}・預估毛利</span><b class="num">NT$ ${money((o.status === '已取件' ? o.fee || 0 : quote) - partsCost)}</b></div>` : ''}</div>
      <div class="card"><h3>內部備註</h3>${can ? `<textarea class="input" data-note placeholder="只有店內看得到">${esc(ed.note)}</textarea>` : `<p>${esc(o.note || '—')}</p>`}
        ${can && o.status !== '已取件' ? '<button class="btn btn-ghost btn-block" id="rpSave" style="margin-top:10px">💾 儲存項目／零件／備註</button>' : ''}</div>
      ${can && pickable ? `<div class="card rp-pick"><h3>取件與收款</h3>
        <p class="small muted" style="margin:-4px 0 10px">客人取件時填寫；保固從今天起算${ed.items.some(x => numv(x.warranty)) ? `，到 ${addDays(localDay(), Math.max(...ed.items.map(x => numv(x.warranty))))}` : ''}</p>
        ${o.inspect ? `<p class="small" style="margin:0 0 8px;color:#8a5300">${quote ? '已確認維修報價：不收取檢測費，實收金額預設為維修報價' : `尚未報價維修：實收金額預設為檢測費 NT$ ${money(o.inspectFee || 0)}`}</p>` : ''}
        <div class="grid2"><label class="field"><span>實收金額（NT$）</span><input class="input num" id="pkFee" inputmode="numeric" value="${o.inspect && !quote ? (o.inspectFee || 0) : quote}"></label>
          <div class="field"><span>付款方式</span><div class="chips">${REPAIR_PAY.map(p => `<label class="chip"><input type="radio" name="pkpay" value="${p}" ${p === '現金' ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><b>客人取件簽名</b><button type="button" class="link" id="pkClear" style="font-size:14px">清除重簽</button></div>
        <canvas class="sig-pad sig-big" id="pkSign" width="1200" height="520"></canvas>
        <button class="btn btn-dark btn-block" id="pkDo" style="margin-top:12px">完成取件${o.email ? '（寄取件單與保固）' : ''}</button><p class="err" id="pkErr"></p></div>` : ''}
      <div class="card"><h3>紀錄</h3><ul class="small muted" style="margin:0;padding-left:18px">${o.history.map(h => `<li>${esc(h.replace(/｜/g, '・'))}</li>`).join('')}${o.mailLog ? o.mailLog.split('\n').map(l => `<li>✉️ ${esc(l)}</li>`).join('') : ''}</ul></div>
      <div class="card"><h3>簽名</h3><div class="grid2"><div><div class="small muted">送修簽名</div><img class="sig-img" data-photo="${esc(o.dropSign)}" alt="送修簽名"></div>
        <div><div class="small muted">取件簽名</div>${o.pickSign ? `<img class="sig-img" data-photo="${esc(o.pickSign)}" alt="取件簽名">` : '<p class="small muted">尚未取件</p>'}</div></div></div>
      ${editLogHTML(o)}
    </div>`;
    $('.d-body', d).scrollTop = keep;
    d.classList.add('show'); $('#scrim').classList.add('show');
    $('.d-close', d).onclick = closeDrawer;
    loadPhotos(d);
    $$('[data-rpdf]', d).forEach(b => b.onclick = () => rpPreview(o, b.dataset.rpdf));
    if ($('[data-edit]', d)) $('[data-edit]', d).onclick = () => repairEdit(o);
    if ($('[data-del]', d)) $('[data-del]', d).onclick = async () => {
      const reason = await askReason(`刪除維修單 ${o.id}（${o.customer}・${rpDev(o)}）？\n\n會留下刪除紀錄。`, '確定刪除');
      if (!reason) return;
      try {
        await api('repairDelete', { id: o.id, reason });
        repairs = repairs.filter(x => x.id !== o.id); rpData = null;
        closeDrawer(); toast('已刪除維修單 ' + o.id); refreshRepairList();
      } catch (x) { if (x.auth) return start(); toast(x.message); }
    };
    if (!can) return;
    const itemsRoot = $('[data-items="d"]', d);
    if (itemsRoot) bindItemsEditor(itemsRoot, ed.items, draw);
    $$('[data-pname]', d).forEach(el => el.oninput = () => { ed.parts[+el.dataset.pname].name = el.value; });
    $$('[data-pcost]', d).forEach(el => el.oninput = () => { ed.parts[+el.dataset.pcost].cost = el.value; });
    $$('[data-pdel]', d).forEach(b => b.onclick = () => { ed.parts.splice(+b.dataset.pdel, 1); draw(); });
    if ($('[data-padd]', d)) $('[data-padd]', d).onclick = () => { ed.parts.push({ name: '', cost: '' }); draw(); $$('[data-pname]', d).pop()?.focus({ preventScroll: true }); };
    if ($('[data-note]', d)) $('[data-note]', d).oninput = e => { ed.note = e.target.value; };
    const save = async (extra = {}) => {
      if (ed.items.some(x => x.name && String(x.amount).trim() === '')) { toast('請填寫維修項目的金額（免費請填 0）'); return null; }
      const r = await api('repairUpdate', { id: o.id, expected: o.status, items: cleanItems(ed.items),
        parts: ed.parts.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), cost: numv(p.cost) })), note: ed.note, ...extra });
      const i = repairs.findIndex(x => x.id === o.id); if (i >= 0) repairs[i] = r.repair;
      return r.repair;
    };
    if ($('#rpSave', d)) $('#rpSave', d).onclick = async e => {
      e.currentTarget.disabled = true;
      try { const n = await save(); if (n) { toast('已儲存'); repairDrawer(n); refreshRepairList(); } } catch (x) { if (x.auth) return start(); toast(x.message); e.currentTarget.disabled = false; }
    };
    $$('[data-st]', d).forEach(b => b.onclick = async () => {
      const st = b.dataset.st;
      const msg = {
        '維修中': o.status === '待維修' ? `開始維修 ${o.id}？\n\n狀態會改為「維修中」。` : `退回「維修中」？`,
        '待取件': `確定已維修完成？\n\n狀態會改為「待取件」${o.email ? '，並寄信通知客人來取件' : ''}。`,
        '無法維修': `改為「無法維修」？\n\n${o.email ? '會寄信通知客人來取回裝置；' : ''}之後在下方辦理取件（退回裝置、收檢測費）。`,
        '待維修': `退回「待維修」？`,
        '已取消': `取消這張維修單？\n\n取消後就不能再更新進度。`,
      }[st] || `改為「${st}」？`;
      const okText = { '待取件': '確定完修', '已取消': '取消維修單', '無法維修': '改為無法維修' }[st] || '確定';
      if (!(await ask(msg, okText, '返回'))) return;
      b.disabled = true;
      try { const n = await save({ status: st }); if (n) { toast((st === '待取件' || st === '無法維修') && n.email ? '已更新，並寄信通知客人來取件' : '已更新為「' + st + '」'); repairDrawer(n); refreshRepairList(); } }
      catch (x) { if (x.auth) return start(); toast(x.message); b.disabled = false; }
    });
    let pkSign = '';
    if ($('#pkSign', d)) {
      sigPad($('#pkSign', d), '', v => { pkSign = v; });
      $('#pkClear', d).onclick = () => { pkSign = ''; const c = $('#pkSign', d); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
      $('#pkDo', d).onclick = async e => {
        const btn = e.currentTarget, perr = m => { $('#pkErr', d).textContent = m || ''; };
        if (ed.items.some(x => x.name && String(x.amount).trim() === '')) return perr('請填寫維修項目的金額（免費請填 0）');
        if (!pkSign) return perr('請客人完成取件簽名');
        btn.disabled = true; btn.textContent = '處理中…';
        try {
          const r = await api('repairPickup', { id: o.id, items: cleanItems(ed.items), fee: numv($('#pkFee', d).value), payment: $('input[name=pkpay]:checked', d)?.value || '', pickSign: pkSign });
          if (ed.parts.some(p => p.name.trim()) || ed.note !== (o.note || '')) await api('repairUpdate', { id: o.id, parts: ed.parts.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), cost: numv(p.cost) })), note: ed.note });
          photoCache[r.repair.pickSign] = pkSign;
          const i = repairs.findIndex(x => x.id === o.id); if (i >= 0) repairs[i] = r.repair;
          toast('已完成取件' + (r.repair.email ? '，取件單已寄給客人' : ''));
          repairDrawer({ ...r.repair, parts: ed.parts.filter(p => p.name.trim()), note: ed.note });
          refreshRepairList();
        } catch (x) { if (x.auth) return start(); perr(x.message); btn.disabled = false; btn.textContent = '完成取件'; }
      };
    }
  };
  draw();
}
/** 維修單基本資料修改（在抽屜裡編輯） */
function repairEdit(o) {
  const d = $('#drawer');
  const inp = (label, k, extra = '') => `<label class="field"><span>${label}</span><input class="input" data-ef="${k}" value="${esc(o[k] == null ? '' : o[k])}" ${extra}></label>`;
  $('.d-body', d).innerHTML = `
    <div class="card"><h3>✏️ 修改維修單</h3><p class="small muted" style="margin:-4px 0 12px">進度、維修項目、零件請在維修單明細操作；照片與簽名不能修改。儲存後會留下操作紀錄。</p>
      <div class="grid2">${inp('客戶姓名 *', 'customer')}${inp('聯絡電話 *', 'phone', 'inputmode="tel"')}</div>
      ${inp('電子信箱', 'email', 'type="email" autocapitalize="off"')}</div>
    <div class="card"><h3>裝置</h3>
      <label class="field"><span>類別</span><select class="input" data-ef="category">${opts(Object.keys(IN_CATS), o.category)}</select></label>
      ${inp('型號 *', 'model')}
      <div class="grid2">${inp('容量／規格', 'capacity')}${inp('顏色', 'color')}</div>
      ${inp('IMEI／序號', 'serial')}
      <label class="field"><span>故障描述 *</span><textarea class="input" data-ef="issue" rows="3">${esc(o.issue)}</textarea></label>
      <label class="field"><span>外觀與配件</span><textarea class="input" data-ef="condition" rows="2">${esc(o.condition)}</textarea></label>
      ${inp('預計完成', 'promise')}
      <label class="check" style="margin-top:4px"><input type="checkbox" id="efInspect" ${o.inspect ? 'checked' : ''}><span>檢測後另行報價</span></label>
      <div id="efFeeBox" ${o.inspect ? '' : 'hidden'}><label class="field"><span>檢測費（NT$）</span><input class="input num" id="efFee" inputmode="numeric" value="${esc(o.inspectFee || 0)}"></label></div></div>
    <div class="card"><label class="field"><span>修改原因（選填）</span><textarea class="input" id="efReason" rows="2" placeholder="例：電話打錯、客人更正型號"></textarea></label>
      <div style="display:flex;gap:8px"><button class="btn btn-ghost" id="efCancel" style="flex:1">取消</button><button class="btn btn-dark" id="efSave" style="flex:2">儲存修改</button></div>
      <p class="err" id="efErr"></p></div>`;
  $('.d-body', d).scrollTop = 0;
  $('#efInspect', d).onchange = e => { $('#efFeeBox', d).hidden = !e.target.checked; };
  $('#efCancel', d).onclick = () => repairDrawer(o);
  $('#efSave', d).onclick = async e => {
    const btn = e.currentTarget, fields = {};
    $$('[data-ef]', d).forEach(el => { fields[el.dataset.ef] = el.value.trim(); });
    fields.inspect = $('#efInspect', d).checked; fields.inspectFee = numv($('#efFee', d).value);
    btn.disabled = true; btn.textContent = '儲存中…';
    try {
      const r = await api('repairEdit', { id: o.id, fields, reason: $('#efReason', d).value.trim() });
      const i = repairs.findIndex(x => x.id === o.id); if (i >= 0) repairs[i] = r.repair;
      toast('已儲存修改'); repairDrawer(r.repair); refreshRepairList();
    } catch (x) { if (x.auth) return start(); $('#efErr', d).textContent = x.message; btn.disabled = false; btn.textContent = '儲存修改'; }
  };
}
function refreshRepairList() { rpData = null; if (location.hash === '#repair' && $('#rpTbl')) repairPage(); } // 連同上方統計一起更新
