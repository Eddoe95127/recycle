/* ============================== 人資系統（後台） ==============================
 * 員工：打卡（限門市附近）、我的出勤、請假／加班／補打卡申請、特休餘額、薪資單
 * 主管：審核、出勤總表（補登打卡）、員工資料（到職日、班別、薪資）、薪資計算、打卡設定
 * 計算用 hr-calc.js（HRC），與後端共用
 */
const isHrRoute = page => page.startsWith('hr/');
const hrMonthNow = () => localDay().slice(0, 7);
const hrH = h => (Math.round(h * 10) / 10) + ' 小時';
const hrMin = m => m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60 ? m % 60 + ' 分' : ''}` : `${m} 分`;
const HR_ST_COLOR = { '待核准': 'warn', '已核准': 'ok', '已退回': 'off', '已取消': 'off' };
const hrBadge = s => `<span class="pill ${HR_ST_COLOR[s] || ''}">${esc(s)}</span>`;
let hrState = { meMonth: '', me: null, attMonth: '', att: null, reqStatus: '待核准', payMonth: '' };

function hrRoute(page) {
  $('#refresh').hidden = false;
  const go = (fn) => { $('#refresh').onclick = () => fn(true); return fn(); };
  if (page === 'hr/clock') return go(hrClockPage);
  if (page === 'hr/me') return go(hrMePage);
  if (page === 'hr/approve' && P('hr_manage')) return go(hrApprovePage);
  if (page === 'hr/attendance' && P('hr_manage')) return go(hrAttendancePage);
  if (page === 'hr/staff' && P('hr_manage')) return go(hrStaffPage);
  if (page === 'hr/payroll' && P('payroll')) return go(hrPayrollPage);
  if (page === 'hr/settings' && P('hr_manage')) return go(hrSettingsPage);
  location.hash = '#hr/clock';
}
async function hrLoad(page, fn) {
  app.innerHTML = pagesNav(page) + '<div class="spinner"></div>';
  try { return await fn(); } catch (e) { if (e.auth) { start(); return null; } app.innerHTML = pagesNav(page) + `<div class="card empty">${esc(e.message)}</div>`; return null; }
}

/* ---------- 打卡 ---------- */
let hrTick = null;
async function hrClockPage() {
  const me = await hrLoad('hr/clock', () => api('hrMe', { month: hrMonthNow() }));
  if (!me) return;
  hrState.me = me; hrState.meMonth = me.month;
  if (me.owner) { app.innerHTML = pagesNav('hr/clock') + `<div class="card empty">老闆帳號不用打卡。<br><span class="small">員工請用自己的員工帳號登入後打卡。${me.hasLocation ? '' : '<br>⚠️ 還沒有設定門市位置，請到「人資 → 打卡設定」設定，員工才能打卡。'}</span></div>`; return; }
  const p = me.profile, wd = (p.workdays || []).includes(new Date().getDay());
  const tc = me.todayClocks, lastIn = tc.filter(c => c.type === '上班').pop(), lastOut = tc.filter(c => c.type === '下班').pop();
  const next = !lastIn ? '上班' : !lastOut || lastOut.at < lastIn.at ? '下班' : '上班';
  app.innerHTML = `${pagesNav('hr/clock')}
    <div class="card hr-clock">
      <div class="hr-now num" id="hrNow">--:--:--</div>
      <div class="muted">${esc(localDay())}（${HRC.WEEK[new Date().getDay()]}）・${wd ? `今天班別 ${esc(p.shiftStart)}–${esc(p.shiftEnd)}` : '今天是休假日'}</div>
      ${me.hasLocation ? '' : '<div class="alert" style="margin-top:12px">還沒有設定門市位置，請主管到「人資 → 打卡設定」設定</div>'}
      <div class="hr-btns">
        <button class="hr-btn in ${next === '上班' ? 'on' : ''}" data-ck="上班"><b>上班打卡</b><small>${lastIn ? '已打 ' + esc(lastIn.at.slice(11, 16)) : '尚未打卡'}</small></button>
        <button class="hr-btn out ${next === '下班' ? 'on' : ''}" data-ck="下班"><b>下班打卡</b><small>${lastOut ? '已打 ' + esc(lastOut.at.slice(11, 16)) : '尚未打卡'}</small></button>
      </div>
      <p class="small muted" style="margin:0">打卡會檢查您是否在門市 ${esc(me.radius)} 公尺內，請允許網站使用位置。</p>
      <p class="err" id="ckErr" style="margin:8px 0 0"></p>
    </div>
    <div class="card"><h3>今天的打卡</h3>${tc.length ? `<ul class="hr-list">${tc.map(c => `<li><b>${esc(c.type)}</b> <span class="num">${esc(c.at.slice(11, 16))}</span> <span class="sub">${c.dist != null ? '距門市 ' + c.dist + ' 公尺' : esc(c.source)}</span></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">今天還沒有打卡</p>'}</div>
    ${me.annual ? `<div class="card hr-mini"><div><div class="small muted">特休剩餘</div><b class="num">${me.annual.left} 天</b></div><div><div class="small muted">年資</div><b>${esc(p.seniority || '—')}</b></div>
      <a class="btn btn-ghost btn-sm" href="#hr/me">我的出勤與申請 →</a></div>` : '<div class="card"><a class="btn btn-ghost btn-block" href="#hr/me">我的出勤與申請 →</a></div>'}`;
  clearInterval(hrTick);
  const tick = () => { const n = $('#hrNow'); if (!n) return clearInterval(hrTick); n.textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false }); };
  tick(); hrTick = setInterval(tick, 1000);
  $$('[data-ck]').forEach(b => b.onclick = () => hrDoClock(b.dataset.ck, b));
}
function hrDoClock(type, btn) {
  const err = m => { const e = $('#ckErr'); if (e) e.textContent = m || ''; }; // 定位途中切換頁面時元素已不在
  if (!navigator.geolocation) return err('這台裝置無法定位，請改用手機打卡');
  btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<b>定位中…</b><small>請稍候</small>'; err('');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const r = await api('hrClock', { type, lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
      toast(`${type}打卡成功 ${r.clock.at.slice(11, 16)}${r.dup ? '（剛剛已經打過）' : ''}`);
      hrClockPage();
    } catch (e) { if (e.auth) return start(); if (location.hash !== '#hr/clock') return toast(e.message); err(e.message); btn.disabled = false; btn.innerHTML = old; }
  }, e => {
    err(e.code === 1 ? '您沒有允許網站使用位置：請到手機的「設定 → Safari／Chrome → 位置」允許後再試' : '無法取得定位，請到靠窗或室外再試一次');
    btn.disabled = false; btn.innerHTML = old;
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

/* ---------- 我的出勤 ---------- */
const hrMonthNav = (id, m) => `<div class="hr-month"><button class="btn btn-ghost btn-sm" data-mv="-1" aria-label="上個月">‹</button><input class="input" type="month" id="${id}" value="${esc(m)}"><button class="btn btn-ghost btn-sm" data-mv="1" aria-label="下個月">›</button></div>`;
function hrBindMonth(id, cb) {
  const el = $('#' + id);
  el.onchange = () => cb(el.value);
  $$('[data-mv]').forEach(b => b.onclick = () => { const [y, m] = el.value.split('-').map(Number); const t = new Date(y, m - 1 + Number(b.dataset.mv), 1); cb(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); });
}
function hrSumCards(s) {
  const lv = Object.entries(s.leaveHours), ot = Object.entries(s.otHours);
  return `<div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
    <div class="stat" style="--c:#0A84FF"><div class="n num">${s.attended}</div><div class="l">出勤天數</div></div>
    <div class="stat" style="--c:#FF9F0A"><div class="n num">${s.lateCount}</div><div class="l">遲到${s.lateMin ? '・' + s.lateMin + ' 分' : ''}</div></div>
    <div class="stat" style="--c:#BF5AF2"><div class="n num">${s.missing + s.earlyCount}</div><div class="l">缺卡／早退</div></div>
    <div class="stat" style="--c:#FF453A"><div class="n num">${s.absentDays}</div><div class="l">曠職（無打卡無請假）</div></div>
    <div class="stat" style="--c:#30D158"><div class="n num">${lv.reduce((t, [, h]) => t + h, 0)}</div><div class="l">請假小時${lv.length ? '<br>' + lv.map(([k, h]) => `${esc(k)} ${h}`).join('、') : ''}</div></div>
    <div class="stat" style="--c:#1d1d1f"><div class="n num">${ot.reduce((t, [, h]) => t + h, 0)}</div><div class="l">核准加班小時</div></div></div>`;
}
function hrDaysTable(days, onDay) {
  return `<table class="table hr-days"><thead><tr><th>日期</th><th>上班</th><th>下班</th><th>狀態</th><th class="hide-m">工時</th></tr></thead><tbody>
    ${days.map(d => `<tr class="${!d.wd ? 'off' : d.absent || d.missing ? 'bad' : d.lateMin || d.earlyMin ? 'warn' : ''}" ${onDay ? `data-day="${d.date}"` : ''}>
      <td class="num">${d.date.slice(5)}（${d.w}）</td><td class="num">${esc(d.in || '—')}${d.lateMin ? `<div class="sub" style="color:#c9372c">遲 ${d.lateMin} 分</div>` : ''}</td>
      <td class="num">${esc(d.out || '—')}${d.earlyMin ? `<div class="sub" style="color:#c9372c">早 ${d.earlyMin} 分</div>` : ''}</td>
      <td>${esc(d.status || '')}${d.leaveHours ? `<div class="sub">${d.leaves.map(l => `${esc(l.type)} ${l.h}h`).join('、')}</div>` : ''}</td>
      <td class="num sub hide-m">${d.workedMin ? hrMin(d.workedMin) : ''}</td></tr>`).join('')}</tbody></table>`;
}
async function hrMePage(refresh) {
  const month = hrState.meMonth || hrMonthNow();
  const me = await hrLoad('hr/me', () => api('hrMe', { month }));
  if (!me) return;
  hrState.me = me;
  if (me.owner) { app.innerHTML = pagesNav('hr/me') + '<div class="card empty">老闆帳號沒有出勤紀錄。<br><span class="small">管理員工出勤請到「出勤總表」。</span></div>'; return; }
  const a = me.annual, p = me.profile;
  app.innerHTML = `${pagesNav('hr/me')}
    <div class="hr-top">
      <div class="card hr-annual"><h3>特休 ${a ? `<span class="small muted" style="font-weight:400">${esc(a.from)}～${esc(a.to)}（${esc(a.label)}）</span>` : ''}</h3>
        ${a ? `<div class="hr-al"><div><b class="num">${a.left}</b><span>剩餘天數</span></div><div><b class="num">${a.used}</b><span>已休</span></div><div><b class="num">${a.pending}</b><span>待核准</span></div><div><b class="num">${a.total}</b><span>本年度共</span></div></div>
          ${a.next ? `<p class="small muted" style="margin:8px 0 0">${esc(a.next)} 起可休 3 天</p>` : ''}` : '<p class="small muted" style="margin:0">主管還沒設定您的到職日，設定後會自動計算特休</p>'}
        <p class="small muted" style="margin:8px 0 0">年資 ${esc(p.seniority || '—')}・班別 ${esc(p.shiftStart)}–${esc(p.shiftEnd)}（週${(p.workdays || []).map(d => HRC.WEEK[d]).join('、')}）</p>
        ${Object.keys(me.leaveUsed).length ? `<p class="small muted" style="margin:4px 0 0">今年已請：${Object.entries(me.leaveUsed).map(([k, v]) => `${esc(k)} ${Math.round(v * 10) / 10} 天`).join('、')}</p>` : ''}</div>
      <div class="card hr-apply"><h3>申請</h3><div class="hr-apply-btns">
        <button class="btn btn-dark" data-apply="請假">🌴 請假</button><button class="btn btn-ghost" data-apply="加班">⏱ 加班</button><button class="btn btn-ghost" data-apply="補打卡">✍️ 補打卡</button></div></div>
    </div>
    <div class="card"><h3>我的申請</h3>${me.requests.length ? `<ul class="hr-list">${me.requests.slice(0, 12).map(q => `<li>${hrBadge(q.status)} <b>${esc(q.kind === '請假' ? q.leaveType : q.kind)}</b> ${esc(hrReqLine(q))}
      ${q.decideNote ? `<div class="sub">審核：${esc(q.decideNote)}（${esc(q.decidedBy)}）</div>` : ''}${q.status === '待核准' ? ` <button class="link" data-cancel="${esc(q.id)}">取消</button>` : ''}</li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">還沒有申請紀錄</p>'}</div>
    ${me.payslips.length ? `<div class="card"><h3>我的薪資單</h3><div class="hr-slips">${me.payslips.map(x => `<button class="btn btn-ghost btn-sm" data-slip="${esc(x.month)}">${esc(x.month)}・NT$ ${money(x.net)}</button>`).join('')}</div></div>` : ''}
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><h3 style="margin:0">出勤紀錄</h3>${hrMonthNav('meM', me.month)}</div>
      ${hrSumCards(me.att.sum)}${hrDaysTable(me.att.days)}</div>`;
  hrBindMonth('meM', m => { hrState.meMonth = m; hrMePage(); });
  $$('[data-apply]').forEach(b => b.onclick = () => hrApplyDrawer(b.dataset.apply));
  $$('[data-cancel]').forEach(b => b.onclick = async () => {
    if (!(await ask('取消這張申請？', '取消申請', '返回'))) return;
    try { await api('hrCancel', { id: b.dataset.cancel }); toast('已取消'); hrMePage(); } catch (e) { if (e.auth) return start(); toast(e.message); }
  });
  $$('[data-slip]').forEach(b => b.onclick = async () => { try { hrSlipDrawer((await api('hrMyPayslip', { month: b.dataset.slip })).slip, false); } catch (e) { toast(e.message); } });
}
function hrReqLine(q) {
  if (q.kind === '請假') return `${q.start}${q.end && q.end !== q.start ? '～' + q.end : ''}・${q.unit === '時數' ? q.hours + ' 小時' : q.unit === '全天' ? q.hours + ' 小時' : q.unit}`;
  if (q.kind === '加班') return `${q.start}・${q.otType}・${q.hours} 小時`;
  return `${q.start} ${q.clockTime} ${q.clockType}`;
}
function hrApplyDrawer(kind) {
  const me = hrState.me, d = $('#drawer'), today = localDay();
  const types = Object.keys(HRC.LEAVE_TYPES);
  d.innerHTML = `<div class="d-head"><b>${kind === '請假' ? '🌴 請假申請' : kind === '加班' ? '⏱ 加班申請' : '✍️ 補打卡申請'}</b><button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body"><div class="card">
      ${kind === '請假' ? `<label class="field"><span>假別</span><select class="input" id="aType">${types.map(t => `<option>${t}</option>`).join('')}</select></label>
        <p class="small muted" id="aTip" style="margin:-4px 0 10px"></p>
        <div class="field"><span>單位</span>${chips('aUnit', ['全天', '上半天', '下半天', '時數'], '全天')}</div>
        <div class="grid2"><label class="field"><span id="aStartL">開始日</span><input class="input" type="date" id="aStart" value="${today}"></label>
          <label class="field" id="aEndBox"><span>結束日</span><input class="input" type="date" id="aEnd" value="${today}"></label>
          <label class="field" id="aHoursBox" hidden><span>時數</span><input class="input num" id="aHours" inputmode="decimal" value="1"></label></div>`
      : kind === '加班' ? `<div class="grid2"><label class="field"><span>加班日期</span><input class="input" type="date" id="aStart" value="${today}"></label>
          <label class="field"><span>時數（0.5 為單位）</span><input class="input num" id="aHours" inputmode="decimal" value="1"></label></div>
        <div class="field"><span>類別</span>${chips('aOt', HRC.OT_TYPES, '平日')}</div>
        <p class="small muted" style="margin:-4px 0 10px">加班費依勞基法：平日前 2 小時 ×1.34、再 2 小時 ×1.67；休息日另計；國定假日加倍。</p>`
      : `<div class="grid2"><label class="field"><span>日期</span><input class="input" type="date" id="aStart" value="${today}" max="${today}"></label>
          <label class="field"><span>時間</span><input class="input" type="time" id="aTime" value="${esc(me.profile.shiftStart || '10:00')}"></label></div>
        <div class="field"><span>補哪一個卡</span>${chips('aCk', ['上班', '下班'], '上班')}</div>`}
      <label class="field"><span>事由${kind === '請假' ? '（選填）' : ''}</span><textarea class="input" id="aReason" rows="2" placeholder="${kind === '補打卡' ? '例：手機沒電忘了打卡' : kind === '加班' ? '例：月底盤點' : '例：家中有事'}"></textarea></label>
      <button class="btn btn-dark btn-block" id="aSend">送出申請</button><p class="err" id="aErr"></p></div></div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  const tip = () => { const t = $('#aType', d); if (!t) return; const v = t.value, a = me.annual; $('#aTip', d).textContent = v === '特休' ? (a ? `特休剩 ${a.left} 天` : '還沒有特休') : HRC.LEAVE_TYPES[v].pay === 1 ? '全薪' : HRC.LEAVE_TYPES[v].pay ? '半薪' : '不給薪'; };
  if ($('#aType', d)) { $('#aType', d).onchange = tip; tip(); }
  $$('input[name=aUnit]', d).forEach(r => r.onchange = () => { $('#aEndBox', d).hidden = r.value !== '全天'; $('#aHoursBox', d).hidden = r.value !== '時數'; $('#aStartL', d).textContent = r.value === '全天' ? '開始日' : '日期'; });
  $('#aSend', d).onclick = async e => {
    const btn = e.currentTarget, v = id => ($('#' + id, d) || {}).value;
    const data = { kind, start: v('aStart'), reason: v('aReason').trim() };
    if (kind === '請假') Object.assign(data, { leaveType: v('aType'), unit: $('input[name=aUnit]:checked', d).value, end: v('aEnd'), hours: Number(v('aHours')) });
    if (kind === '加班') Object.assign(data, { hours: Number(v('aHours')), otType: $('input[name=aOt]:checked', d).value });
    if (kind === '補打卡') Object.assign(data, { clockTime: v('aTime'), clockType: $('input[name=aCk]:checked', d).value });
    btn.disabled = true;
    try { const r = await api('hrRequest', data); closeDrawer(); toast(`已送出：${r.request.kind}（等待主管核准）`); hrMePage(); }
    catch (x) { if (x.auth) return start(); $('#aErr', d).textContent = x.message; btn.disabled = false; }
  };
}

/* ---------- 審核（主管） ---------- */
async function hrApprovePage() {
  const st = hrState.reqStatus;
  const r = await hrLoad('hr/approve', () => api('hrRequests', { status: st === '全部' ? '' : st }));
  if (!r) return;
  const list = r.requests;
  app.innerHTML = `${pagesNav('hr/approve')}
    <div class="toolbar"><div class="tabs">${['待核准', '已核准', '已退回', '全部'].map(s => `<button data-rs="${s}" class="${st === s ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    ${list.length ? `<div class="hr-reqs">${list.map(q => `<div class="card hr-req">
      <div class="hr-req-h"><b>${esc(q.name)}</b> ${hrBadge(q.status)} <span class="sub">${esc(q.id)}・${esc(q.createdAt)}</span></div>
      <div style="font-size:16px;margin:6px 0"><b>${esc(q.kind === '請假' ? q.leaveType : q.kind)}</b>　${esc(hrReqLine(q))}</div>
      ${q.reason ? `<div class="small">事由：${esc(q.reason)}</div>` : ''}
      ${q.decidedAt ? `<div class="small muted">${esc(q.decidedBy)} 於 ${esc(q.decidedAt)} ${esc(q.status)}${q.decideNote ? '：' + esc(q.decideNote) : ''}</div>` : ''}
      ${q.status === '待核准' ? `<div class="hr-req-a"><button class="btn btn-dark btn-sm" data-ok="${esc(q.id)}">✓ 核准</button><button class="btn btn-ghost btn-sm" data-no="${esc(q.id)}">退回</button></div>` : ''}</div>`).join('')}</div>`
      : `<div class="card empty">${st === '待核准' ? '沒有待審核的申請 👍' : '沒有符合的申請'}</div>`}`;
  $$('[data-rs]').forEach(b => b.onclick = () => { hrState.reqStatus = b.dataset.rs; hrApprovePage(); });
  const decide = async (id, approve, btn) => {
    let note = '';
    if (!approve) { note = await askReason('退回這張申請？請填寫原因，員工會看到。', '退回'); if (!note) return; }
    btn.disabled = true;
    try { await api('hrDecide', { id, approve, note }); toast(approve ? '已核准' : '已退回'); hrApprovePage(); } catch (e) { if (e.auth) return start(); toast(e.message); btn.disabled = false; }
  };
  $$('[data-ok]').forEach(b => b.onclick = () => decide(b.dataset.ok, true, b));
  $$('[data-no]').forEach(b => b.onclick = () => decide(b.dataset.no, false, b));
}

/* ---------- 出勤總表（主管） ---------- */
async function hrAttendancePage(refresh) {
  const month = hrState.attMonth || hrMonthNow();
  if (refresh || !hrState.att || hrState.att.month !== month) {
    const r = await hrLoad('hr/attendance', () => api('hrAttendance', { month }));
    if (!r) return;
    hrState.att = r;
  }
  const A = hrState.att;
  app.innerHTML = `${pagesNav('hr/attendance')}
    <div class="toolbar" style="justify-content:space-between;align-items:center">${hrMonthNav('atM', month)}<button class="btn btn-ghost btn-sm" id="atCsv">⬇ 匯出 CSV</button></div>
    ${A.staff.length ? `<table class="table"><thead><tr><th>員工</th><th>出勤</th><th>遲到</th><th class="hide-m">早退</th><th>缺卡</th><th>曠職</th><th class="hide-m">請假</th><th class="hide-m">加班</th></tr></thead><tbody>
      ${A.staff.map(x => { const s = x.att.sum, lv = Object.values(s.leaveHours).reduce((t, h) => t + h, 0), ot = Object.values(s.otHours).reduce((t, h) => t + h, 0);
        return `<tr data-emp="${esc(x.username)}"><td><b>${esc(x.name)}</b><div class="sub">${esc(x.shift)}</div></td><td class="num">${s.attended}</td>
          <td class="num ${s.lateCount ? 'hr-red' : ''}">${s.lateCount ? `${s.lateCount} 次<div class="sub">${s.lateMin} 分</div>` : '—'}</td>
          <td class="num hide-m">${s.earlyCount || '—'}</td><td class="num ${s.missing ? 'hr-red' : ''}">${s.missing || '—'}</td><td class="num ${s.absentDays ? 'hr-red' : ''}">${s.absentDays || '—'}</td>
          <td class="num hide-m">${lv ? lv + 'h' : '—'}</td><td class="num hide-m">${ot ? ot + 'h' : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="small muted" style="margin:8px 4px">點員工可看每天的打卡、補登或刪除打卡。曠職＝上班日沒打卡也沒請假（國定假日請自行判斷）。</p>` : '<div class="card empty">還沒有員工帳號</div>'}`;
  hrBindMonth('atM', m => { hrState.attMonth = m; hrAttendancePage(true); });
  $$('[data-emp]').forEach(tr => tr.onclick = () => hrEmpDrawer(A.staff.find(x => x.username === tr.dataset.emp)));
  $('#atCsv').onclick = () => {
    const rows = [];
    A.staff.forEach(x => x.att.days.forEach(dd => rows.push([x.name, dd.date, dd.w, dd.in, dd.out, dd.status, dd.lateMin || '', dd.earlyMin || '', dd.leaveHours || '', Math.round(dd.workedMin / 6) / 10 || ''])));
    csvDownload(`出勤_${month}.csv`, ['員工', '日期', '星期', '上班', '下班', '狀態', '遲到分', '早退分', '請假小時', '工時'], rows);
  };
}
function hrEmpDrawer(x) {
  const d = $('#drawer');
  d.classList.add('wide');
  d.innerHTML = `<div class="d-head"><b>${esc(x.name)}・${esc(hrState.att.month)} 出勤</b><button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">${hrSumCards(x.att.sum)}
      <div class="card"><h3>補登打卡</h3><div class="grid2"><label class="field"><span>日期</span><input class="input" type="date" id="fxD" value="${localDay()}"></label>
        <label class="field"><span>時間</span><input class="input" type="time" id="fxT" value="10:00"></label></div>
        <div class="field"><span>類別</span>${chips('fxK', ['上班', '下班'], '上班')}</div>
        <label class="field"><span>原因（必填）</span><input class="input" id="fxN" placeholder="例：員工手機沒電"></label>
        <button class="btn btn-dark btn-sm" id="fxGo">補登</button></div>
      <div class="card"><h3>打卡紀錄</h3>${x.clocks.length ? `<ul class="hr-list">${x.clocks.map(c => `<li><span class="num">${esc(c.at.slice(5, 16))}</span> <b>${esc(c.type)}</b> <span class="sub">${c.dist != null ? '距門市 ' + c.dist + ' 公尺' : esc(c.source) + (c.note ? '：' + esc(c.note) : '') + (c.by ? '・' + esc(c.by) : '')}</span> <button class="link" data-del="${esc(c.id)}" style="font-size:13px">刪除</button></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">這個月沒有打卡</p>'}</div>
      <div class="card"><h3>每日明細</h3>${hrDaysTable(x.att.days)}</div></div>`;
  d.classList.add('show'); $('#scrim').classList.add('show');
  $('.d-close', d).onclick = closeDrawer;
  $('#fxGo', d).onclick = async e => {
    const btn = e.currentTarget, note = $('#fxN', d).value.trim();
    if (!note) return toast('請填寫補登原因');
    btn.disabled = true;
    try { await api('hrClockAdd', { username: x.username, date: $('#fxD', d).value, time: $('#fxT', d).value, type: $('input[name=fxK]:checked', d).value, note }); toast('已補登'); closeDrawer(); hrAttendancePage(true); }
    catch (y) { if (y.auth) return start(); toast(y.message); btn.disabled = false; }
  };
  $$('[data-del]', d).forEach(b => b.onclick = async () => {
    const reason = await askReason('刪除這筆打卡？', '刪除');
    if (!reason) return;
    try { await api('hrClockDelete', { id: b.dataset.del, reason }); toast('已刪除'); closeDrawer(); hrAttendancePage(true); } catch (y) { if (y.auth) return start(); toast(y.message); }
  });
}

/* ---------- 員工資料（主管） ---------- */
let hrStaffData = null;
async function hrStaffPage() {
  const r = await hrLoad('hr/staff', () => api('hrStaff'));
  if (!r) return;
  hrStaffData = r;
  const list = r.staff.filter(x => x.enabled);
  app.innerHTML = `${pagesNav('hr/staff')}
    <p class="small muted" style="margin:0 4px 10px">員工名單來自「員工帳號」；這裡設定到職日（自動算年資與特休）、班別${r.canPay ? '與薪資' : ''}。</p>
    ${list.length ? `<table class="table"><thead><tr><th>員工</th><th>到職日／年資</th><th class="hide-m">班別</th><th>特休</th>${r.canPay ? '<th class="hide-m">薪資</th>' : ''}</tr></thead><tbody>
      ${list.map(x => `<tr data-st="${esc(x.username)}"><td><b>${esc(x.name)}</b><div class="sub">${esc(x.role || '')}</div></td>
        <td>${x.hireDate ? `<span class="num">${esc(x.hireDate)}</span><div class="sub">${esc(x.seniority)}</div>` : '<span class="pill warn">未設定</span>'}</td>
        <td class="hide-m num">${esc(x.shiftStart)}–${esc(x.shiftEnd)}<div class="sub">週${(x.workdays || []).map(w => HRC.WEEK[w]).join('')}</div></td>
        <td>${x.annual ? `<b class="num">${x.annual.left}</b> / ${x.annual.total} 天<div class="sub">${esc(x.annual.label)}</div>` : '—'}</td>
        ${r.canPay ? `<td class="hide-m num">${Number(x.salary) ? `${esc(x.payType)} ${money(x.salary)}` : '<span class="sub">未設定</span>'}</td>` : ''}</tr>`).join('')}</tbody></table>` : '<div class="card empty">還沒有員工帳號，請先到「員工帳號」新增</div>'}`;
  $$('[data-st]').forEach(tr => tr.onclick = () => hrStaffDrawer(list.find(x => x.username === tr.dataset.st)));
}
function hrStaffDrawer(x) {
  const pay = hrStaffData.canPay, d = $('#drawer');
  const allow = (x.allowances || []).map(a => ({ ...a }));
  const draw = () => {
    d.innerHTML = `<div class="d-head"><b>${esc(x.name)}・員工資料</b><button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      <div class="card"><h3>到職與班別</h3>
        <div class="grid2"><label class="field"><span>到職日</span><input class="input" type="date" id="sHire" value="${esc(x.hireDate)}"></label>
          <label class="field"><span>特休調整（天）<small class="muted">　例：遞延 +2</small></span><input class="input num" id="sAdj" inputmode="decimal" value="${esc(x.leaveAdjust || '')}" placeholder="0"></label></div>
        <div class="field"><span>上班日</span><div class="chips">${HRC.WEEK.map((w, i) => `<label class="chip"><input type="checkbox" name="sWd" value="${i}" ${(x.workdays || []).includes(i) ? 'checked' : ''}><span>週${w}</span></label>`).join('')}</div></div>
        <div class="grid2"><label class="field"><span>上班時間</span><input class="input" type="time" id="sSt" value="${esc(x.shiftStart)}"></label>
          <label class="field"><span>下班時間</span><input class="input" type="time" id="sEn" value="${esc(x.shiftEnd)}"></label></div>
        <label class="field"><span>休息（分鐘）</span><input class="input num" id="sBrk" inputmode="numeric" value="${esc(x.breakMin)}" style="max-width:120px"></label>
        ${x.annual ? `<p class="small muted" style="margin:0">特休 ${esc(x.annual.from)}～${esc(x.annual.to)}：共 ${x.annual.total} 天，已休 ${x.annual.used}、待核准 ${x.annual.pending}、剩 ${x.annual.left}</p>` : ''}</div>
      ${pay ? `<div class="card"><h3>薪資</h3>
        <div class="field"><span>計薪方式</span>${chips('sPt', ['月薪', '時薪'], x.payType || '月薪')}</div>
        <label class="field"><span id="sSalL">${(x.payType || '月薪') === '時薪' ? '時薪（NT$）' : '月薪（NT$）'}</span><input class="input num" id="sSal" inputmode="numeric" value="${esc(x.salary || '')}"></label>
        <div class="field"><span>固定加給（每月）</span>${allow.map((a, i) => `<div class="rp-item" style="grid-template-columns:1fr 120px 30px"><input class="input" data-an="${i}" value="${esc(a.name)}" placeholder="例：全勤獎金"><input class="input num" data-aa="${i}" inputmode="numeric" value="${esc(a.amount || '')}" placeholder="金額"><button type="button" class="ph-del static" data-ad="${i}">✕</button></div>`).join('')}
          <button type="button" class="link" id="sAddA">＋ 新增加給</button></div>
        <div class="grid2"><label class="field"><span>勞保自付（每月）</span><input class="input num" id="sLi" inputmode="numeric" value="${esc(x.laborIns || '')}"></label>
          <label class="field"><span>健保自付（每月）</span><input class="input num" id="sHi" inputmode="numeric" value="${esc(x.healthIns || '')}"></label></div>
        <label class="field"><span>勞退自提（%，0–6）</span><input class="input num" id="sPp" inputmode="decimal" value="${esc(x.pensionPct || '')}" style="max-width:120px"></label>
        <p class="small muted" style="margin:0">勞健保自付額請依投保級距表填寫；月薪換算時薪＝月薪 ÷ 240，用於加班費與請假扣薪。</p></div>` : ''}
      <div class="card"><label class="field" style="margin:0"><span>備註</span><textarea class="input" id="sNote" rows="2">${esc(x.note || '')}</textarea></label></div>
    </div><div class="d-foot"><span class="err" id="sErr" style="flex:1;margin:0"></span><button class="btn btn-dark" id="sSave">儲存</button></div>`;
    $('.d-close', d).onclick = closeDrawer;
    if (pay) {
      $$('input[name=sPt]', d).forEach(r => r.onchange = () => { $('#sSalL', d).textContent = r.value === '時薪' ? '時薪（NT$）' : '月薪（NT$）'; });
      $$('[data-an]', d).forEach(el => el.oninput = () => { allow[+el.dataset.an].name = el.value; });
      $$('[data-aa]', d).forEach(el => el.oninput = () => { allow[+el.dataset.aa].amount = el.value; });
      $$('[data-ad]', d).forEach(b => b.onclick = () => { keep(); allow.splice(+b.dataset.ad, 1); draw(); });
      $('#sAddA', d).onclick = () => { keep(); allow.push({ name: '', amount: '' }); draw(); };
    }
    $('#sSave', d).onclick = save;
  };
  const keep = () => { Object.assign(x, collect()); };
  const collect = () => {
    const v = id => ($('#' + id, d) || {}).value;
    const o = { username: x.username, hireDate: v('sHire'), leaveAdjust: v('sAdj'), workdays: $$('input[name=sWd]:checked', d).map(c => Number(c.value)), shiftStart: v('sSt'), shiftEnd: v('sEn'), breakMin: v('sBrk'), note: v('sNote') };
    if (pay) Object.assign(o, { payType: $('input[name=sPt]:checked', d).value, salary: v('sSal'), allowances: allow.filter(a => a.name && numv(a.amount)).map(a => ({ name: a.name, amount: numv(a.amount) })), laborIns: v('sLi'), healthIns: v('sHi'), pensionPct: v('sPp') });
    return o;
  };
  const save = async e => {
    const btn = e.currentTarget; btn.disabled = true; $('#sErr', d).textContent = '';
    try { const r = await api('hrStaffSave', { profile: collect() }); toast(r.changes.length ? `已儲存（${r.changes.length} 項變動）` : '沒有變動'); closeDrawer(); hrStaffPage(); }
    catch (y) { if (y.auth) return start(); $('#sErr', d).textContent = y.message; btn.disabled = false; }
  };
  draw();
  d.classList.add('show'); $('#scrim').classList.add('show');
}

/* ---------- 薪資（主管） ---------- */
async function hrPayrollPage() {
  const month = hrState.payMonth || hrMonthNow();
  const r = await hrLoad('hr/payroll', () => api('payrollList', { month }));
  if (!r) return;
  const S = r.slips, tot = k => S.reduce((t, x) => t + x[k], 0), drafts = S.filter(x => x.status === '草稿');
  app.innerHTML = `${pagesNav('hr/payroll')}
    <div class="toolbar" style="justify-content:space-between;align-items:center;flex-wrap:wrap">${hrMonthNav('pyM', month)}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-dark btn-sm" id="pyCalc">🧮 計算${S.length ? '／重新計算' : ''}本月薪資</button>
        ${drafts.length ? `<button class="btn btn-ghost btn-sm" id="pyAll">✓ 全部確認（${drafts.length}）</button>` : ''}${S.length ? '<button class="btn btn-ghost btn-sm" id="pyCsv">⬇ 匯出</button>' : ''}</div></div>
    <p class="small muted" style="margin:0 4px 10px">依出勤、已核准的請假與加班自動計算；「已確認」的薪資單員工才看得到，且不會被重新計算覆蓋。曠職不會自動扣薪，需要的話請在薪資單加調整項目。</p>
    ${S.length ? `<div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))"><div class="stat" style="--c:#0A84FF"><div class="n num">${S.length}</div><div class="l">薪資單</div></div>
      <div class="stat" style="--c:#30D158"><div class="n num">NT$ ${money(tot('gross'))}</div><div class="l">應發合計</div></div><div class="stat" style="--c:#1d1d1f"><div class="n num">NT$ ${money(tot('net'))}</div><div class="l">實發合計</div></div></div>
      <table class="table"><thead><tr><th>員工</th><th>應發</th><th class="hide-m">應扣</th><th>實發</th><th>狀態</th></tr></thead><tbody>
      ${S.map(x => `<tr data-slip="${esc(x.id)}"><td><b>${esc(x.name)}</b><div class="sub">${esc(x.detail.payType || '')}</div></td><td class="num">${money(x.gross)}</td><td class="num hide-m">${money(x.deduct)}</td>
        <td class="num"><b>${money(x.net)}</b></td><td>${x.status === '已確認' ? '<span class="pill ok">已確認</span>' : '<span class="pill warn">草稿</span>'}</td></tr>`).join('')}</tbody></table>`
      : '<div class="card empty">這個月還沒計算薪資，按上方「計算本月薪資」</div>'}
    ${r.missing.length ? `<p class="small muted" style="margin:10px 4px">沒有薪資單：${r.missing.map(m => `${esc(m.name)}${m.salarySet ? '' : '（未設定薪資）'}`).join('、')}${r.missing.some(m => !m.salarySet) ? '　→ 到「員工資料」設定薪資' : ''}</p>` : ''}`;
  hrBindMonth('pyM', m => { hrState.payMonth = m; hrPayrollPage(); });
  $('#pyCalc').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '計算中…';
    try { await api('payrollCompute', { month }); toast('已計算'); hrPayrollPage(); } catch (y) { if (y.auth) return start(); toast(y.message); btn.disabled = false; }
  };
  if ($('#pyAll')) $('#pyAll').onclick = async () => {
    if (!(await ask(`確認 ${drafts.length} 張薪資單？\n\n確認後員工就能在「我的出勤」看到。`, '全部確認'))) return;
    try { await api('payrollConfirm', { ids: drafts.map(x => x.id) }); toast('已確認'); hrPayrollPage(); } catch (y) { if (y.auth) return start(); toast(y.message); }
  };
  if ($('#pyCsv')) $('#pyCsv').onclick = () => csvDownload(`薪資_${month}.csv`, ['員工', '狀態', '應發', '應扣', '實發', '明細'],
    S.map(x => [x.name, x.status, x.gross, x.deduct, x.net, (x.detail.lines || []).map(l => `${l.kind === 'earn' ? '+' : '-'}${l.name} ${l.amount}`).join('；')]));
  $$('[data-slip]').forEach(tr => tr.onclick = () => hrSlipDrawer(S.find(x => x.id === tr.dataset.slip), true));
}
function hrSlipDrawer(x, manage) {
  const d = $('#drawer'), adj = (x.adjustments || []).map(a => ({ ...a })), D = x.detail || {}, lines = D.lines || [];
  const draft = manage && x.status === '草稿';
  const draw = () => {
    d.innerHTML = `<div class="d-head"><b>${esc(x.name)}・${esc(x.month)} 薪資單</b>${x.status === '已確認' ? '<span class="pill ok">已確認</span>' : '<span class="pill warn">草稿</span>'}<button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      <div class="card hr-slip"><div class="hr-net"><span>實發金額</span><b class="num">NT$ ${money(x.net)}</b></div>
        <table class="rep-price">${lines.filter(l => l.kind === 'earn').map(l => `<tr><td>${esc(l.name)}${l.note ? `<div class="sub">${esc(l.note)}</div>` : ''}</td><td>+ ${money(l.amount)}</td></tr>`).join('')}
          <tr class="sub"><td>應發合計</td><td>NT$ ${money(x.gross)}</td></tr>
          ${lines.filter(l => l.kind === 'deduct').map(l => `<tr><td>${esc(l.name)}${l.note ? `<div class="sub">${esc(l.note)}</div>` : ''}</td><td style="color:#c9372c">− ${money(l.amount)}</td></tr>`).join('')}
          <tr class="sub"><td>應扣合計</td><td>NT$ ${money(x.deduct)}</td></tr></table>
        <p class="small muted" style="margin:10px 0 0">${esc(D.payType || '')}・換算時薪 ${D.rate || '—'}・出勤工時 ${D.workedHours || 0} 小時・加班 ${D.otHours || 0} 小時${D.absentDays ? `・曠職 ${D.absentDays} 天` : ''}${D.lateMin ? `・遲到 ${D.lateMin} 分` : ''}</p>
        ${x.note ? `<p class="small" style="margin:6px 0 0">備註：${esc(x.note)}</p>` : ''}
        ${x.confirmedAt ? `<p class="small muted" style="margin:6px 0 0">${esc(x.confirmedBy)} 於 ${esc(x.confirmedAt)} 確認</p>` : ''}</div>
      ${draft ? `<div class="card"><h3>調整項目</h3><p class="small muted" style="margin:-4px 0 8px">正數＝加項（獎金），負數＝扣項（例：曠職扣薪 -1200）</p>
        ${adj.map((a, i) => `<div class="rp-item" style="grid-template-columns:1fr 120px 30px"><input class="input" data-jn="${i}" value="${esc(a.name)}" placeholder="例：業績獎金"><input class="input num" data-ja="${i}" value="${esc(a.amount)}" placeholder="+/- 金額"><button type="button" class="ph-del static" data-jd="${i}">✕</button></div>`).join('')}
        <button type="button" class="link" id="jAdd">＋ 新增調整</button>
        <label class="field" style="margin-top:10px"><span>備註</span><textarea class="input" id="jNote" rows="2">${esc(x.note || '')}</textarea></label></div>` : ''}
    </div>
    ${manage ? `<div class="d-foot"><span class="err" id="jErr" style="flex:1;margin:0"></span>${draft ? '<button class="btn btn-ghost" id="jSave">儲存調整</button><button class="btn btn-dark" id="jOk">確認薪資單</button>' : '<button class="btn btn-ghost" id="jReopen">重新開啟</button>'}</div>`
      : `<div class="d-foot"><button class="btn btn-ghost" onclick="window.print()">列印</button></div>`}`;
    $('.d-close', d).onclick = closeDrawer;
    $$('[data-jn]', d).forEach(el => el.oninput = () => { adj[+el.dataset.jn].name = el.value; });
    $$('[data-ja]', d).forEach(el => el.oninput = () => { adj[+el.dataset.ja].amount = el.value; });
    $$('[data-jd]', d).forEach(b => b.onclick = () => { adj.splice(+b.dataset.jd, 1); draw(); });
    if ($('#jAdd', d)) $('#jAdd', d).onclick = () => { adj.push({ name: '', amount: '' }); draw(); };
    const saveAdj = async () => { const r = await api('payrollSave', { id: x.id, adjustments: adj.map(a => ({ name: a.name, amount: Number(String(a.amount).replace(/[^\d-]/g, '')) || 0 })), note: ($('#jNote', d) || {}).value || '' }); return r.slip; };
    if ($('#jSave', d)) $('#jSave', d).onclick = async e => { const b = e.currentTarget; b.disabled = true; try { const s = await saveAdj(); toast('已重新計算'); hrSlipDrawer(s, true); hrPayrollPage(); } catch (y) { $('#jErr', d).textContent = y.message; b.disabled = false; } };
    if ($('#jOk', d)) $('#jOk', d).onclick = async e => {
      const b = e.currentTarget;
      if (!(await ask(`確認 ${x.name} ${x.month} 的薪資單？\n實發 NT$ ${money(x.net)}`, '確認'))) return;
      b.disabled = true;
      try { await saveAdj(); await api('payrollConfirm', { ids: [x.id] }); toast('已確認'); closeDrawer(); hrPayrollPage(); } catch (y) { $('#jErr', d).textContent = y.message; b.disabled = false; }
    };
    if ($('#jReopen', d)) $('#jReopen', d).onclick = async () => {
      if (!(await ask('重新開啟這張薪資單？\n\n員工會暫時看不到，修改後需要再確認一次。', '重新開啟'))) return;
      try { await api('payrollConfirm', { ids: [x.id], reopen: true }); toast('已重新開啟'); closeDrawer(); hrPayrollPage(); } catch (y) { toast(y.message); }
    };
  };
  draw();
  d.classList.add('show'); $('#scrim').classList.add('show');
}

/* ---------- 打卡設定（主管） ---------- */
async function hrSettingsPage() {
  const r = await hrLoad('hr/settings', () => api('hrSettings'));
  if (!r) return;
  const S = r.settings;
  app.innerHTML = `${pagesNav('hr/settings')}
    <div class="card" style="max-width:620px"><h3>門市位置（打卡範圍）</h3>
      <p class="small muted" style="margin:-4px 0 10px">在門市裡按「使用我目前的位置」最準確。員工必須在這個位置的範圍內才能打卡。</p>
      <div class="grid2"><label class="field"><span>緯度</span><input class="input num" id="hsLat" value="${esc(S.lat)}" placeholder="例：25.0123"></label>
        <label class="field"><span>經度</span><input class="input num" id="hsLng" value="${esc(S.lng)}" placeholder="例：121.5123"></label></div>
      <button class="btn btn-ghost btn-sm" id="hsHere">📍 使用我目前的位置</button> <span class="small muted" id="hsInfo"></span>
      ${S.lat ? `<p class="small" style="margin:10px 0 0"><a href="https://www.google.com/maps?q=${encodeURIComponent(S.lat + ',' + S.lng)}" target="_blank" rel="noopener">在地圖上查看目前設定的位置 ↗</a></p>` : ''}
      <label class="field" style="margin-top:12px"><span>打卡範圍（公尺）</span><input class="input num" id="hsRad" inputmode="numeric" value="${esc(S.radius)}" style="max-width:120px"></label></div>
    <div class="card" style="max-width:620px"><h3>出勤規則</h3>
      <div class="grid2"><label class="field"><span>遲到寬限（分鐘）</span><input class="input num" id="hsGr" inputmode="numeric" value="${esc(S.grace)}"></label>
        <label class="field"><span>一天工時（小時）</span><input class="input num" id="hsDh" inputmode="numeric" value="${esc(S.dayHours)}"></label></div>
      <label class="field"><span>開始使用日<small class="muted">　這天以前不算曠職、缺卡</small></span><input class="input" type="date" id="hsSince" value="${esc(S.since || localDay())}" style="max-width:200px"></label>
      <label class="check"><input type="checkbox" id="hsLd" ${S.lateDeduct ? 'checked' : ''}> 遲到依分鐘扣薪（月薪：時薪 ÷ 60 × 遲到分鐘）</label></div>
    <div class="in-foot" style="max-width:620px"><span class="err" id="hsErr" style="flex:1;margin:0"></span><button class="btn btn-dark" id="hsSave">儲存</button></div>`;
  $('#hsHere').onclick = () => {
    if (!navigator.geolocation) return toast('這台裝置無法定位');
    $('#hsInfo').textContent = '定位中…';
    navigator.geolocation.getCurrentPosition(p => { $('#hsLat').value = p.coords.latitude.toFixed(6); $('#hsLng').value = p.coords.longitude.toFixed(6); $('#hsInfo').textContent = `精確度約 ${Math.round(p.coords.accuracy)} 公尺，記得按儲存`; },
      e => { $('#hsInfo').textContent = e.code === 1 ? '請允許網站使用位置' : '定位失敗，請再試一次'; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  $('#hsSave').onclick = async e => {
    const b = e.currentTarget; b.disabled = true;
    try {
      await api('hrSettingsSave', { settings: { lat: $('#hsLat').value.trim(), lng: $('#hsLng').value.trim(), radius: $('#hsRad').value, grace: $('#hsGr').value, dayHours: $('#hsDh').value, since: $('#hsSince').value, lateDeduct: $('#hsLd').checked } });
      toast('已儲存'); hrSettingsPage();
    } catch (y) { if (y.auth) return start(); $('#hsErr').textContent = y.message; b.disabled = false; }
  };
}
