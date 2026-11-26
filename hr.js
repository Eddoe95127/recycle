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
  if (page === 'hr/roster' && P('hr_manage')) return go(hrRosterPage);
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
  if (me.owner) {
    app.innerHTML = pagesNav('hr/clock') + `<div class="card"><p style="margin:0">老闆帳號不用打卡。<span class="small muted">員工請用自己的員工帳號登入後打卡。</span></p>${me.hasLocation ? '' : '<div class="alert" style="margin:10px 0 0">⚠️ 還沒有設定門市位置，請到「人資 → 打卡設定」設定，員工才能打卡。</div>'}</div>
      <div class="card" id="hrRoster"></div>`;
    return hrRosterCard(hrMonthNow());
  }
  const p = me.profile, t0 = (me.upcoming || [])[0];
  const todayShift = t0 ? (t0.leave ? `今天${t0.leave}` : !t0.wd ? '今天是休假日' : `今天${t0.shift ? ' ' + t0.shift : '班別'} ${t0.start}–${t0.end}`)
    : ((p.workdays || []).includes(new Date().getDay()) ? `今天班別 ${p.shiftStart}–${p.shiftEnd}` : '今天是休假日');
  const tc = me.todayClocks, lastIn = tc.filter(c => c.type === '上班').pop(), lastOut = tc.filter(c => c.type === '下班').pop();
  const next = !lastIn ? '上班' : !lastOut || lastOut.at < lastIn.at ? '下班' : '上班';
  app.innerHTML = `${pagesNav('hr/clock')}
    <div class="card hr-clock">
      <div class="hr-now num" id="hrNow">--:--:--</div>
      <div class="muted hr-today">${esc(localDay())}（${HRC.WEEK[new Date().getDay()]}）・<b>${esc(todayShift)}</b></div>
      ${me.hasLocation ? '' : '<div class="alert" style="margin-top:12px">還沒有設定門市位置，請主管到「人資 → 打卡設定」設定</div>'}
      <div class="hr-btns">
        <button class="hr-btn in ${next === '上班' ? 'on' : ''}" data-ck="上班"><b>上班打卡</b><small>${lastIn ? '已打 ' + esc(lastIn.at.slice(11, 16)) : '尚未打卡'}</small></button>
        <button class="hr-btn out ${next === '下班' ? 'on' : ''}" data-ck="下班"><b>下班打卡</b><small>${lastOut ? '已打 ' + esc(lastOut.at.slice(11, 16)) : '尚未打卡'}</small></button>
      </div>
      <p class="small muted" style="margin:0">打卡會檢查您是否在門市 ${esc(me.radius)} 公尺內，請允許網站使用位置。</p>
      <p class="err" id="ckErr" style="margin:8px 0 0"></p>
    </div>
    ${me.upcoming && me.upcoming.length ? `<div class="card">${hrUpcomingHTML(me.upcoming)}</div>` : ''}
    <div class="card"><h3>今天的打卡</h3>${tc.length ? `<ul class="hr-list">${tc.map(c => `<li><b>${esc(c.type)}</b> <span class="num">${esc(c.at.slice(11, 16))}</span> <span class="sub">${c.dist != null ? '距門市 ' + c.dist + ' 公尺' : esc(c.source)}</span></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">今天還沒有打卡</p>'}</div>
    ${me.annual ? `<div class="card hr-mini"><div><div class="small muted">特休剩餘</div><b class="num">${me.annual.left} 天</b></div><div><div class="small muted">年資</div><b>${esc(p.seniority || '—')}</b></div>
      <a class="btn btn-ghost btn-sm" href="#hr/me">我的出勤與申請 →</a></div>` : '<div class="card"><a class="btn btn-ghost btn-block" href="#hr/me">我的出勤與申請 →</a></div>'}
    <div class="card" id="hrCal">${hrCalendarHTML(me)}</div>
    ${P('hr_manage') ? '<div class="card" id="hrRoster"></div>' : ''}`;
  hrBindCal(me);
  if (P('hr_manage')) hrRosterCard(me.month);
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

/* ---------- 本月班表（月曆）＋全員班表 ---------- */
/** 打卡頁「我的班表」：未來兩週，一天一列、大字 */
function hrUpcomingHTML(list) {
  const today = localDay(), tmr = HRC.fromNum(HRC.dayNum(today) + 1);
  const row = d => {
    const md = `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8))}`, tag = d.date === today ? '今天' : d.date === tmr ? '明天' : '週' + d.w;
    const main = d.leave ? `<span class="up-tag lv">${esc(d.leave)}</span>` : !d.wd ? '<span class="up-tag off">休假</span>'
      : `${d.shift ? `<span class="up-tag sh">${esc(d.shift)}</span>` : ''}<b class="num">${esc(d.start)} – ${esc(d.end)}</b>`;
    return `<li class="${d.date === today ? 'today' : ''}${d.leave || !d.wd ? ' rest' : ''}"><div class="up-d"><b class="num">${md}</b><span>${tag}${tag.startsWith('週') ? '' : '・週' + d.w}</span></div><div class="up-m">${main}</div></li>`;
  };
  return `<div class="hr-cal-h"><h3 style="margin:0">📅 我的班表</h3><span class="small muted">未來兩週</span></div><ul class="up-list">${list.map(row).join('')}</ul>`;
}
function hrCalendarHTML(me) {
  const p = me.profile, days = me.att.days, today = localDay();
  const lead = HRC.weekday(days[0].date);
  const cell = d => {
    const lv = d.leaves.length, past = d.date < today, isToday = d.date === today;
    let main = '', cls = '';
    if (lv) { main = d.leaves.map(l => `<span class="cal-tag lv">${esc(l.type)}</span>`).join(''); cls = 'lv'; }
    else if (d.wd) { main = `<span class="cal-shift">${d.shift ? `<b>${esc(d.shift)}</b><br>` : ''}${esc(d.start || p.shiftStart)}<br>${esc(d.end || p.shiftEnd)}</span>`; cls = 'wd'; }
    else { main = '<span class="cal-off">休</span>'; cls = 'off'; }
    const clock = (past || isToday) && (d.in || d.out) ? `<span class="cal-clk">${esc(d.in || '—')}–${esc(d.out || '—')}</span>` : '';
    const flag = past ? (d.absent ? '<span class="cal-flag bad">曠職</span>' : d.missing ? '<span class="cal-flag bad">缺卡</span>' : d.lateMin ? `<span class="cal-flag warn">遲${d.lateMin}</span>` : d.earlyMin ? '<span class="cal-flag warn">早退</span>' : '') : '';
    return `<div class="cal-d ${cls}${isToday ? ' today' : ''}${past ? ' past' : ''}"><b>${Number(d.date.slice(8))}</b>${main}${clock}${flag}</div>`;
  };
  const work = days.filter(d => d.wd && !d.leaves.length).length, off = days.filter(d => !d.wd).length, lv = days.filter(d => d.leaves.length).length;
  return `<div class="hr-cal-h"><h3 style="margin:0">本月班表</h3>${hrMonthNav('calM', me.month)}</div>
    <p class="small muted" style="margin:6px 0 10px">班別 ${esc(p.shiftStart)}–${esc(p.shiftEnd)}・上班 ${work} 天、休假 ${off} 天${lv ? `、請假 ${lv} 天` : ''}</p>
    <div class="cal-grid">${HRC.WEEK.map(w => `<div class="cal-w">${w}</div>`).join('')}${'<div></div>'.repeat(lead)}${days.map(cell).join('')}</div>`;
}
function hrBindCal(me) {
  const box = $('#hrCal'); if (!box) return;
  const go = async m => {
    box.innerHTML = '<div class="spinner"></div>';
    try { const r = await api('hrMe', { month: m }); box.innerHTML = hrCalendarHTML(r); hrBindCalNav(r); } catch (e) { if (e.auth) return start(); box.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  };
  const hrBindCalNav = r => {
    const el = $('#calM', box); el.onchange = () => go(el.value);
    $$('[data-mv]', box).forEach(b => b.onclick = () => { const [y, mo] = el.value.split('-').map(Number); const t = new Date(y, mo - 1 + Number(b.dataset.mv), 1); go(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); });
  };
  hrBindCalNav(me);
}
/** 全員班表：每位員工一列，每天一格（班／休／假別） */
async function hrRosterCard(month) {
  const box = $('#hrRoster'); if (!box) return;
  box.innerHTML = '<h3>全員班表</h3><div class="spinner"></div>';
  let r;
  try { r = await api('hrAttendance', { month }); } catch (e) { if (e.auth) return start(); box.innerHTML = `<h3>全員班表</h3><p class="err">${esc(e.message)}</p>`; return; }
  const today = localDay(), days = (r.staff[0] && r.staff[0].att.days) || [];
  const cell = (d, x) => {
    if (d.leaves.length) return `<td class="rs lv" title="${esc(d.leaves.map(l => l.type + ' ' + l.h + 'h').join('、'))}">${esc(d.leaves[0].type.slice(0, 1))}</td>`;
    if (!d.wd) return '<td class="rs off">休</td>';
    const past = d.date < today, bad = past && (d.absent || d.missing), warn = past && (d.lateMin || d.earlyMin);
    return `<td class="rs wd${d.date === today ? ' today' : ''}${bad ? ' bad' : warn ? ' warn' : ''}" title="${esc(d.shift ? d.shift + ' ' : '')}${esc(d.start || '')}–${esc(d.end || '')}${d.in || d.out ? '　打卡 ' + esc((d.in || '—') + '–' + (d.out || '—')) : ''}">${esc(d.shift ? d.shift.slice(0, 2) : '班')}</td>`;
  };
  box.innerHTML = `<div class="hr-cal-h"><h3 style="margin:0">全員班表</h3>${hrMonthNav('rsM', month)}<a class="btn btn-ghost btn-sm" href="#hr/roster">✏️ 編輯班表</a></div>
    <p class="small muted" style="margin:6px 0 8px">班（或早班、晚班等班別）＝上班日、休＝休假日、其他字＝請假（特＝特休、病＝病假、事＝事假…）；紅色＝曠職或缺卡、橘色＝遲到或早退。手指或滑鼠停在格子上可看打卡時間。</p>
    ${r.staff.length ? `<div class="rs-wrap"><table class="rs-t"><thead><tr><th class="rs-n">員工</th>${days.map(d => `<th class="${d.date === today ? 'today' : ''}${HRC.weekday(d.date) % 6 === 0 ? ' we' : ''}">${Number(d.date.slice(8))}<br><span>${d.w}</span></th>`).join('')}<th>上班</th></tr></thead>
      <tbody>${r.staff.map(x => `<tr><td class="rs-n"><b>${esc(x.name)}</b><div class="sub">${esc(x.shift)}</div></td>${x.att.days.map(d => cell(d, x)).join('')}<td class="num"><b>${x.att.days.filter(d => d.wd && !d.leaves.length).length}</b></td></tr>`).join('')}
      <tr class="rs-sum"><td class="rs-n">當天上班人數</td>${days.map((d, i) => { const n = r.staff.filter(x => x.att.days[i].wd && !x.att.days[i].leaves.length).length; return `<td class="${n ? '' : 'zero'}">${n}</td>`; }).join('')}<td></td></tr></tbody></table></div>`
      : '<p class="small muted">還沒有員工帳號</p>'}`;
  const el = $('#rsM', box); el.onchange = () => hrRosterCard(el.value);
  $$('[data-mv]', box).forEach(b => b.onclick = () => { const [y, mo] = el.value.split('-').map(Number); const t = new Date(y, mo - 1 + Number(b.dataset.mv), 1); hrRosterCard(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); });
}

/* ---------- 班表（主管）：每月逐日排班。排「特休」直接扣特休餘額；沒排的日子照每週固定班 ---------- */
const RO = { month: '', data: null, edit: null, brush: '', dirty: false };
/** 班別顏色（背景、文字）：依班別選項的順序 */
const RO_PAL = [['#dcebff', '#0a5fb4'], ['#ece2ff', '#6a32c9'], ['#d9f3ee', '#0f7b6c'], ['#ffe8d6', '#b4400a'], ['#fff3c4', '#7a5c00'], ['#ffe1ec', '#a3245e']];
const RO_OFF = ['#ececf0', '#5f5f66'], RO_LV = ['#d6f5df', '#1a7f37'];
const roStyle = code => { if (code === '休') return RO_OFF; if (code === '特休') return RO_LV; const i = RO.data.shifts.findIndex(s => s.name === code); return RO_PAL[(i < 0 ? 0 : i) % RO_PAL.length]; };
const roMonthAdd = (m, n) => { const [y, mo] = m.split('-').map(Number), t = new Date(y, mo - 1 + n, 1); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
async function hrRosterPage(refresh) {
  if (!RO.month) RO.month = hrMonthNow();
  if (RO.dirty && refresh && !(await ask('班表還沒儲存，重新整理會清掉這次的修改。\n確定要重新整理嗎？', '重新整理'))) return;
  const r = await hrLoad('hr/roster', () => api('hrRoster', { month: RO.month }));
  if (!r) return;
  RO.data = r; RO.dirty = false;
  RO.edit = {}; r.staff.forEach(x => { RO.edit[x.username] = { ...x.days }; });
  if (!RO.brush || !roCodes().includes(RO.brush)) RO.brush = (r.shifts[0] && r.shifts[0].name) || '休';
  roDraw();
}
const roCodes = () => [...RO.data.shifts.map(x => x.name), '休', '特休', ''];
const roDates = () => { const n = HRC.daysInMonth(RO.month); return Array.from({ length: n }, (_, i) => RO.month + '-' + String(i + 1).padStart(2, '0')); };
function roLeft(x) {
  const a = x.annual; if (!a) return null;
  const e = RO.edit[x.username], cov = {}; x.covered.forEach(k => { cov[k] = 1; });
  return a.baseLeft - HRC.rosterAnnualDays(e, a.from, a.to, cov);
}
const roIsWork = (x, d) => { const c = RO.edit[x.username][d]; return c ? c !== '休' && c !== '特休' : (x.workdays || []).map(Number).includes(HRC.weekday(d)); };
function roCell(x, date) {
  const code = RO.edit[x.username][date] || '', chg = (x.days[date] || '') !== code ? ' chg' : '';
  if (!code) return `<td class="ro-c dflt${chg}" data-c="${date}" title="沒排班，照固定班">${roIsWork(x, date) ? '班' : '休'}</td>`;
  const [bg, fg] = roStyle(code);
  return `<td class="ro-c${chg}" data-c="${date}" style="--bg:${bg};--fg:${fg}">${esc(code === '特休' ? '特休' : code.slice(0, 2))}</td>`;
}
function roRow(x) {
  const left = roLeft(x), a = x.annual;
  const ann = !a ? '<div class="ro-ann" title="到「員工資料」設定到職日後才能算特休">未設到職日</div>' : `<div class="ro-ann${left < 0 ? ' neg' : ''}">特休剩 <b>${Math.round(left * 10) / 10}</b> / ${a.total} 天</div>`;
  return `<tr data-u="${esc(x.username)}"><th class="ro-n" scope="row">${esc(x.name)}${ann}</th>${roDates().map(d => roCell(x, d)).join('')}<td class="ro-sum num">${roDates().filter(d => roIsWork(x, d)).length}</td></tr>`;
}
const roFootHTML = () => `<tr><th class="ro-n" scope="row">當天上班人數</th>${roDates().map(d => { const n = RO.data.staff.filter(x => roIsWork(x, d)).length; return `<td class="${n ? '' : 'zero'}">${n}</td>`; }).join('')}<td></td></tr>`;
function roDraw() {
  const r = RO.data, today = localDay(), dates = roDates(), [y, mo] = RO.month.split('-').map(Number);
  const brushes = [...r.shifts.map(s => [s.name, s.name, `${s.start}–${s.end}`]), ['休', '休假', '不上班'], ['特休', '特休', '扣特休 1 天'], ['', '清除', '照固定班']];
  app.innerHTML = `${pagesNav('hr/roster')}
    <div class="ro-head"><h2>${y} 年 ${mo} 月班表</h2>
      <div class="ro-nav">${hrMonthNav('roM', RO.month)}
        <div class="tabs"><button data-jump="0" class="${RO.month === hrMonthNow() ? 'on' : ''}">本月</button><button data-jump="1" class="${RO.month === roMonthAdd(hrMonthNow(), 1) ? 'on' : ''}">下個月</button></div>
        <button class="btn btn-ghost btn-sm" id="roShifts">⚙ 班別選項</button></div></div>
    <div class="card ro-tools">
      <div class="ro-step"><i>1</i>選擇班別</div>
      <div class="ro-brushes">${brushes.map(([k, l, sub]) => { const [bg, fg] = k ? roStyle(k) : ['#fff', '#1d1d1f']; return `<button type="button" class="ro-b${RO.brush === k ? ' on' : ''}" data-b="${esc(k)}" style="--bg:${bg};--fg:${fg}">${esc(l)}<small>${esc(sub)}</small></button>`; }).join('')}</div>
      ${r.shifts.length ? '' : '<p class="ro-tip">還沒有班別選項（例：早班、晚班）。按右上「⚙ 班別選項」新增；沒設定也可以先排「休假」「特休」。</p>'}
      <div class="ro-step"><i>2</i>點下面表格的格子排班<span>可以連續點；再點一次同樣的班會取消</span></div>
      <div class="ro-legend"><span><em class="lg dflt">班</em>淡灰字＝還沒排，照固定班</span><span><em class="lg chg"></em>黃框＝改過還沒儲存</span><span><em class="lg" style="--bg:${RO_LV[0]};--fg:${RO_LV[1]}">特休</em>直接扣特休，改掉就加回</span></div>
    </div>
    ${r.staff.length ? `<div class="ro-wrap"><table class="ro-t"><thead><tr><th class="ro-n">員工</th>${dates.map(d => { const w = HRC.weekday(d); return `<th class="${d === today ? 'today' : ''}${w % 6 === 0 ? ' we' : ''}">${Number(d.slice(8))}<span>${HRC.WEEK[w]}</span></th>`; }).join('')}<th class="ro-sum">上班<span>天數</span></th></tr></thead>
      <tbody>${r.staff.map(roRow).join('')}</tbody><tfoot>${roFootHTML()}</tfoot></table></div>`
      : '<div class="card empty">還沒有員工</div>'}
    <div class="ro-foot"><button class="btn btn-ghost" id="roCopy">📋 複製上個月</button><span id="roState" style="flex:1"></span><button class="btn btn-dark" id="roSave">💾 儲存班表</button></div>`;
  hrBindMonth('roM', m => roGo(m));
  $$('[data-jump]').forEach(b => b.onclick = () => roGo(roMonthAdd(hrMonthNow(), Number(b.dataset.jump))));
  $$('[data-b]').forEach(b => b.onclick = () => { RO.brush = b.dataset.b; $$('[data-b]').forEach(x => x.classList.toggle('on', x === b)); });
  if ($('.ro-t tbody')) $('.ro-t tbody').onclick = e => { // 用 tbody 接點擊：重畫列之後仍有效
    const td = e.target.closest('[data-c]'); if (!td) return;
    const tr = td.closest('tr'), x = r.staff.find(y => y.username === tr.dataset.u), m = RO.edit[x.username], d = td.dataset.c;
    const next = (m[d] || '') === RO.brush ? '' : RO.brush;
    if (next) m[d] = next; else delete m[d];
    RO.dirty = true;
    tr.outerHTML = roRow(x); // 只重畫這一列（特休剩餘即時更新）
    $('.ro-t tfoot').innerHTML = roFootHTML();
    roState();
  };
  $('#roShifts').onclick = roShiftDialog;
  $('#roCopy').onclick = roCopyPrev;
  $('#roSave').onclick = roSave;
  roState();
}
function roState() {
  const el = $('#roState'); if (!el) return;
  const neg = RO.data.staff.filter(x => { const l = roLeft(x); return l != null && l < 0; });
  el.innerHTML = (RO.dirty ? '<b style="color:#b4400a">● 有修改還沒儲存</b>' : '<span class="muted">✓ 已儲存</span>') + (neg.length ? `　<span class="ro-neg">特休不夠：${neg.map(x => esc(x.name)).join('、')}</span>` : '');
  $('#roSave').disabled = !RO.dirty;
}
async function roGo(m) {
  if (m === RO.month) return;
  if (RO.dirty && !(await ask('班表還沒儲存，切換月份會清掉這次的修改。\n確定要切換嗎？', '切換'))) { $('#roM').value = RO.month; return; }
  RO.month = m; RO.dirty = false; hrRosterPage();
}
/** 複製上個月：同一個星期幾對齊（往前 4 週）。特休不複製 */
async function roCopyPrev() {
  if (!(await ask(`把上個月的班依「星期幾」複製到 ${RO.month}？\n會覆蓋這個月已經排好的格子；特休不會複製，已排的特休會保留。`, '複製'))) return;
  let n = 0;
  RO.data.staff.forEach(x => {
    const m = RO.edit[x.username];
    roDates().forEach(d => {
      if (m[d] === '特休') return;
      const src = HRC.fromNum(HRC.dayNum(d) - 28), v = src < RO.month ? x.prev[src] : m[src];
      if (v && v !== '特休') { m[d] = v; n++; } else delete m[d];
    });
  });
  RO.dirty = true; roDraw();
  toast(n ? `已複製，記得按「儲存班表」` : '上個月沒有排班資料，這個月改成照固定班');
}
async function roSave() {
  const rows = RO.data.staff.filter(x => JSON.stringify(Object.entries(RO.edit[x.username]).sort()) !== JSON.stringify(Object.entries(x.days).sort())).map(x => ({ username: x.username, days: RO.edit[x.username] }));
  if (!rows.length) { RO.dirty = false; roState(); return toast('沒有變動'); }
  const neg = RO.data.staff.filter(x => { const l = roLeft(x); return l != null && l < 0; });
  if (neg.length && !(await ask(`${neg.map(x => `${x.name}（剩 ${Math.round(roLeft(x) * 10) / 10} 天）`).join('、')} 的特休不夠。\n還是要儲存嗎？`, '仍要儲存'))) return;
  const b = $('#roSave'); b.disabled = true;
  try { const r = await api('hrRosterSave', { month: RO.month, rows }); toast(`已儲存（${r.changes.length} 人有調整）`); RO.dirty = false; hrRosterPage(); }
  catch (e) { if (e.auth) return start(); toast(e.message); b.disabled = false; }
}
/** 班別選項：新增／修改／刪除（例：早班 10:00–19:00、晚班 13:00–22:00） */
function roShiftDialog() {
  const list = RO.data.shifts.map(s => ({ ...s }));
  const w = document.createElement('div'); w.className = 'ask-wrap';
  const draw = () => {
    w.innerHTML = `<div class="ask-box" style="max-width:520px;text-align:left"><h3 style="margin:0 0 6px">⚙ 班別選項</h3>
      <p class="small muted" style="margin:0 0 10px">「休」「特休」是固定選項，不用新增。刪掉的班別，已排的日子會改照固定班的時間計算。</p>
      ${list.map((s, i) => `<div class="ro-srow"><input class="input" data-k="name" data-i="${i}" value="${esc(s.name)}" placeholder="名稱（例：早班）" maxlength="8"><input class="input" type="time" data-k="start" data-i="${i}" value="${esc(s.start)}"><span>–</span><input class="input" type="time" data-k="end" data-i="${i}" value="${esc(s.end)}"><input class="input num" data-k="brk" data-i="${i}" value="${esc(s.brk)}" inputmode="numeric" title="休息分鐘" placeholder="休息分"><button type="button" class="ph-del static" data-del="${i}" aria-label="刪除">✕</button></div>`).join('') || '<p class="small muted">還沒有班別</p>'}
      <button type="button" class="link" id="sAdd">＋ 新增班別</button>
      <p class="err" id="sErr" style="margin:8px 0 0"></p>
      <div class="ask-btns"><button class="btn btn-ghost" data-x>取消</button><button class="btn btn-dark" data-ok>儲存</button></div></div>`;
    $$('[data-k]', w).forEach(el => el.oninput = () => { list[+el.dataset.i][el.dataset.k] = el.value; });
    $$('[data-del]', w).forEach(b => b.onclick = () => { list.splice(+b.dataset.del, 1); draw(); });
    $('#sAdd', w).onclick = () => { list.push({ name: '', start: '10:00', end: '19:00', brk: 60 }); draw(); $$('[data-k=name]', w).pop().focus(); };
    $('[data-x]', w).onclick = () => w.remove();
    $('[data-ok]', w).onclick = async e => {
      const b = e.currentTarget; b.disabled = true; $('#sErr', w).textContent = '';
      try { const r = await api('hrShiftsSave', { shifts: list }); RO.data.shifts = r.shifts; w.remove(); toast('班別選項已儲存'); if (!roCodes().includes(RO.brush)) RO.brush = (r.shifts[0] && r.shifts[0].name) || '休'; roDraw(); }
      catch (y) { if (y.auth) return start(); $('#sErr', w).textContent = y.message; b.disabled = false; }
    };
  };
  draw(); document.body.appendChild(w);
}

/* ---------- 我的出勤 ---------- */
const hrMonthNav = (id, m) => `<div class="hr-month"><button class="btn btn-ghost btn-sm" data-mv="-1" aria-label="上個月">‹</button><input class="input" type="month" id="${id}" value="${esc(m)}"><button class="btn btn-ghost btn-sm" data-mv="1" aria-label="下個月">›</button></div>`;
function hrBindMonth(id, cb) {
  const el = $('#' + id);
  el.onchange = () => cb(el.value);
  $$('[data-mv]', el.parentElement).forEach(b => b.onclick = () => { const [y, m] = el.value.split('-').map(Number); const t = new Date(y, m - 1 + Number(b.dataset.mv), 1); cb(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); });
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
    <div class="toolbar" style="justify-content:space-between;align-items:center"><p class="small muted" style="margin:0 4px;flex:1">這裡設定到職日（自動算年資與特休）、班別${r.canPay ? '與薪資' : ''}${P('manage_users') ? '；點員工可再修改帳號、密碼與權限' : ''}。</p>
      ${P('manage_users') ? '<button class="btn btn-dark btn-sm" id="hrAddU">＋ 新增員工</button>' : ''}</div>
    ${list.length ? `<table class="table"><thead><tr><th>員工</th><th>到職日／年資</th><th class="hide-m">班別</th><th>特休</th>${r.canPay ? '<th class="hide-m">薪資</th>' : ''}</tr></thead><tbody>
      ${list.map(x => `<tr data-st="${esc(x.username)}"><td><div class="emp-cell">${hrAvatar(x, 44)}<div><b>${esc(x.name)}</b>${x.realName && x.realName !== x.name ? `<span class="sub">（${esc(x.realName)}）</span>` : ''}<div class="sub">${esc([x.title || x.role, x.empType, x.phone].filter(Boolean).join('・'))}</div></div></div></td>
        <td>${x.hireDate ? `<span class="num">${esc(x.hireDate)}</span><div class="sub">${esc(x.seniority)}</div>` : '<span class="pill warn">未設定</span>'}</td>
        <td class="hide-m num">${esc(x.shiftStart)}–${esc(x.shiftEnd)}<div class="sub">週${(x.workdays || []).map(w => HRC.WEEK[w]).join('')}</div></td>
        <td>${x.annual ? `<b class="num">${x.annual.left}</b> / ${x.annual.total} 天<div class="sub">${esc(x.annual.label)}</div>` : '—'}</td>
        ${r.canPay ? `<td class="hide-m num">${Number(x.salary) ? `${esc(x.payType)} ${money(x.salary)}` : '<span class="sub">未設定</span>'}</td>` : ''}</tr>`).join('')}</tbody></table>` : `<div class="card empty">還沒有員工${P('manage_users') ? '，按右上「＋ 新增員工」建立（帳號、密碼、權限、到職與班別一次設定）' : '，請管理者新增員工帳號'}</div>`}`;
  $$('[data-st]').forEach(tr => tr.onclick = () => hrStaffDrawer(list.find(x => x.username === tr.dataset.st)));
  loadPhotos(app);
  if ($('#hrAddU')) $('#hrAddU').onclick = () => userDrawer(null, hrStaffPage);
}
/** 重畫抽屜但保留捲動位置（新增／刪除項目時畫面不會跳回最上面）；focusSel：重畫後把游標放到最後一個符合的欄位 */
function hrRedraw(d, draw, focusSel) {
  const b = $('.d-body', d), y = b ? b.scrollTop : 0;
  draw();
  const nb = $('.d-body', d); if (nb) nb.scrollTop = y;
  if (focusSel) { const els = $$(focusSel, d); if (els.length) els[els.length - 1].focus({ preventScroll: true }); }
}
/** 員工大頭照（沒有照片就顯示名字第一個字） */
const hrAvatar = (x, size) => x.photo ? `<img class="emp-av" data-photo="${esc(x.photo)}" alt="${esc(x.name)}" style="width:${size}px;height:${size}px">`
  : `<span class="emp-av emp-ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${esc(String(x.name || '?').slice(0, 1))}</span>`;
const hrF = (label, id, val, attr = '') => `<label class="field"><span>${label}</span><input class="input" id="${id}" value="${esc(val || '')}" ${attr}></label>`;
function hrStaffDrawer(x) {
  const pay = hrStaffData.canPay, d = $('#drawer');
  const allow = (x.allowances || []).map(a => ({ ...a }));
  let newPhoto = '', delPhoto = false;
  const draw = () => {
    d.innerHTML = `<div class="d-head"><b>${esc(x.name)}・員工資料</b><button class="d-close" aria-label="關閉">✕</button></div>
    <div class="d-body">
      <div class="card"><h3>基本資料</h3>
        <div class="emp-top">${newPhoto ? `<img class="emp-av" src="${newPhoto}" alt="">` : delPhoto ? hrAvatar({ name: x.name }, 96) : hrAvatar(x, 96)}
          <div><label class="btn btn-ghost btn-sm">📷 ${x.photo || newPhoto ? '更換大頭照' : '上傳大頭照'}<input type="file" accept="image/*" id="sPh" hidden></label>
            ${(x.photo && !delPhoto) || newPhoto ? '<button type="button" class="link" id="sPhDel" style="margin-left:6px">移除</button>' : ''}
            <p class="small muted" style="margin:6px 0 0">可以拍照或從相簿選；正方形、臉在中間最好看。</p></div></div>
        <div class="grid2">
          ${hrF('真實姓名', 'sRn', x.realName, 'placeholder="身分證上的姓名"')}${hrF('職稱', 'sTi', x.title, 'placeholder="例：店長、維修技師"')}
          <label class="field"><span>雇用類型</span><select class="input" id="sEt">${['', '正職', '兼職', '工讀', '約聘', '實習'].map(o => `<option value="${o}" ${(x.empType || '') === o ? 'selected' : ''}>${o || '請選擇'}</option>`).join('')}</select></label>
          <label class="field"><span>性別</span><select class="input" id="sGd">${['', '男', '女', '其他'].map(o => `<option value="${o}" ${(x.gender || '') === o ? 'selected' : ''}>${o || '請選擇'}</option>`).join('')}</select></label>
          ${hrF('生日', 'sBd', x.birthday, 'type="date"')}${hrF('身分證字號', 'sId', x.idNo, 'placeholder="A123456789" maxlength="10" autocapitalize="characters"')}
          ${hrF('手機', 'sPhn', x.phone, 'type="tel" inputmode="tel" placeholder="0912345678"')}${hrF('Email', 'sEm', x.email, 'type="email" inputmode="email"')}
        </div>
        ${hrF('戶籍地址', 'sRa', x.regAddress)}
        <label class="field"><span>通訊地址 <label class="small" style="font-weight:400;margin-left:8px"><input type="checkbox" id="sSame"> 同戶籍地址</label></span><input class="input" id="sAd" value="${esc(x.address || '')}"></label>
        <div class="emp-sub">緊急聯絡人</div>
        <div class="grid3">${hrF('姓名', 'sEn2', x.emergName)}${hrF('關係', 'sEr', x.emergRel, 'placeholder="例：母親"')}${hrF('電話', 'sEp', x.emergPhone, 'type="tel" inputmode="tel"')}</div>
        ${hrF('離職日', 'sLv', x.leaveDate, 'type="date" style="max-width:200px"')}
      </div>
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
          <button type="button" class="link" id="sAddA">＋ 新增加給</button>
          <div class="py-bonus-tip" style="margin-top:8px">這裡只放<b>每個月固定</b>的加給（例：全勤、職務加給）。<br>依營業額、每月不同的獎金，請到 <a href="#hr/payroll" onclick="closeDrawer()">人資 → 薪資</a> 計算表的「💰 本月獎金」欄填寫。</div></div>
        <div class="grid2"><label class="field"><span>勞保自付（每月）</span><input class="input num" id="sLi" inputmode="numeric" value="${esc(x.laborIns || '')}"></label>
          <label class="field"><span>健保自付（每月）</span><input class="input num" id="sHi" inputmode="numeric" value="${esc(x.healthIns || '')}"></label></div>
        <label class="field"><span>勞退自提（%，0–6）</span><input class="input num" id="sPp" inputmode="decimal" value="${esc(x.pensionPct || '')}" style="max-width:120px"></label>
        <div class="grid2">${hrF('薪轉銀行', 'sBk', x.bankName, 'placeholder="例：國泰世華 013"')}${hrF('薪轉帳號', 'sBa', x.bankAccount, 'inputmode="numeric"')}</div>
        <p class="small muted" style="margin:0">勞健保自付額請依投保級距表填寫；月薪換算時薪＝月薪 ÷ 240，用於加班費與請假扣薪。</p></div>` : ''}
      <div class="card"><label class="field" style="margin:0"><span>備註</span><textarea class="input" id="sNote" rows="2">${esc(x.note || '')}</textarea></label></div>
    </div><div class="d-foot">${P('manage_users') ? '<button type="button" class="btn btn-ghost" id="sAcct">🔑 帳號與權限</button>' : ''}<span class="err" id="sErr" style="flex:1;margin:0"></span><button class="btn btn-dark" id="sSave">儲存</button></div>`;
    $('.d-close', d).onclick = closeDrawer;
    loadPhotos(d);
    $('#sPh', d).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { keep(); newPhoto = await resizeImage(f, 480, 0.85); delPhoto = false; hrRedraw(d, draw); } catch (y) { toast(y.message); } };
    if ($('#sPhDel', d)) $('#sPhDel', d).onclick = () => { keep(); newPhoto = ''; delPhoto = true; hrRedraw(d, draw); };
    $('#sSame', d).onchange = e => { if (e.target.checked) $('#sAd', d).value = $('#sRa', d).value; };
    if ($('#sAcct', d)) $('#sAcct', d).onclick = async e => { // 直接改這位員工的帳號、密碼、權限
      const btn = e.currentTarget; btn.disabled = true;
      try { const u = (await api('adminUsers')).users.find(y => y.username === x.username); if (!u) throw new Error('找不到這個帳號'); userDrawer(u, hrStaffPage); }
      catch (y) { if (y.auth) return start(); $('#sErr', d).textContent = y.message; btn.disabled = false; }
    };
    if (pay) {
      $$('input[name=sPt]', d).forEach(r => r.onchange = () => { $('#sSalL', d).textContent = r.value === '時薪' ? '時薪（NT$）' : '月薪（NT$）'; });
      $$('[data-an]', d).forEach(el => el.oninput = () => { allow[+el.dataset.an].name = el.value; });
      $$('[data-aa]', d).forEach(el => el.oninput = () => { allow[+el.dataset.aa].amount = el.value; });
      $$('[data-ad]', d).forEach(b => b.onclick = () => { keep(); allow.splice(+b.dataset.ad, 1); hrRedraw(d, draw); });
      $('#sAddA', d).onclick = () => { keep(); allow.push({ name: '', amount: '' }); hrRedraw(d, draw, '[data-an]'); };
    }
    $('#sSave', d).onclick = save;
  };
  const keep = () => { Object.assign(x, collect()); };
  const collect = () => {
    const v = id => ($('#' + id, d) || {}).value;
    const o = { username: x.username, hireDate: v('sHire'), leaveAdjust: v('sAdj'), workdays: $$('input[name=sWd]:checked', d).map(c => Number(c.value)), shiftStart: v('sSt'), shiftEnd: v('sEn'), breakMin: v('sBrk'), note: v('sNote'),
      realName: v('sRn'), title: v('sTi'), empType: v('sEt'), gender: v('sGd'), birthday: v('sBd'), idNo: (v('sId') || '').trim().toUpperCase(), phone: v('sPhn'), email: v('sEm'),
      regAddress: v('sRa'), address: v('sAd'), emergName: v('sEn2'), emergRel: v('sEr'), emergPhone: v('sEp'), leaveDate: v('sLv') };
    if (pay) Object.assign(o, { bankName: v('sBk'), bankAccount: v('sBa') });
    if (pay) Object.assign(o, { payType: $('input[name=sPt]:checked', d).value, salary: v('sSal'), allowances: allow.filter(a => a.name && numv(a.amount)).map(a => ({ name: a.name, amount: numv(a.amount) })), laborIns: v('sLi'), healthIns: v('sHi'), pensionPct: v('sPp') });
    return o;
  };
  const save = async e => {
    const btn = e.currentTarget; btn.disabled = true; $('#sErr', d).textContent = '';
    try { const r = await api('hrStaffSave', { profile: Object.assign(collect(), newPhoto ? { photoData: newPhoto } : delPhoto ? { photo: '' } : {}) }); toast(r.changes.length ? `已儲存（${r.changes.length} 項變動）` : '沒有變動'); closeDrawer(); hrStaffPage(); }
    catch (y) { if (y.auth) return start(); $('#sErr', d).textContent = y.message; btn.disabled = false; }
  };
  draw();
  d.classList.add('show'); $('#scrim').classList.add('show');
}

/* ---------- 薪資（主管） ---------- */
/* ---------- 薪資計算表（主管）：自動帶入出勤算好的金額，每一格都能改；清空＝改回自動計算 ---------- */
const PY = { dirty: {} };
async function hrPayrollPage(refresh) {
  if (refresh && Object.keys(PY.dirty).length && !(await ask('薪資計算表還沒儲存，重新整理會清掉這次的修改。\n確定要重新整理嗎？', '重新整理'))) return;
  const month = hrState.payMonth || hrMonthNow();
  const r = await hrLoad('hr/payroll', () => api('payrollList', { month }));
  if (!r) return;
  PY.month = month; PY.slips = r.slips; PY.dirty = {};
  const S = r.slips, drafts = S.filter(x => x.status === '草稿'), C = HRC.PAY_COLS, E = C.filter(c => c[2] === 'earn'), D = C.filter(c => c[2] === 'deduct');
  const cell = (x, [k]) => {
    const det = x.detail || {}, v = (det.cols || {})[k] || 0, auto = (det.auto || {})[k] || 0, ov = x.overrides && x.overrides[k] !== undefined;
    if (k === 'bonus') return `<td class="py-bcell"><input class="py-in py-bonus num" data-k="bonus" value="${v || ''}" placeholder="填寫" inputmode="numeric" title="本月獎金：依當月營業額填寫" ${x.status === '已確認' ? 'disabled' : ''}></td>`;
    return `<td><input class="py-in num${ov ? ' ov' : ''}" data-k="${k}" value="${v || ''}" placeholder="${auto || 0}" inputmode="numeric" title="自動計算：${money(auto)}" ${x.status === '已確認' ? 'disabled' : ''}></td>`;
  };
  const row = x => {
    const ok = x.detail && x.detail.cols, done = x.status === '已確認';
    const head = `<th class="py-n" scope="row"><button type="button" class="link" data-slip="${esc(x.id)}">${esc(x.name)}</button><div class="sub">${esc((x.detail || {}).payType || '')}　${done ? '<span class="pill ok">已確認</span>' : '<span class="pill warn">草稿</span>'}</div></th>`;
    if (!ok) return `<tr data-py="${esc(x.id)}">${head}<td colspan="${C.length + 2}" class="sub" style="text-align:left;padding:0 12px">${done ? '舊版薪資單' : '舊版資料，請按上方「重新計算」更新'}</td><td class="py-net num">${money(x.net)}</td><td></td></tr>`;
    return `<tr data-py="${esc(x.id)}" class="${done ? 'py-done' : ''}">${head}${E.map(c => cell(x, c)).join('')}<td class="py-sum num" data-g>${money(x.gross)}</td>${D.map(c => cell(x, c)).join('')}<td class="py-sum ded num" data-d>${money(x.deduct)}</td><td class="py-net num" data-n>${money(x.net)}</td>
      <td><input class="py-note" data-note value="${esc(x.note || '')}" placeholder="備註" ${done ? 'disabled' : ''}></td></tr>`;
  };
  app.innerHTML = `${pagesNav('hr/payroll')}
    <div class="ro-head"><h2>${Number(month.slice(0, 4))} 年 ${Number(month.slice(5))} 月薪資計算表</h2>
      <div class="ro-nav">${hrMonthNav('pyM', month)}<button class="btn btn-dark btn-sm" id="pyCalc">🧮 ${S.length ? '重新計算' : '計算本月薪資'}</button>
        ${drafts.length ? `<button class="btn btn-ghost btn-sm" id="pyAll">✓ 全部確認（${drafts.length}）</button>` : ''}${S.length ? '<button class="btn btn-ghost btn-sm" id="pyCsv">⬇ 匯出</button>' : ''}</div></div>
    ${S.length ? `<div class="card py-bonus-tip">💰 <b>本月獎金</b>：依這個月的營業額，直接在表格的「本月獎金」欄填金額，填完按「💾 儲存計算表」。每個月都要重新填，不會沿用上個月。</div>
      <div class="card py-tip">系統依出勤、請假、加班<b>自動帶入</b>每一格，<b>每一格都可以直接改</b>；改過的格子會變<span class="py-ovs">黃底</span>（手指或滑鼠停在格子上可看自動算的金額），<b>清空格子＝改回自動計算</b>。獎金、其他加項、其他扣項請自己填。「已確認」的薪資單員工才看得到，重新計算也不會被覆蓋。</div>
      <div class="py-wrap"><table class="py-t"><thead>
        <tr class="py-grp"><th class="py-n" rowspan="2">員工</th><th colspan="${E.length}" class="g-earn">加項</th><th rowspan="2" class="py-sum">應發</th><th colspan="${D.length}" class="g-ded">扣項</th><th rowspan="2" class="py-sum ded">應扣</th><th rowspan="2" class="py-net">實發</th><th rowspan="2">備註</th></tr>
        <tr>${E.map(c => c[0] === 'bonus' ? '<th class="c-earn c-bonus">💰 本月獎金<span>每月填寫</span></th>' : `<th class="c-earn">${c[1]}</th>`).join('')}${D.map(c => `<th class="c-ded">${c[1]}</th>`).join('')}</tr></thead>
        <tbody>${S.map(row).join('')}</tbody><tfoot><tr id="pyTot"></tr></tfoot></table></div>
      <div class="ro-foot"><span id="pyState" style="flex:1"></span><button class="btn btn-dark" id="pySave">💾 儲存計算表</button></div>`
      : '<div class="card empty">這個月還沒計算薪資，按上方「🧮 計算本月薪資」</div>'}
    ${r.missing.length ? `<p class="small muted" style="margin:10px 4px">沒有薪資單：${r.missing.map(m => `${esc(m.name)}${m.salarySet ? '' : '（未設定薪資）'}`).join('、')}${r.missing.some(m => !m.salarySet) ? '　→ 到「員工資料」設定薪資' : ''}</p>` : ''}`;
  hrBindMonth('pyM', async m => { if (Object.keys(PY.dirty).length && !(await ask('薪資計算表還沒儲存，切換月份會清掉這次的修改。\n確定要切換嗎？', '切換'))) { $('#pyM').value = month; return; } hrState.payMonth = m; PY.dirty = {}; hrPayrollPage(); });
  $('#pyCalc').onclick = async e => {
    if (Object.keys(PY.dirty).length && !(await ask('計算表有修改還沒儲存，重新計算會清掉這次的修改（已儲存的手動金額會保留）。\n確定要重新計算嗎？', '重新計算'))) return;
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '計算中…';
    try { await api('payrollCompute', { month }); toast('已計算'); PY.dirty = {}; hrPayrollPage(); } catch (y) { if (y.auth) return start(); toast(y.message); btn.disabled = false; }
  };
  if ($('#pyAll')) $('#pyAll').onclick = async () => {
    if (Object.keys(PY.dirty).length) return toast('請先按「儲存計算表」再確認');
    if (!(await ask(`確認 ${drafts.length} 張薪資單？\n\n確認後員工就能在「我的出勤」看到。`, '全部確認'))) return;
    try { await api('payrollConfirm', { ids: drafts.map(x => x.id) }); toast('已確認'); hrPayrollPage(); } catch (y) { if (y.auth) return start(); toast(y.message); }
  };
  if ($('#pyCsv')) $('#pyCsv').onclick = () => csvDownload(`薪資計算表_${month}.csv`, ['員工', '狀態', ...E.map(c => c[0] === 'bonus' ? '本月獎金' : c[1]), '應發', ...D.map(c => c[1]), '應扣', '實發', '備註'],
    S.map(x => { const cl = (x.detail || {}).cols || {}; return [x.name, x.status, ...E.map(c => cl[c[0]] || 0), x.gross, ...D.map(c => cl[c[0]] || 0), x.deduct, x.net, x.note || '']; }));
  $$('[data-slip]').forEach(b => b.onclick = () => { if (Object.keys(PY.dirty).length) return toast('請先儲存計算表再看明細'); hrSlipDrawer(S.find(x => x.id === b.dataset.slip), true); });
  const tb = $('.py-t tbody');
  if (tb) {
    tb.oninput = e => { const tr = e.target.closest('[data-py]'); if (tr) { PY.dirty[tr.dataset.py] = 1; pyRecalc(tr); } };
    tb.addEventListener('focusin', e => { if (e.target.classList.contains('py-in')) e.target.select(); });
    $('#pySave').onclick = pySave;
    pyTotals();
  }
}
/** 一列重算：空白格＝自動計算的金額 */
function pyRow(tr) {
  const x = PY.slips.find(s => s.id === tr.dataset.py), auto = (x.detail || {}).auto || {}, out = { g: 0, d: 0, ov: {} };
  HRC.PAY_COLS.forEach(([k, , kind]) => {
    const el = $(`[data-k="${k}"]`, tr); if (!el) return;
    const raw = el.value.replace(/[^\d.]/g, ''), a = auto[k] || 0, v = raw === '' ? a : Math.round(Number(raw) || 0);
    if (raw !== '' && v !== a) out.ov[k] = v;
    if (k !== 'bonus') el.classList.toggle('ov', raw !== '' && v !== a);
    if (kind === 'earn') out.g += v; else out.d += v;
  });
  return out;
}
function pyRecalc(tr) {
  const o = pyRow(tr);
  $('[data-g]', tr).textContent = money(o.g); $('[data-d]', tr).textContent = money(o.d); $('[data-n]', tr).textContent = money(o.g - o.d);
  tr.classList.add('py-chg');
  pyTotals();
}
function pyTotals() {
  const rows = $$('.py-t tbody tr[data-py]').filter(tr => $('[data-k]', tr)), sum = {}; let g = 0, d = 0;
  rows.forEach(tr => {
    $$('[data-k]', tr).forEach(el => { const k = el.dataset.k, raw = el.value.replace(/[^\d.]/g, ''), x = PY.slips.find(s => s.id === tr.dataset.py); sum[k] = (sum[k] || 0) + (raw === '' ? ((x.detail.auto || {})[k] || 0) : Math.round(Number(raw) || 0)); });
    const o = pyRow(tr); g += o.g; d += o.d;
  });
  const C = HRC.PAY_COLS, E = C.filter(c => c[2] === 'earn'), D = C.filter(c => c[2] === 'deduct');
  $('#pyTot').innerHTML = `<th class="py-n">合計（${rows.length} 人）</th>${E.map(c => `<td class="num">${money(sum[c[0]] || 0)}</td>`).join('')}<td class="py-sum num">${money(g)}</td>${D.map(c => `<td class="num">${money(sum[c[0]] || 0)}</td>`).join('')}<td class="py-sum ded num">${money(d)}</td><td class="py-net num">${money(g - d)}</td><td></td>`;
  const n = Object.keys(PY.dirty).length;
  $('#pyState').innerHTML = n ? `<b style="color:#b4400a">● ${n} 人有修改還沒儲存</b>` : '<span class="muted">✓ 已儲存</span>';
  $('#pySave').disabled = !n;
}
async function pySave() {
  const rows = Object.keys(PY.dirty).map(id => { const tr = $(`[data-py="${id}"]`); return { id, overrides: pyRow(tr).ov, note: ($('[data-note]', tr) || {}).value || '' }; });
  if (!rows.length) return;
  const b = $('#pySave'); b.disabled = true; b.textContent = '儲存中…';
  try { await api('payrollSaveAll', { month: PY.month, rows }); toast(`已儲存 ${rows.length} 人`); PY.dirty = {}; hrPayrollPage(); }
  catch (e) { if (e.auth) return start(); toast(e.message); b.disabled = false; b.textContent = '💾 儲存計算表'; }
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
    $$('[data-jd]', d).forEach(b => b.onclick = () => { adj.splice(+b.dataset.jd, 1); hrRedraw(d, draw); });
    if ($('#jAdd', d)) $('#jAdd', d).onclick = () => { adj.push({ name: '', amount: '' }); hrRedraw(d, draw, '[data-jn]'); };
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
    <div class="card" style="max-width:620px"><h3>上班時間</h3>
      <p class="small muted" style="margin:-4px 0 10px">新增的員工會用這個班別；個別員工不同可以到「員工資料」單獨調整。</p>
      <div class="field"><span>上班日</span><div class="chips">${HRC.WEEK.map((w, i) => `<label class="chip"><input type="checkbox" name="hsWd" value="${i}" ${(S.workdays || [1, 2, 3, 4, 5, 6]).includes(i) ? 'checked' : ''}><span>週${w}</span></label>`).join('')}</div></div>
      <div class="grid2"><label class="field"><span>上班時間</span><input class="input" type="time" id="hsSt" value="${esc(S.shiftStart || '10:00')}"></label>
        <label class="field"><span>下班時間</span><input class="input" type="time" id="hsEn" value="${esc(S.shiftEnd || '19:00')}"></label></div>
      <label class="field"><span>休息（分鐘）</span><input class="input num" id="hsBrk" inputmode="numeric" value="${esc(S.breakMin ?? 60)}" style="max-width:120px"></label>
      <p class="small muted" id="hsHrs" style="margin:-4px 0 10px"></p>
      <label class="check"><input type="checkbox" id="hsAll"> 同時套用到所有員工<span class="small muted">（會覆蓋每個人原本的班別）</span></label></div>
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
  const hrs = () => { const m = HRC.mins($('#hsEn').value) - HRC.mins($('#hsSt').value) - (Number($('#hsBrk').value) || 0); $('#hsHrs').textContent = m > 0 ? `每天工作 ${Math.floor(m / 60)} 小時${m % 60 ? ' ' + m % 60 + ' 分' : ''}` : '下班時間要晚於上班時間'; };
  ['hsSt', 'hsEn', 'hsBrk'].forEach(id => { $('#' + id).oninput = hrs; }); hrs();
  $('#hsSave').onclick = async e => {
    const b = e.currentTarget, all = $('#hsAll').checked;
    if (all && !(await ask('把這個上班時間套用到所有員工？\n\n每個人原本在「員工資料」設定的班別都會被覆蓋。', '套用到所有人'))) return;
    b.disabled = true;
    try {
      const r = await api('hrSettingsSave', { settings: { lat: $('#hsLat').value.trim(), lng: $('#hsLng').value.trim(), radius: $('#hsRad').value, grace: $('#hsGr').value, dayHours: $('#hsDh').value, since: $('#hsSince').value, lateDeduct: $('#hsLd').checked,
        workdays: $$('input[name=hsWd]:checked').map(c => Number(c.value)), shiftStart: $('#hsSt').value, shiftEnd: $('#hsEn').value, breakMin: $('#hsBrk').value, applyAll: all } });
      toast(r.applied ? `已儲存，並套用到 ${r.applied} 位員工` : '已儲存'); hrSettingsPage();
    } catch (y) { if (y.auth) return start(); $('#hsErr').textContent = y.message; b.disabled = false; }
  };
}
