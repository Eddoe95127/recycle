/* ============================== 人資計算（純函式，沒有讀寫資料） ==============================
 * 網站與後端（Google Apps Script）共用同一份：後端 gas/Code.gs 裡 HRC:BEGIN ～ HRC:END 之間是這個檔案的複本，
 * 修改後請執行 build-hr.py 同步，兩邊算出來的出勤、特休、薪資才會一致。
 * 日期一律用 'yyyy-MM-dd' 字串、時間用 'HH:mm'，不受時區影響。
 */
const HRC = (() => {
  /** 假別：pay＝給薪比例（1 全薪、0.5 半薪、0 不給薪）；maxDays＝每年上限（僅提醒） */
  const LEAVE_TYPES = {
    '特休': { pay: 1 }, '事假': { pay: 0, maxDays: 14 }, '病假': { pay: 0.5, maxDays: 30 }, '生理假': { pay: 0.5, maxDays: 12 },
    '婚假': { pay: 1, maxDays: 8 }, '喪假': { pay: 1 }, '公假': { pay: 1 }, '產假': { pay: 1 }, '陪產檢及陪產假': { pay: 1, maxDays: 7 },
    '補休': { pay: 1 }, '其他（不給薪）': { pay: 0 },
  };
  const OT_TYPES = ['平日', '休息日', '國定假日'];
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = n => String(n).padStart(2, '0');
  const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parseD = s => { const p = String(s).slice(0, 10).split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; };
  const dayNum = s => { const p = parseD(s); return Date.UTC(p.y, p.m - 1, p.d) / 864e5; };
  const fromNum = n => { const t = new Date(n * 864e5); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const weekday = s => new Date(dayNum(s) * 864e5).getUTCDay();
  const mins = hm => { const p = String(hm || '0:0').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
  const tmin = at => mins(String(at).slice(11, 16));
  const addYM = (s, years, months) => {
    const p = parseD(s), t = new Date(Date.UTC(p.y + years, p.m - 1 + months, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, Math.min(p.d, last));
  };
  const daysInMonth = month => { const p = month.split('-').map(Number); return new Date(Date.UTC(p[0], p[1], 0)).getUTCDate(); };
  const r1 = v => Math.round(v * 10) / 10;
  const money = v => Math.round(v);

  /** 班別：上班日（0＝週日）、上下班時間、休息分鐘 */
  function shiftOf(p) {
    const st = mins(p.shiftStart || '10:00'), en = mins(p.shiftEnd || '19:00'), brk = Number(p.breakMin) || 0;
    return { st, en, brk, workMin: Math.max(0, en - st - brk), days: (p.workdays && p.workdays.length ? p.workdays : [1, 2, 3, 4, 5, 6]).map(Number) };
  }

  /** 特休（勞基法第 38 條，週年制）：滿 6 個月 3 天、1 年 7 天、2 年 10 天、3 年 14 天、5 年 15 天、10 年起每年加 1 天，最多 30 天 */
  function annualDaysFor(years) {
    if (years < 1) return 3; if (years < 2) return 7; if (years < 3) return 10; if (years < 5) return 14; if (years < 10) return 15;
    return Math.min(30, 15 + (years - 9));
  }
  function annualLeave(hire, asOf) {
    if (!hire) return null;
    const six = addYM(hire, 0, 6), one = addYM(hire, 1, 0);
    if (asOf < six) return { days: 0, from: hire, to: fromNum(dayNum(six) - 1), label: '未滿 6 個月', next: six };
    if (asOf < one) return { days: 3, from: six, to: fromNum(dayNum(one) - 1), label: '滿 6 個月' };
    let n = 1;
    while (addYM(hire, n + 1, 0) <= asOf) n++;
    return { days: annualDaysFor(n), from: addYM(hire, n, 0), to: fromNum(dayNum(addYM(hire, n + 1, 0)) - 1), label: `滿 ${n} 年` };
  }
  /** 年資：「3 年 4 個月」 */
  function seniority(hire, asOf) {
    if (!hire || asOf < hire) return '';
    let m = 0;
    while (addYM(hire, 0, m + 1) <= asOf) m++;
    return (m >= 12 ? Math.floor(m / 12) + ' 年 ' : '') + (m % 12) + ' 個月';
  }

  /** 請假每天幾小時：{ 'yyyy-MM-dd': 小時 }。全天＝每個上班日 dayHours；半天＝dayHours/2；時數＝指定 */
  function leaveSplit(req, p, S) {
    const sh = shiftOf(p), dh = Number(S.dayHours) || 8, out = {};
    if (req.unit === '時數') { out[req.start] = Math.min(dh, Math.max(0.5, Number(req.hours) || 0)); return out; }
    if (req.unit === '上半天' || req.unit === '下半天') { out[req.start] = dh / 2; return out; }
    for (let n = dayNum(req.start), e = dayNum(req.end || req.start); n <= e && n - dayNum(req.start) < 62; n++) {
      const d = fromNum(n);
      if (sh.days.indexOf(weekday(d)) >= 0) out[d] = dh;
    }
    return out;
  }
  const splitOf = r => { if (r.split && typeof r.split === 'object') return r.split; try { return JSON.parse(r.split || '{}'); } catch (e) { return {}; } };

  /** 單日出勤。clocks：當天打卡 [{type:'上班'|'下班', at:'yyyy-MM-dd HH:mm:ss'}]；leaves：已核准的請假 */
  function dayAttendance(p, date, clocks, leaves, S, today) {
    const sh = shiftOf(p), wd = sh.days.indexOf(weekday(date)) >= 0, grace = Number(S.grace) || 0;
    const ins = clocks.filter(c => c.type === '上班').map(c => c.at).sort(), outs = clocks.filter(c => c.type === '下班').map(c => c.at).sort();
    const tin = ins[0] || '', tout = outs.length ? outs[outs.length - 1] : '';
    const lv = leaves.map(l => ({ type: l.leaveType, h: splitOf(l)[date] || 0 })).filter(x => x.h);
    const leaveHours = lv.reduce((t, x) => t + x.h, 0);
    let workedMin = 0, lateMin = 0, earlyMin = 0;
    if (tin && tout && tout > tin) {
      const a = Math.max(tmin(tin), sh.st), b = Math.min(tmin(tout), sh.en), raw = Math.max(0, b - a);
      workedMin = Math.max(0, raw - (raw > 300 ? sh.brk : 0));
    }
    if (wd && !leaveHours) {
      if (tin && tmin(tin) - sh.st > grace) lateMin = tmin(tin) - sh.st;
      if (tout && date < today && sh.en - tmin(tout) > 0) earlyMin = sh.en - tmin(tout);
    }
    const past = date < today && !(S.since && date < S.since) && !(p.hireDate && date < p.hireDate); // 開始使用前、到職前不算曠職／缺卡
    const absent = wd && past && !tin && !tout && !leaveHours; // 有請假（含半天）就不算曠職
    const missing = wd && past && !absent && !leaveHours && (!tin || !tout);
    let status = !wd ? (tin || tout ? '休假日出勤' : '休') : leaveHours ? lv.map(x => x.type).join('、') : absent ? '曠職' : missing ? '缺卡' : lateMin ? '遲到' : earlyMin ? '早退' : tin ? '正常' : '';
    if (wd && leaveHours && (tin || tout)) status += '＋出勤';
    return { date, w: WEEK[weekday(date)], wd, in: tin.slice(11, 16), out: tout.slice(11, 16), workedMin, lateMin, earlyMin, leaveHours, leaves: lv, absent, missing, status };
  }

  /** 整月出勤。reqs：這個人「已核准」的申請（請假、加班） */
  function monthAttendance(p, month, clocks, reqs, S, today) {
    const leaves = reqs.filter(r => r.kind === '請假'), ots = reqs.filter(r => r.kind === '加班' && String(r.start).slice(0, 7) === month);
    const days = [];
    for (let d = 1; d <= daysInMonth(month); d++) {
      const date = month + '-' + pad(d);
      days.push(dayAttendance(p, date, clocks.filter(c => c.date === date), leaves, S, today));
    }
    const sum = { workDays: 0, attended: 0, workedMin: 0, lateCount: 0, lateMin: 0, earlyCount: 0, earlyMin: 0, absentDays: 0, missing: 0, leaveHours: {}, otHours: {} };
    days.forEach(x => {
      if (x.wd && x.date < today) sum.workDays++;
      if (x.in || x.out) sum.attended++;
      sum.workedMin += x.workedMin;
      if (x.lateMin) { sum.lateCount++; sum.lateMin += x.lateMin; }
      if (x.earlyMin) { sum.earlyCount++; sum.earlyMin += x.earlyMin; }
      if (x.absent) sum.absentDays++;
      if (x.missing) sum.missing++;
      x.leaves.forEach(l => { sum.leaveHours[l.type] = r1((sum.leaveHours[l.type] || 0) + l.h); });
    });
    ots.forEach(o => { sum.otHours[o.otType] = r1((sum.otHours[o.otType] || 0) + Number(o.hours)); });
    return { month, days, sum };
  }

  /** 加班費倍率（勞基法第 24、39 條）：平日前 2 小時 1.34、再 2 小時 1.67；休息日 2/6/其後 1.34/1.67/2.67；國定假日加倍 */
  function otFactor(type, h, hourly) {
    if (type === '休息日') return Math.min(h, 2) * 1.34 + Math.min(Math.max(h - 2, 0), 6) * 1.67 + Math.max(h - 8, 0) * 2.67;
    if (type === '國定假日') return h * (hourly ? 2 : 1);
    return Math.min(h, 2) * 1.34 + Math.max(h - 2, 0) * 1.67;
  }

  /** 薪資。回傳明細行 [{name, amount, kind:'earn'|'deduct', note}] 與應發、應扣、實發 */
  function computePay(p, month, att, reqs, S, adjustments) {
    const hourly = p.payType === '時薪', salary = Number(p.salary) || 0;
    const rate = hourly ? salary : salary / 240; // 月薪換算時薪＝月薪 ÷ 30 ÷ 8
    const lines = [], add = (name, amount, kind, note) => { amount = money(amount); if (amount) lines.push({ name, amount, kind, note: note || '' }); };
    const workedH = r1(att.sum.workedMin / 60);
    if (hourly) add('時薪', workedH * rate, 'earn', `${workedH} 小時 × ${salary}`);
    else add('本薪', salary, 'earn');
    (p.allowances || []).forEach(a => add(a.name || '加給', Number(a.amount) || 0, 'earn'));
    // 請假：月薪扣除不給薪部分；時薪補發給薪部分
    Object.keys(att.sum.leaveHours).forEach(t => {
      const h = att.sum.leaveHours[t], pay = (LEAVE_TYPES[t] || { pay: 0 }).pay;
      if (hourly) { if (pay > 0) add(`${t}（${pay === 1 ? '全薪' : '半薪'}）`, h * rate * pay, 'earn', `${h} 小時`); }
      else if (pay < 1) add(`${t}${pay ? '（半薪）' : ''}扣薪`, h * rate * (1 - pay), 'deduct', `${h} 小時`);
    });
    // 加班（已核准）
    let otH = 0;
    reqs.filter(r => r.kind === '加班' && String(r.start).slice(0, 7) === month).forEach(r => {
      const h = Number(r.hours) || 0; otH += h;
      add(`加班費（${r.otType} ${String(r.start).slice(5, 10)}）`, rate * otFactor(r.otType, h, hourly), 'earn', `${h} 小時`);
    });
    if (S.lateDeduct && !hourly && att.sum.lateMin) add('遲到扣薪', att.sum.lateMin * rate / 60, 'deduct', `${att.sum.lateMin} 分鐘`);
    add('勞保自付', Number(p.laborIns) || 0, 'deduct');
    add('健保自付', Number(p.healthIns) || 0, 'deduct');
    const pensionBase = hourly ? lines.filter(l => l.kind === 'earn').reduce((t, l) => t + l.amount, 0) : salary;
    if (Number(p.pensionPct)) add(`勞退自提 ${p.pensionPct}%`, pensionBase * Number(p.pensionPct) / 100, 'deduct');
    (adjustments || []).forEach(a => { const v = Number(a.amount) || 0; if (v) add(a.name || (v > 0 ? '其他加項' : '其他扣項'), Math.abs(v), v > 0 ? 'earn' : 'deduct', a.note); });
    const gross = lines.filter(l => l.kind === 'earn').reduce((t, l) => t + l.amount, 0);
    const deduct = lines.filter(l => l.kind === 'deduct').reduce((t, l) => t + l.amount, 0);
    return { lines, gross, deduct, net: gross - deduct, rate: r1(rate), workedHours: workedH, otHours: r1(otH), absentDays: att.sum.absentDays, lateMin: att.sum.lateMin };
  }

  return { LEAVE_TYPES, OT_TYPES, WEEK, annualLeave, annualDaysFor, seniority, leaveSplit, splitOf, dayAttendance, monthAttendance, computePay, otFactor, shiftOf, weekday, daysInMonth, addYM, dayNum, fromNum, mins };
})();
