/* ============================== 價格管理（後台） ==============================
 * 分頁：收購價格／扣款規則／維修價格／價格紀錄
 * - 依型號分卡片、可搜尋與篩選類別；改過的格子會標黃色並顯示原本的價格
 * - 每次儲存都會寫入「價格紀錄」（時間、經手人、原本 → 改為），可查每個型號的歷屆價格與走勢
 * 依賴 store.js 的共用元件：pagesNav、showCost、stockCache…
 */
const PZ_ALL_TABS = [['buy', '💰 收購價格', 'edit_prices'], ['rules', '⚙️ 扣款規則', 'edit_prices'], ['repair', '🔧 維修價格', 'edit_prices'], ['sale', '🏷 建議售價', 'edit_stock'], ['log', '🕘 價格紀錄', '']];
const pzTabs = () => PZ_ALL_TABS.filter(t => !t[2] || P(t[2]));
const PZ_TABS = PZ_ALL_TABS;
const SALE_CATS = ['手機', '平板', '筆電', '其他 3C', '其他商品'];
const saleCatOf = c => ({ iPhone: '手機', iPad: '平板', Mac: '筆電', 'Apple Watch': '其他 3C', 'AirPods／配件': '其他 3C', Samsung: '手機', OPPO: '手機', Google: '手機', Sony: '手機', '小米': '手機', vivo: '手機', realme: '手機', ASUS: '手機' }[c] || (SALE_CATS.includes(c) ? c : '其他商品'));
const saleKey = (m, c) => (String(m || '') + '|' + String(c || '')).toLowerCase().replace(/\s+/g, '');
const PZ_BUY_CATS = ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods／配件', 'Samsung', 'OPPO', 'Google', 'Sony', '小米', 'vivo', 'realme', 'ASUS', '其他'];
const PZ_REPAIR_CATS = ['手機', '平板', '筆電', '其他 3C'];
const PZ_BUY_FIELDS = ['price', 'newPrice', 'battery', 'acc', 'accItems'];
let pz = { tab: 'buy', q: '', cat: '', buy: null, rules: null, buyOrig: {}, rulesOrig: '', repair: null, repairOrig: {}, repairFromSite: false, log: null, logType: '', logQ: '', sale: null, saleOrig: {}, saleStock: [], saleOnlyStock: true };
const pzBuyKey = r => `${r.category}|${r.model}|${r.capacity}`;
const pzRepKey = r => `${r.category}|${r.model}|${r.item}`;
const pzVal = v => (v === 0 || v == null) ? '' : String(v);
window.addEventListener('beforeunload', e => { if (location.hash === '#prices' && pzDirtyCount()) { e.preventDefault(); e.returnValue = ''; } });

/** 維修價目：把後台的價目套用到維修單使用的 REPAIR_PRICES（沒有就沿用網站內建的官網價目） */
let repairPricesLoaded = false;
function applyRepairPrices(rows) {
  if (!rows || !rows.length || typeof REPAIR_PRICES === 'undefined') return;
  Object.keys(REPAIR_PRICES).forEach(k => delete REPAIR_PRICES[k]);
  rows.forEach(r => { ((REPAIR_PRICES[r.category] = REPAIR_PRICES[r.category] || {})[r.model] = REPAIR_PRICES[r.category][r.model] || []).push([r.item, r.price]); });
}
async function ensureRepairPrices() {
  if (repairPricesLoaded) return;
  try { applyRepairPrices((await api('repairPrices')).rows); repairPricesLoaded = true; } catch (e) { /* 讀不到就用內建價目 */ }
}
function siteRepairRows() {
  const out = [];
  Object.entries(typeof REPAIR_PRICES === 'undefined' ? {} : REPAIR_PRICES).forEach(([c, ms]) => Object.entries(ms).forEach(([m, list]) => list.forEach(([item, price]) => out.push({ category: c, model: m, item, price }))));
  return out;
}

async function pricesPage(refresh) {
  if (refresh && pzDirtyCount() && !(await ask('有尚未儲存的修改，確定要重新載入？', '重新載入'))) return;
  if (!pzTabs().some(t => t[0] === pz.tab)) pz.tab = pzTabs()[0][0];
  const needBuy = P('edit_prices') && !pz.buy, needSale = P('edit_stock') && !pz.sale;
  if (refresh || needBuy || needSale) {
    app.innerHTML = pagesNav('prices') + '<div class="spinner"></div>';
    try {
      const [b, r, t, st] = await Promise.all([
        P('edit_prices') ? api('adminPrices') : null, P('edit_prices') ? api('repairPrices').catch(() => ({ rows: [] })) : null,
        P('edit_stock') ? api('saleTable') : null, P('edit_stock') ? api('stockList') : null]);
      if (b) pzLoadBuy(b);
      if (r) pzLoadRepair(r.rows);
      if (t) { if (t.cardFee != null) stFee = t.cardFee; stockCache = st.items; pzLoadSale(t.rows); }
      pz.log = null;
    } catch (e) { if (e.auth) return start(); app.innerHTML = pagesNav('prices') + `<div class="card empty">${esc(e.message)}</div>`; return; }
    if (refresh) toast('已更新');
  }
  pzDraw();
}
function pzLoadBuy(b) {
  pz.buy = b.rows.map(r => ({ ...r })); pz.rules = JSON.parse(JSON.stringify(b.rules));
  pz.rules.accessories = pz.rules.accessories || [];
  pz.buyOrig = {}; b.rows.forEach(r => { pz.buyOrig[pzBuyKey(r)] = r; });
  pz.rulesOrig = JSON.stringify(b.rules);
}
function pzLoadRepair(rows) {
  pz.repairFromSite = !rows.length;
  if (!rows.length) rows = siteRepairRows(); else applyRepairPrices(rows);
  repairPricesLoaded = true;
  pz.repair = rows.map(r => ({ ...r }));
  pz.repairOrig = {}; rows.forEach(r => { pz.repairOrig[pzRepKey(r)] = r; });
}

/* ---------- 修改了幾項 ---------- */
function pzBuyChanged(r) { const o = pz.buyOrig[pzBuyKey(r)]; return !o || PZ_BUY_FIELDS.some(f => pzVal(o[f]) !== pzVal(r[f])); }
function pzRepChanged(r) { const o = pz.repairOrig[pzRepKey(r)]; return !o || pzVal(o.price) !== pzVal(r.price); }
function pzBuyDirty() {
  const keys = new Set(pz.buy.map(pzBuyKey));
  return pz.buy.filter(pzBuyChanged).length + Object.keys(pz.buyOrig).filter(k => !keys.has(k)).length + (JSON.stringify(pz.rules) !== pz.rulesOrig ? 1 : 0);
}
function pzRepDirty() {
  const keys = new Set(pz.repair.map(pzRepKey));
  return pz.repair.filter(pzRepChanged).length + Object.keys(pz.repairOrig).filter(k => !keys.has(k)).length;
}
function pzSaleChanged(r) { const o = pz.saleOrig[saleKey(r.model, r.capacity)]; return o ? pzVal(o.cash) !== pzVal(r.cash) || pzVal(o.card) !== pzVal(r.card) : !!numv(r.cash); }
function pzSaleDirty() { return pz.sale ? pz.sale.filter(pzSaleChanged).length + Object.values(pz.saleOrig).filter(o => !pz.sale.some(r => saleKey(r.model, r.capacity) === saleKey(o.model, o.capacity) && numv(r.cash))).length : 0; }
const pzDirtyCount = () => (pz.buy ? pzBuyDirty() : 0) + (pz.repair ? pzRepDirty() : 0) + pzSaleDirty();
const pzTabDirty = k => k === 'buy' || k === 'rules' ? (pz.buy ? pzBuyDirty() : 0) : k === 'repair' ? (pz.repair ? pzRepDirty() : 0) : k === 'sale' ? pzSaleDirty() : 0;

/* ---------- 畫面 ---------- */
function pzDraw() {
  const t = pz.tab;
  const info = [pz.buy && `收購價 ${pz.buy.filter(r => r.price > 0 || r.newPrice > 0).length} 個規格已上線`, pz.repair && `維修價目 ${pz.repair.length} 項${pz.repairFromSite ? '（目前使用官網價目）' : ''}`,
    pz.sale && `建議售價 ${Object.keys(pz.saleOrig).length} 個規格`].filter(Boolean).join('・');
  app.innerHTML = `${pagesNav('prices')}
    <div class="pz-head card">
      <div><h3 style="margin:0">價格管理</h3><p class="small muted" style="margin:4px 0 0">${info}・每次儲存都會記錄在「價格紀錄」</p></div>
      <div class="pz-tabs">${pzTabs().map(([k, l]) => `<button data-pzt="${k}" class="${t === k ? 'on' : ''}">${l}${pzTabDirty(k) ? '<i></i>' : ''}</button>`).join('')}</div>
    </div>
    <div id="pzBody"></div>
    <div class="in-foot pz-foot" id="pzFoot"></div>`;
  $$('[data-pzt]').forEach(b => b.onclick = () => { pz.tab = b.dataset.pzt; pz.q = ''; pz.cat = ''; pzDraw(); });
  if (t === 'buy') pzBuyTab(); else if (t === 'rules') pzRulesTab(); else if (t === 'repair') pzRepairTab(); else if (t === 'sale') pzSaleTab(); else pzLogTab();
  pzFoot();
}
function pzFoot() {
  const f = $('#pzFoot'); if (!f) return;
  if (pz.tab === 'log') { f.innerHTML = ''; return; }
  const rep = pz.tab === 'repair', sale = pz.tab === 'sale', n = pzTabDirty(pz.tab);
  const seed = rep && pz.repairFromSite;
  f.innerHTML = `<span class="pz-count ${n ? 'on' : ''}">${n ? `✏️ 已修改 ${n} 項（黃色＝改過）` : seed ? '目前使用官網價目，按「儲存」後改由後台管理' : '✓ 沒有未儲存的修改'}</span>
    ${n ? '<button class="btn btn-ghost" id="pzUndo">還原</button>' : ''}
    ${rep || sale ? '' : '<a class="btn btn-ghost hide-m" href="index.html#/estimate" target="_blank">看客戶畫面 ↗</a>'}
    <button class="btn btn-dark" id="pzSave" ${n || seed ? '' : 'disabled'}>${rep ? '儲存維修價目' : sale ? '儲存並套用到在庫' : '儲存並上線'}</button>`;
  if ($('#pzUndo')) $('#pzUndo').onclick = async () => {
    if (!(await ask('放棄這次的修改，還原成上次儲存的價格？', '還原'))) return;
    if (rep) pzLoadRepair(Object.values(pz.repairOrig).length && !pz.repairFromSite ? Object.values(pz.repairOrig) : []);
    else if (sale) pzLoadSale(Object.values(pz.saleOrig));
    else pzLoadBuy({ rows: Object.values(pz.buyOrig), rules: JSON.parse(pz.rulesOrig) });
    pzDraw();
  };
  $('#pzSave').onclick = () => rep ? pzSaveRepair() : sale ? pzSaveSale() : pzSaveBuy();
}
/** 搜尋列＋類別 */
function pzToolbar(cats, addLabel) {
  return `<div class="toolbar pz-tool"><input class="input" id="pzQ" placeholder="搜尋型號${pz.tab === 'repair' ? '／維修項目' : ''}" value="${esc(pz.q)}">
    <div class="tabs">${['', ...cats].map(c => `<button data-pzc="${esc(c)}" class="${pz.cat === c ? 'on' : ''}">${c || '全部'}</button>`).join('')}</div>
    <button class="btn btn-ghost btn-sm" id="pzAdd">${addLabel}</button></div><div id="pzList"></div>`;
}
function pzBindToolbar(redraw) {
  $('#pzQ').oninput = e => { pz.q = e.target.value; redraw(); };
  $$('[data-pzc]').forEach(b => b.onclick = () => { pz.cat = b.dataset.pzc; $$('[data-pzc]').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
}
const pzMark = (el, on, orig) => { el.classList.toggle('pz-chg', on); el.title = on ? (orig === undefined ? '新增' : `原本：${orig === '' ? '（空白）' : orig}`) : ''; };
function pzRefreshMarks() { pzFoot(); $$('[data-pzt]').forEach(b => { const k = b.dataset.pzt; b.innerHTML = PZ_ALL_TABS.find(x => x[0] === k)[1] + (pzTabDirty(k) ? '<i></i>' : ''); }); }

/* ---------- 收購價格 ---------- */
function pzBuyTab() {
  const cats = [...new Set([...PZ_BUY_CATS, ...pz.buy.map(r => r.category)])].filter(c => pz.buy.some(r => r.category === c));
  $('#pzBody').innerHTML = `<p class="small muted pz-hint">「最高收購價」＝外觀無刮傷、電池達標、功能正常的價格；空白的規格不會顯示給客戶。客戶看到的預估價會再依「扣款規則」計算。</p>${pzToolbar(cats, '＋ 新增型號')}`;
  pzBindToolbar(pzBuyList);
  $('#pzAdd').onclick = () => {
    const cat = pz.cat || 'iPhone';
    pz.buy.unshift({ category: cat, model: '', capacity: '', price: '', newPrice: '', battery: '', acc: '', accItems: '', note: '', _new: 1 });
    pz.q = ''; $('#pzQ').value = ''; pzBuyList(); pzRefreshMarks(); $('[data-gm]')?.focus();
  };
  pzBuyList();
}
function pzBuyGroups() {
  const q = pz.q.trim().toLowerCase(), g = [], idx = {};
  pz.buy.forEach((r, i) => {
    if (pz.cat && r.category !== pz.cat) return;
    if (q && !(r.model + ' ' + r.capacity + ' ' + r.category).toLowerCase().includes(q)) return;
    const k = r._new ? 'new' + i : r.category + '|' + r.model;
    if (!(k in idx)) { idx[k] = g.length; g.push({ category: r.category, model: r.model, rows: [] }); }
    g[idx[k]].rows.push(i);
  });
  return g;
}
function pzBuyList() {
  const groups = pzBuyGroups();
  const cell = (i, f, ph, w) => { const r = pz.buy[i], o = pz.buyOrig[pzBuyKey(r)], chg = !o || pzVal(o[f]) !== pzVal(r[f]);
    return `<input class="input num ${chg ? 'pz-chg' : ''}" data-bi="${i}" data-bf="${f}" value="${esc(pzVal(r[f]))}" placeholder="${ph}" inputmode="numeric" ${chg ? `title="${o ? '原本：' + esc(pzVal(o[f]) || '（空白）') : '新增'}"` : ''} ${w ? `style="max-width:${w}px"` : ''}>`; };
  $('#pzList').innerHTML = groups.length ? `<div class="pz-grid">${groups.map((g, gi) => `<div class="card pz-card" data-g="${gi}">
      <div class="pz-card-h"><input class="input pz-model" data-gm="${gi}" value="${esc(g.model)}" placeholder="型號，例：iPhone 17 Pro">
        <select class="input pz-cat" data-gc="${gi}">${[...new Set([...PZ_BUY_CATS, g.category])].map(c => `<option ${c === g.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        ${g.model ? `<button class="btn btn-ghost btn-sm" data-ghist="${esc(g.model)}" title="歷屆價格">🕘</button>` : ''}</div>
      <table class="pz-t"><thead><tr><th>容量</th><th>最高收購價</th><th>全新價</th><th></th></tr></thead><tbody>
        ${g.rows.map(i => { const r = pz.buy[i]; return `<tr><td><input class="input" data-bi="${i}" data-bc value="${esc(r.capacity)}" placeholder="容量"></td>
          <td>${cell(i, 'price', '未填＝不顯示')}</td><td>${cell(i, 'newPrice', '不收全新')}</td>
          <td><button type="button" class="ph-del static" data-bdel="${i}" aria-label="刪除這個容量">✕</button></td></tr>`; }).join('')}
      </tbody></table>
      <div class="pz-card-f"><button type="button" class="link" data-gadd="${gi}">＋ 新增容量</button>
        <details class="pz-adv"><summary>進階（電池、配件）</summary>
          <table class="pz-t"><thead><tr><th>容量</th><th>電池要求%</th><th>配件扣款</th><th>配件項目</th></tr></thead><tbody>
          ${g.rows.map(i => { const r = pz.buy[i], o = pz.buyOrig[pzBuyKey(r)], chg = !o || pzVal(o.accItems) !== pzVal(r.accItems); return `<tr><td class="sub">${esc(r.capacity || '—')}</td>
            <td>${cell(i, 'battery', String(pz.rules.batteryDefault ?? 90), 70)}</td><td>${cell(i, 'acc', '0', 90)}</td>
            <td><input class="input ${chg ? 'pz-chg' : ''}" data-bi="${i}" data-bf="accItems" value="${esc(r.accItems || '')}" placeholder="全部"></td></tr>`; }).join('')}
          </tbody></table><p class="small muted" style="margin:6px 0 0">電池要求 0＝不看電池；配件項目空白＝全部都算，可寫「沒有原廠盒子:1500,沒有原廠充電器:2000」，填「無」＝不扣。</p></details></div>
    </div>`).join('')}</div>` : '<div class="card empty">沒有符合的型號</div>';
  const L = $('#pzList');
  $$('[data-bf]', L).forEach(el => el.oninput = () => {
    const r = pz.buy[+el.dataset.bi], f = el.dataset.bf;
    r[f] = f === 'accItems' ? el.value : el.value.replace(/[^\d]/g, '');
    if (f !== 'accItems' && el.value !== r[f]) el.value = r[f];
    const o = pz.buyOrig[pzBuyKey(r)]; pzMark(el, !o || pzVal(o[f]) !== pzVal(r[f]), o ? pzVal(o[f]) : undefined); pzRefreshMarks();
  });
  $$('[data-bc]', L).forEach(el => el.onchange = () => { pz.buy[+el.dataset.bi].capacity = el.value.trim(); pzBuyList(); pzRefreshMarks(); });
  $$('[data-gm]', L).forEach(el => el.onchange = () => { groups[+el.dataset.gm].rows.forEach(i => { pz.buy[i].model = el.value.trim(); delete pz.buy[i]._new; }); pzBuyList(); pzRefreshMarks(); });
  $$('[data-gc]', L).forEach(el => el.onchange = () => { groups[+el.dataset.gc].rows.forEach(i => { pz.buy[i].category = el.value; }); pzBuyList(); pzRefreshMarks(); });
  $$('[data-bdel]', L).forEach(b => b.onclick = () => { pz.buy.splice(+b.dataset.bdel, 1); pzBuyList(); pzRefreshMarks(); });
  $$('[data-gadd]', L).forEach(b => b.onclick = () => {
    const g = groups[+b.dataset.gadd], last = g.rows[g.rows.length - 1];
    pz.buy.splice(last + 1, 0, { category: g.category, model: g.model, capacity: '', price: '', newPrice: '', battery: '', acc: '', accItems: '', note: '', _new: g.model ? undefined : 1 });
    pzBuyList(); pzRefreshMarks();
  });
  $$('[data-ghist]', L).forEach(b => b.onclick = () => pzHistory('收購價', b.dataset.ghist));
}
async function pzSaveBuy() {
  const bad = pz.buy.find(r => !r.model.trim());
  if (bad) return toast('有型號沒有填名稱');
  const b = $('#pzSave'); b.disabled = true; b.textContent = '儲存中…';
  try {
    const r = await api('adminSavePrices', { rows: pz.buy.map(({ _new, ...x }) => x), rules: pz.rules });
    pzLoadBuy(r); pz.log = null;
    toast(r.changed ? `已儲存 ${r.changed} 項變動，客戶網站 10 分鐘內更新` : '已儲存'); pzDraw();
  } catch (e) { if (e.auth) return start(); toast(e.message); b.disabled = false; b.textContent = '儲存並上線'; }
}

/* ---------- 扣款規則 ---------- */
function pzRulesTab() {
  const R = pz.rules;
  const ruleRows = (key, withInspect) => R[key].map((x, i) => `<div class="pr-rule" data-rk="${key}" data-ri="${i}">
      <input class="input" data-rf="label" value="${esc(x.label)}" placeholder="選項名稱">
      ${key === 'battery' ? `<label class="pr-pct"><span>下限</span><input class="input num" data-rf="min" inputmode="numeric" value="${esc(x.min ?? '')}"><span>%</span></label>` : ''}
      ${key === 'accessories' ? '' : `<label class="pr-pct">${key === 'battery' ? '<span>未達標準</span>' : ''}<input class="input num" data-rf="pct" inputmode="numeric" value="${esc(x.pct ?? '')}" ${x.inspect ? 'disabled' : ''}><span>${key === 'issues' ? '% 扣' : '%'}</span></label>`}
      ${withInspect ? `<label class="check small"><input type="checkbox" data-rf="inspect" ${x.inspect ? 'checked' : ''}> 需檢測</label>` : ''}
      <button type="button" class="ph-del static" data-rdel aria-label="刪除">✕</button></div>`).join('') +
    `<button type="button" class="link" data-radd="${key}" style="font-size:13px">＋ 新增選項</button>`;
  $('#pzBody').innerHTML = `<p class="small muted pz-hint">客戶看到的預估價＝最高收購價 × 外觀% × 電池% ×（1 − 故障扣%）− 缺少配件；再往下顯示 ${esc(R.spread)}% 的區間。<button class="link" id="ruleHist">🕘 規則修改紀錄</button></p>
    <div class="pz-grid">
      <div class="card"><h3>外觀</h3>${ruleRows('appearance')}</div>
      <div class="card"><h3>電池健康度</h3><p class="small muted" style="margin:-4px 0 10px">客戶選的級距「下限」達到該型號的「電池要求%」就不扣；未達才乘「未達標準 %」。</p>${ruleRows('battery')}</div>
      <div class="card"><h3>盒子與配件</h3><p class="small muted" style="margin:-4px 0 10px">每缺一項扣該型號的「配件扣款」（在收購價格的「進階」設定）。</p>${ruleRows('accessories')}</div>
      <div class="card"><h3>故障</h3><p class="small muted" style="margin:-4px 0 10px">勾「需檢測」＝不顯示價格，改顯示「需實際檢測後報價」</p>${ruleRows('issues', true)}</div>
      <div class="card"><h3>其他</h3>
        <div class="grid2"><label class="field"><span>價格區間（%）</span><input class="input num" id="prSpread" inputmode="numeric" value="${esc(R.spread)}" style="max-width:100px"></label>
        <label class="field"><span>預設電池要求（%）</span><input class="input num" id="prBatDef" inputmode="numeric" value="${esc(R.batteryDefault ?? 90)}" style="max-width:100px"></label></div>
        <label class="field" style="margin:0"><span>給客戶的說明</span><textarea class="input" id="prNote">${esc(R.note)}</textarea></label></div>
    </div>`;
  $('#ruleHist').onclick = () => pzHistory('收購價', '扣款規則');
  $$('[data-rk]').forEach(row => {
    const x = R[row.dataset.rk][+row.dataset.ri];
    $$('[data-rf]', row).forEach(el => el.oninput = el.onchange = () => {
      if (el.dataset.rf === 'inspect') { x.inspect = el.checked; pzRulesTab(); pzRefreshMarks(); return; }
      x[el.dataset.rf] = ['pct', 'min'].includes(el.dataset.rf) ? el.value.replace(/[^\d]/g, '') : el.value; pzRefreshMarks();
    });
    $('[data-rdel]', row).onclick = () => { R[row.dataset.rk].splice(+row.dataset.ri, 1); pzRulesTab(); pzRefreshMarks(); };
  });
  $$('[data-radd]').forEach(b => b.onclick = () => { R[b.dataset.radd].push(b.dataset.radd === 'accessories' ? { label: '' } : b.dataset.radd === 'battery' ? { label: '', min: 0, pct: 80 } : { label: '', pct: b.dataset.radd === 'issues' ? 10 : 90 }); pzRulesTab(); pzRefreshMarks(); });
  $('#prSpread').oninput = e => { R.spread = e.target.value.replace(/[^\d]/g, ''); pzRefreshMarks(); };
  $('#prBatDef').oninput = e => { R.batteryDefault = e.target.value.replace(/[^\d]/g, ''); pzRefreshMarks(); };
  $('#prNote').oninput = e => { R.note = e.target.value; pzRefreshMarks(); };
}

/* ---------- 維修價格 ---------- */
function pzRepairTab() {
  if (!pz.cat) pz.cat = '手機';
  $('#pzBody').innerHTML = `<p class="small muted pz-hint">${pz.repairFromSite ? '⚠️ 目前使用網站內建的官網價目（2026-11-22 整理）。修改後按「儲存維修價目」，之後就改由後台管理，並記錄每次調價。' : '新增維修單時，型號的維修項目與價格會從這裡帶入。'}</p>${pzToolbar(PZ_REPAIR_CATS, '＋ 新增型號')}`;
  $$('[data-pzc=""]').forEach(b => b.remove()); // 維修價目一次看一個類別
  pzBindToolbar(pzRepairList);
  $('#pzAdd').onclick = () => { pz.repair.unshift({ category: pz.cat || '手機', model: '', item: '', price: '', _new: 1 }); pz.q = ''; $('#pzQ').value = ''; pzRepairList(); pzRefreshMarks(); $('[data-rm]')?.focus(); };
  pzRepairList();
}
function pzRepairList() {
  const q = pz.q.trim().toLowerCase(), g = [], idx = {};
  const hit = new Set(q ? pz.repair.filter(r => (r.model + ' ' + r.item).toLowerCase().includes(q)).map(r => r.category + '|' + r.model) : []);
  pz.repair.forEach((r, i) => {
    if (pz.cat && r.category !== pz.cat) return;
    const k = r._new && !r.model ? 'new' + i : r.category + '|' + r.model;
    if (q && !hit.has(r.category + '|' + r.model) && !r._new) return;
    if (!(k in idx)) { idx[k] = g.length; g.push({ category: r.category, model: r.model, rows: [] }); }
    g[idx[k]].rows.push(i);
  });
  $('#pzList').innerHTML = g.length ? `<div class="pz-grid">${g.slice(0, 80).map((x, gi) => `<div class="card pz-card">
      <div class="pz-card-h"><input class="input pz-model" data-rm="${gi}" value="${esc(x.model)}" placeholder="型號，例：iPhone 17 Pro">
        ${x.model ? `<button class="btn btn-ghost btn-sm" data-rhist="${esc(x.model)}" title="歷屆價格">🕘</button>` : ''}</div>
      <table class="pz-t"><thead><tr><th>維修項目</th><th style="width:110px">價格</th><th></th></tr></thead><tbody>
        ${x.rows.map(i => { const r = pz.repair[i], o = pz.repairOrig[pzRepKey(r)], chg = !o || pzVal(o.price) !== pzVal(r.price);
          return `<tr><td><input class="input" data-ri2="${i}" data-rit value="${esc(r.item)}" placeholder="例：更換電池"></td>
            <td><input class="input num ${chg ? 'pz-chg' : ''}" data-ri2="${i}" data-rpr value="${esc(pzVal(r.price))}" inputmode="numeric" placeholder="0" ${chg ? `title="${o ? '原本：' + esc(pzVal(o.price) || '0') : '新增'}"` : ''}></td>
            <td><button type="button" class="ph-del static" data-rdel2="${i}" aria-label="刪除">✕</button></td></tr>`; }).join('')}
      </tbody></table>
      <div class="pz-card-f"><button type="button" class="link" data-radd2="${gi}">＋ 新增項目</button></div></div>`).join('')}</div>
      ${g.length > 80 ? `<p class="small muted">還有 ${g.length - 80} 個型號，請用搜尋縮小範圍</p>` : ''}` : '<div class="card empty">沒有符合的型號</div>';
  const L = $('#pzList');
  $$('[data-rpr]', L).forEach(el => el.oninput = () => {
    const r = pz.repair[+el.dataset.ri2]; r.price = el.value.replace(/[^\d]/g, ''); if (el.value !== r.price) el.value = r.price;
    const o = pz.repairOrig[pzRepKey(r)]; pzMark(el, !o || pzVal(o.price) !== pzVal(r.price), o ? pzVal(o.price) : undefined); pzRefreshMarks();
  });
  $$('[data-rit]', L).forEach(el => el.onchange = () => { pz.repair[+el.dataset.ri2].item = el.value.trim(); pzRepairList(); pzRefreshMarks(); });
  $$('[data-rm]', L).forEach(el => el.onchange = () => { g[+el.dataset.rm].rows.forEach(i => { pz.repair[i].model = el.value.trim(); }); pzRepairList(); pzRefreshMarks(); });
  $$('[data-rdel2]', L).forEach(b => b.onclick = () => { pz.repair.splice(+b.dataset.rdel2, 1); pzRepairList(); pzRefreshMarks(); });
  $$('[data-radd2]', L).forEach(b => b.onclick = () => {
    const x = g[+b.dataset.radd2], last = x.rows[x.rows.length - 1];
    pz.repair.splice(last + 1, 0, { category: x.category, model: x.model, item: '', price: '', _new: 1 });
    pzRepairList(); pzRefreshMarks();
  });
  $$('[data-rhist]', L).forEach(b => b.onclick = () => pzHistory('維修價', b.dataset.rhist));
}
async function pzSaveRepair() {
  const rows = pz.repair.filter(r => r.model.trim() && r.item.trim()).map(({ _new, ...x }) => ({ ...x, price: numv(x.price) }));
  const b = $('#pzSave'); b.disabled = true; b.textContent = '儲存中…';
  try {
    const r = await api('repairPricesSave', { rows });
    pzLoadRepair(r.rows); pz.log = null;
    toast(r.changed ? `已儲存維修價目（${r.changed} 項變動）` : '已儲存'); pzDraw();
  } catch (e) { if (e.auth) return start(); toast(e.message); b.disabled = false; b.textContent = '儲存維修價目'; }
}

/* ---------- 價格紀錄（歷屆數據） ---------- */
async function pzLogTab() {
  $('#pzBody').innerHTML = `<div class="toolbar pz-tool"><input class="input" id="pzLQ" placeholder="搜尋 型號／IMEI／庫存編號／經手人" value="${esc(pz.logQ)}">
      <div class="tabs">${[['', '全部'], ['收購價', '收購價'], ['維修價', '維修價'], ['建議售價表', '建議售價表'], ['建議售價', '單台售價'], ['設定', '設定']].map(([k, l]) => `<button data-plt="${k}" class="${pz.logType === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div id="pzLog"><div class="spinner"></div></div>`;
  $('#pzLQ').oninput = e => { pz.logQ = e.target.value; pzLogList(); };
  $$('[data-plt]').forEach(b => b.onclick = () => { pz.logType = b.dataset.plt; $$('[data-plt]').forEach(x => x.classList.toggle('on', x === b)); pzLogList(); });
  if (!pz.log) { try { pz.log = (await api('priceLog', {})).logs; } catch (e) { if (e.auth) return start(); $('#pzLog').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; } }
  pzLogList();
}
const pzMoneyish = f => /價|扣款/.test(f);
const pzArrow = x => { const a = Number(x.before), b = Number(x.after); return pzMoneyish(x.field) && x.before !== '' && x.after !== '' && !isNaN(a) && !isNaN(b) && a !== b ? `<span class="${b > a ? 'pz-up' : 'pz-down'}">${b > a ? '▲' : '▼'} ${money(Math.abs(b - a))}</span>` : ''; };
const pzFmt = (x, v) => v === '' ? '<span class="sub">（空白）</span>' : pzMoneyish(x.field) && /^\d+$/.test(v) ? 'NT$ ' + money(v) : esc(v);
function pzLogRows(list) {
  return `<table class="table pz-log"><thead><tr><th>時間</th><th>項目</th><th>變動</th><th class="hide-m">經手人</th></tr></thead><tbody>
    ${list.map(x => `<tr><td class="sub num" style="white-space:nowrap">${esc(x.at)}<div><span class="pill off">${esc(x.type)}</span></div></td>
      <td><b>${esc(x.key.replace(/｜/g, ' ・ '))}</b><div class="sub">${esc(x.field)}</div></td>
      <td>${x.field === '新增' ? `<span class="pill">新增</span> ${esc(x.after)}` : x.field === '刪除' ? `<span class="pill warn">刪除</span> <span class="sub">${esc(x.before)}</span>` : `${pzFmt(x, x.before)} → <b>${pzFmt(x, x.after)}</b> ${pzArrow(x)}`}<div class="sub show-m">${esc(x.by)}</div></td>
      <td class="sub hide-m">${esc(x.by)}</td></tr>`).join('')}</tbody></table>`;
}
function pzLogList() {
  const q = pz.logQ.trim().toLowerCase();
  const list = (pz.log || []).filter(x => (!pz.logType || x.type === pz.logType) && (!q || [x.key, x.field, x.by].join(' ').toLowerCase().includes(q)));
  $('#pzLog').innerHTML = list.length ? `<p class="small muted" style="margin:0 0 8px">共 ${list.length} 筆${list.length >= 3000 ? '（只顯示最近 3000 筆）' : ''}・也存在試算表「價格紀錄」分頁</p>${pzLogRows(list.slice(0, 500))}${list.length > 500 ? '<p class="small muted">只列出前 500 筆，請用搜尋縮小範圍</p>' : ''}`
    : `<div class="card empty">${(pz.log || []).length ? '沒有符合的紀錄' : '還沒有價格紀錄，儲存價格後就會開始記錄'}</div>`;
}

/** 單一型號／項目的歷屆價格：每個欄位一條走勢線＋明細 */
async function pzHistory(type, model) {
  const d = $('#drawer');
  d.innerHTML = `<div class="d-head"><b>🕘 ${esc(model)}・歷屆${esc(type)}</b><button class="d-close" aria-label="關閉">✕</button></div><div class="d-body"><div class="spinner"></div></div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  let logs;
  try { logs = (await api('priceLog', { type, q: model })).logs; } catch (e) { if (e.auth) return start(); $('.d-body', d).innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
  logs = logs.filter(x => x.key.split('｜')[1] === model || x.key.split('｜')[1]?.startsWith(model + ' ') || x.key === model);
  $('.d-body', d).innerHTML = logs.length ? `${pzTrends(logs)}<div class="card"><h3>變動明細（${logs.length}）</h3>${pzLogRows(logs)}</div>`
    : '<div class="card empty">這個型號還沒有價格變動紀錄<br><span class="small">之後每次修改價格都會記錄在這裡</span></div>';
}
/** 走勢：同一個項目＋欄位，依時間串成一條線（至少 2 個點才畫） */
function pzTrends(logs) {
  const series = {};
  [...logs].reverse().forEach(x => {
    if (!pzMoneyish(x.field) || !/^\d*$/.test(x.after)) return;
    const k = x.key.split('｜').slice(1).join(' ') + '｜' + x.field;
    const s = series[k] = series[k] || [];
    if (!s.length && /^\d+$/.test(x.before)) s.push({ at: '', v: Number(x.before) });
    if (x.after !== '') s.push({ at: x.at, v: Number(x.after) });
  });
  const lines = Object.entries(series).filter(([, s]) => s.length >= 2);
  if (!lines.length) return '';
  return `<div class="card"><h3>價格走勢</h3>${lines.map(([k, s]) => {
    const w = 260, h = 46, min = Math.min(...s.map(p => p.v)), max = Math.max(...s.map(p => p.v)), span = max - min || 1;
    const pts = s.map((p, i) => [Math.round(i / (s.length - 1) * (w - 8) + 4), Math.round(h - 6 - (p.v - min) / span * (h - 12))]);
    const last = s[s.length - 1].v, first = s[0].v;
    return `<div class="pz-trend"><div><b>${esc(k.replace('｜', '・'))}</b><div class="sub">NT$ ${money(first)} → <b>NT$ ${money(last)}</b> ${last !== first ? `<span class="${last > first ? 'pz-up' : 'pz-down'}">${last > first ? '▲' : '▼'} ${money(Math.abs(last - first))}</span>` : ''}・${s.length} 次</div></div>
      <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="價格走勢"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="currentColor"/>`).join('')}</svg></div>`;
  }).join('')}</div>`;
}

/* ============================== 庫存：建議售價（現金／刷卡） ============================== */
let stFee = 3;
const cardOf = cash => cash ? Math.ceil(cash * (1 + stFee / 100) / 10) * 10 : 0;
/* ---------- 建議售價表（依型號＋容量；入庫自動帶入） ---------- */
function pzLoadSale(rows) {
  pz.saleOrig = {}; rows.forEach(r => { pz.saleOrig[saleKey(r.model, r.capacity)] = { ...r }; });
  // 型號清單：售價表＋目前庫存＋收購價表
  const m = {};
  const add = (cat, model, cap) => { if (!model) return; const k = saleKey(model, cap); if (!m[k]) m[k] = { category: saleCatOf(cat), model, capacity: cap || '', cash: '', card: '', n: 0 }; return m[k]; };
  rows.forEach(r => Object.assign(add(r.category, r.model, r.capacity), { category: r.category || saleCatOf(''), cash: r.cash || '', card: r.card || '' }));
  (stockCache || []).filter(r => r.status !== '已售出').forEach(r => { const x = add(r.category, r.model, r.capacity); if (x) x.n++; });
  (pz.buy || []).forEach(r => add(r.category, r.model, r.capacity));
  pz.sale = Object.values(m).sort((a, b) => byName(a.category, b.category) || byName(a.model, b.model) || byName(a.capacity, b.capacity));
}
function pzSaleTab() {
  const cats = SALE_CATS.filter(c => pz.sale.some(r => r.category === c));
  $('#pzBody').innerHTML = `<p class="small muted pz-hint">每個型號＋容量設定一次，之後入庫的機器會自動帶入；在庫中「依型號」的機器儲存後會一起更新。特殊機況請到庫存明細手動定價並備註（不會被這裡覆蓋）。
      刷卡價空白＝現金價＋${esc(stFee)}% 手續費 <button class="link" id="pzFee">修改手續費</button></p>
    <div class="toolbar pz-tool"><input class="input" id="pzQ" placeholder="搜尋型號" value="${esc(pz.q)}">
      <div class="tabs">${['', ...cats].map(c => `<button data-pzc="${esc(c)}" class="${pz.cat === c ? 'on' : ''}">${c || '全部'}</button>`).join('')}
        <button id="pzOnly" class="${pz.saleOnlyStock ? 'on' : ''}">只看有庫存的</button></div>
      <button class="btn btn-ghost btn-sm" id="pzAdd">＋ 新增型號</button></div><div id="pzList"></div>`;
  pzBindToolbar(pzSaleList);
  $('#pzOnly').onclick = e => { pz.saleOnlyStock = !pz.saleOnlyStock; e.currentTarget.classList.toggle('on', pz.saleOnlyStock); pzSaleList(); };
  $('#pzFee').onclick = () => setCardFee(() => { pzDraw(); });
  $('#pzAdd').onclick = () => { pz.sale.unshift({ category: pz.cat || '手機', model: '', capacity: '', cash: '', card: '', n: 0, _new: 1 }); pz.q = ''; pz.saleOnlyStock = false; pzSaleTab(); $('[data-sm]')?.focus(); };
  pzSaleList();
}
function pzSaleList() {
  const q = pz.q.trim().toLowerCase(), g = [], idx = {};
  pz.sale.forEach((r, i) => {
    if (pz.cat && r.category !== pz.cat) return;
    if (q && !(r.model + ' ' + r.capacity).toLowerCase().includes(q) && !r._new) return;
    if (pz.saleOnlyStock && !r.n && !r._new && !numv(r.cash)) return;
    const k = r._new && !r.model ? 'new' + i : r.category + '|' + r.model;
    if (!(k in idx)) { idx[k] = g.length; g.push({ category: r.category, model: r.model, rows: [], n: 0 }); }
    g[idx[k]].rows.push(i); g[idx[k]].n += r.n;
  });
  const cell = (i, f) => { const r = pz.sale[i], o = pz.saleOrig[saleKey(r.model, r.capacity)], chg = o ? pzVal(o[f]) !== pzVal(r[f]) : !!pzVal(r[f]);
    return `<input class="input num ${chg ? 'pz-chg' : ''}" data-si="${i}" data-sf="${f}" value="${esc(pzVal(r[f]))}" inputmode="numeric" placeholder="${f === 'cash' ? '未設定' : r.cash ? '自動 ' + money(cardOf(numv(r.cash))) : '自動'}" ${chg ? `title="${o ? '原本：' + esc(pzVal(o[f]) || '（空白）') : '新增'}"` : ''}>`; };
  $('#pzList').innerHTML = g.length ? `<div class="pz-grid">${g.slice(0, 120).map((x, gi) => `<div class="card pz-card">
      <div class="pz-card-h"><input class="input pz-model" data-sm="${gi}" value="${esc(x.model)}" placeholder="型號，例：iPhone 17 Pro">
        ${x.n ? `<span class="pill">在庫 ${x.n}</span>` : ''}${x.model ? `<button class="btn btn-ghost btn-sm" data-shist2="${esc(x.model)}" title="歷屆售價">🕘</button>` : ''}</div>
      <table class="pz-t"><thead><tr><th>容量</th><th>現金價</th><th>刷卡價</th><th></th></tr></thead><tbody>
        ${x.rows.map(i => { const r = pz.sale[i]; return `<tr><td>${r._new ? `<input class="input" data-si="${i}" data-scap value="${esc(r.capacity)}" placeholder="容量">` : `<b style="font-size:14px">${esc(r.capacity || '—')}</b>`}${r.n ? `<div class="sub">在庫 ${r.n} 台</div>` : ''}</td>
          <td>${cell(i, 'cash')}</td><td>${cell(i, 'card')}</td><td>${numv(r.cash) ? `<button type="button" class="ph-del static" data-sclr="${i}" title="清除這個容量的售價" aria-label="清除">✕</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table>
      <div class="pz-card-f"><button type="button" class="link" data-sadd="${gi}">＋ 新增容量</button></div></div>`).join('')}</div>
      ${g.length > 120 ? `<p class="small muted">還有 ${g.length - 120} 個型號，請用搜尋縮小範圍</p>` : ''}`
    : `<div class="card empty">${pz.saleOnlyStock ? '目前沒有在庫的機器；按上方「只看有庫存的」可以看全部型號' : '沒有符合的型號'}</div>`;
  const L = $('#pzList');
  $$('[data-sf]', L).forEach(el => el.oninput = () => {
    const i = +el.dataset.si, r = pz.sale[i], f = el.dataset.sf; r[f] = el.value.replace(/[^\d]/g, ''); if (el.value !== r[f]) el.value = r[f];
    const o = pz.saleOrig[saleKey(r.model, r.capacity)]; pzMark(el, o ? pzVal(o[f]) !== pzVal(r[f]) : !!r[f], o ? pzVal(o[f]) : undefined);
    if (f === 'cash') { const c = $(`[data-si="${i}"][data-sf="card"]`, L); if (c) c.placeholder = r.cash ? '自動 ' + money(cardOf(numv(r.cash))) : '自動'; }
    pzRefreshMarks();
  });
  $$('[data-scap]', L).forEach(el => el.onchange = () => { pz.sale[+el.dataset.si].capacity = el.value.trim(); pzRefreshMarks(); });
  $$('[data-sm]', L).forEach(el => el.onchange = () => { g[+el.dataset.sm].rows.forEach(i => { pz.sale[i].model = el.value.trim(); }); pzSaleList(); pzRefreshMarks(); });
  $$('[data-sclr]', L).forEach(b => b.onclick = () => { const r = pz.sale[+b.dataset.sclr]; r.cash = ''; r.card = ''; pzSaleList(); pzRefreshMarks(); });
  $$('[data-sadd]', L).forEach(b => b.onclick = () => { const x = g[+b.dataset.sadd], last = x.rows[x.rows.length - 1]; pz.sale.splice(last + 1, 0, { category: x.category, model: x.model, capacity: '', cash: '', card: '', n: 0, _new: 1 }); pzSaleList(); });
  $$('[data-shist2]', L).forEach(b => b.onclick = () => pzHistory('建議售價表', b.dataset.shist2));
}
async function pzSaveSale() {
  const rows = pz.sale.filter(r => r.model.trim() && numv(r.cash)).map(r => ({ category: r.category, model: r.model.trim(), capacity: r.capacity, cash: numv(r.cash), card: numv(r.card) }));
  const bad = rows.find(r => r.card && r.card < r.cash);
  if (bad) return toast(`「${bad.model} ${bad.capacity}」刷卡價不能低於現金價`);
  const b = $('#pzSave'); b.disabled = true; b.textContent = '儲存中…';
  try {
    const r = await api('saleTableSave', { rows });
    stockCache = (await api('stockList')).items; pzLoadSale(r.rows); pz.log = null;
    toast(`已儲存建議售價表${r.synced ? `，${r.synced} 台在庫機器已更新售價` : ''}`); pzDraw();
  } catch (e) { if (e.auth) return start(); toast(e.message); b.disabled = false; b.textContent = '儲存並套用到在庫'; }
}

/* ---------- 庫存明細：建議售價（依型號／特殊機況） ---------- */
const suggestHTML = r => r.suggestCash ? `<b class="num">NT$ ${money(r.suggestCash)}</b>${r.suggestMode === 'manual' ? ' <span class="pill warn" title="' + esc(r.suggestNote) + '">特殊</span>' : ''}<div class="sub num">刷卡 NT$ ${money(r.suggestCard)}</div>` : '<span class="sub">未設定</span>';
function suggestCard(r) {
  const can = P('edit_stock') && r.status !== '已售出', manual = r.suggestMode === 'manual';
  const table = r.tableCash ? `NT$ ${money(r.tableCash)}／刷卡 NT$ ${money(r.tableCard)}` : '建議售價表還沒有這個型號';
  return `<div class="card"><h3>建議售價 <button class="link" data-shist style="font-size:13px;font-weight:500">🕘 售價紀錄</button></h3>
    <div class="grid2"><div><div class="small muted">現金價</div><b class="num" style="font-size:22px">${r.suggestCash ? 'NT$ ' + money(r.suggestCash) : '未設定'}</b></div>
      <div><div class="small muted">刷卡價</div><b class="num" style="font-size:22px">${r.suggestCard ? 'NT$ ' + money(r.suggestCard) : '—'}</b></div></div>
    <p class="small" style="margin:8px 0 0">${manual ? `<span class="pill warn">特殊機況</span> ${esc(r.suggestNote)}<br><span class="muted">依型號價格：${esc(table)}</span>` : r.suggestCash ? `<span class="pill">依型號</span> <span class="muted">由建議售價表帶入</span>` : `<span class="muted">${esc(table)}</span>`}</p>
    ${showCost() && r.cost && r.suggestCash ? `<p class="small muted" style="margin:4px 0 0">成本 NT$ ${money(r.cost)}・預估毛利（現金）<b>NT$ ${money(r.suggestCash - r.cost)}</b></p>` : ''}
    ${r.suggestAt ? `<p class="small muted" style="margin:4px 0 0">設定：${esc(r.suggestAt)}・${esc(r.suggestBy)}</p>` : ''}
    ${can ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-ghost btn-sm" id="sgOpen">✏️ 特殊機況，手動定價</button>
        ${manual && r.tableCash ? '<button class="btn btn-ghost btn-sm" id="sgAuto">↩ 改回依型號價格</button>' : ''}</div>
      <div id="sgForm" hidden style="margin-top:12px"><div class="grid2">
        <label class="field"><span>現金價（NT$）</span><input class="input num" id="sgCash" inputmode="numeric" value="${esc(r.suggestCash || '')}"></label>
        <label class="field"><span>刷卡價（NT$）<small class="muted">　空白＝自動 +${esc(stFee)}%</small></span><input class="input num" id="sgCard" inputmode="numeric" value="${manual ? esc(r.suggestCard || '') : ''}" placeholder="自動計算"></label></div>
        <label class="field"><span>特殊機況（必填）</span><textarea class="input" id="sgNote" rows="2" placeholder="例：螢幕有烙印、電池 78%、背蓋有裂痕">${esc(manual ? r.suggestNote : '')}</textarea></label>
        <button class="btn btn-dark btn-sm" id="sgSave">儲存特殊機況售價</button></div>` : ''}
    <div id="sgHist"></div></div>`;
}
function bindSuggest(d, r, done) {
  const hist = $('[data-shist]', d);
  if (hist) hist.onclick = async () => {
    const box = $('#sgHist', d); box.innerHTML = '<div class="spinner"></div>';
    try {
      const logs = (await api('priceLog', { type: '建議售價', q: r.sku })).logs.filter(x => x.key.startsWith(r.sku + '｜'));
      box.innerHTML = logs.length ? pzLogRows(logs) : '<p class="small muted" style="margin:8px 0 0">還沒有售價紀錄</p>';
    } catch (e) { box.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  };
  const run = async (data, btn, msg) => {
    btn.disabled = true;
    try {
      const res = await api('stockSuggest', { sku: r.sku, ...data });
      res.items.forEach(it => { const i = stockCache.findIndex(x => x.sku === it.sku); if (i >= 0) stockCache[i] = it; });
      toast(msg(res)); done(res.items[0]);
    } catch (x) { if (x.auth) return start(); toast(x.message); btn.disabled = false; }
  };
  if ($('#sgOpen', d)) $('#sgOpen', d).onclick = () => { $('#sgForm', d).hidden = false; $('#sgCash', d).focus(); };
  if ($('#sgAuto', d)) $('#sgAuto', d).onclick = async e => {
    const btn = e.currentTarget; // await 之後 currentTarget 會變成 null，先存起來
    if (!(await ask(`改回依型號價格？\n\n現金 NT$ ${money(r.tableCash)}／刷卡 NT$ ${money(r.tableCard)}`, '改回'))) return;
    run({ mode: 'auto' }, btn, res => `已改回依型號價格：NT$ ${money(res.cash)}`);
  };
  const cash = $('#sgCash', d), card = $('#sgCard', d);
  if (!cash) return;
  cash.oninput = () => { cash.value = cash.value.replace(/[^\d]/g, ''); card.placeholder = cash.value ? '自動 ' + money(cardOf(numv(cash.value))) : '自動計算'; };
  card.oninput = () => { card.value = card.value.replace(/[^\d]/g, ''); };
  $('#sgSave', d).onclick = e => {
    const c = numv(cash.value), note = $('#sgNote', d).value.trim();
    if (!c) return toast('請填寫現金價');
    if (!note) { $('#sgNote', d).focus(); return toast('請備註特殊機況'); }
    run({ mode: 'manual', cash: c, card: card.value ? numv(card.value) : '', note }, e.currentTarget, res => `已設定特殊機況售價：現金 NT$ ${money(res.cash)}／刷卡 NT$ ${money(res.card)}`);
  };
}
/** 庫存「依型號總清單」的「設定售價」→ 建議售價表 */
function suggestBatch(model) { pz.tab = 'sale'; pz.q = model; pz.cat = ''; pz.saleOnlyStock = false; pz.sale = null; location.hash = '#prices'; }
/** 刷卡手續費設定 */
async function setCardFee(after) {
  const w = document.createElement('div');
  w.className = 'ask-wrap';
  w.innerHTML = `<div class="ask-box" role="dialog" aria-modal="true"><p>刷卡手續費（%）<br><span class="small muted">刷卡價＝現金價 ×（1＋手續費），進位到 10 元。只影響之後設定的售價。</span></p>
    <input class="input num" id="feeIn" inputmode="decimal" value="${esc(stFee)}" style="text-align:center;font-size:20px;margin-bottom:14px">
    <div class="ask-btns"><button type="button" class="btn btn-ghost" data-v="0">取消</button><button type="button" class="btn btn-dark" data-v="1">儲存</button></div></div>`;
  document.body.appendChild(w);
  $('#feeIn', w).select();
  w.onclick = async e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (e.target === w || v === '0') return w.remove();
    if (v !== '1') return;
    try { const r = await api('stockSettings', { cardFee: Number($('#feeIn', w).value) || 0 }); stFee = r.cardFee; w.remove(); toast(`刷卡手續費已設為 ${stFee}%${r.synced ? `，${r.synced} 台依型號的刷卡價已更新` : ''}`); stockCache = null; pz.sale = null; if (after) after(); else stockPage(); }
    catch (x) { if (x.auth) return start(); toast(x.message); }
  };
}
